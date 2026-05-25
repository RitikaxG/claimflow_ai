import {
  CoverageAnswerSchema,
  type CitedCoverageClause,
  type CoverageAnswer,
} from "@repo/shared/schemas";
import type {
  MergedRetrievedPolicyChunk,
  PolicyRetrievalResult,
} from "../retrieval/retrieval-types";

export type CoverageCitationValidationResult = {
  answer: CoverageAnswer;
  forcedNeedsReview: boolean;
  guardrailReasons: string[];
};

type ValidateCoverageCitationsInput = {
  answer: CoverageAnswer;
  retrievalResult: PolicyRetrievalResult;

  /**
   * Optional, but useful for deterministic answer guardrails.
   * Week 3 eval and API both have these available.
   */
  question?: string;
  claimContext?: unknown;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function quoteExistsInChunk(input: { quote: string; chunkText: string }) {
  const normalizedQuote = normalizeText(input.quote);
  const normalizedChunkText = normalizeText(input.chunkText);

  if (normalizedQuote.length < 8) {
    return false;
  }

  return normalizedChunkText.includes(normalizedQuote);
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectStringArrayField(input: {
  value: unknown;
  fieldNames: string[];
}): string[] {
  const collected: string[] = [];

  function visit(value: unknown) {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      if (
        input.fieldNames.includes(key) &&
        Array.isArray(nestedValue)
      ) {
        for (const item of nestedValue) {
          if (typeof item === "string") {
            collected.push(item);
          }
        }
      }

      visit(nestedValue);
    }
  }

  visit(input.value);

  return uniqueStrings(collected);
}

function getClaimContextMissingEvidence(claimContext: unknown) {
  return collectStringArrayField({
    value: claimContext,
    fieldNames: ["missingEvidence", "requiredEvidence"],
  });
}

function hasCoverageIntent(match: MergedRetrievedPolicyChunk) {
  if (match.bestIntent === "coverage") {
    return true;
  }

  return match.matchedQueries.some((query) => query.intent === "coverage");
}

function isOnlyExclusionOrEvidenceGap(matches: MergedRetrievedPolicyChunk[]) {
  if (matches.length === 0) {
    return false;
  }

  return matches.every((match) => {
    const intents = new Set([
      match.bestIntent,
      ...match.matchedQueries.map((query) => query.intent),
    ]);

    const hasCoverage = intents.has("coverage");
    const hasLimit = intents.has("limit");

    if (hasCoverage || hasLimit) {
      return false;
    }

    return intents.has("exclusion") || intents.has("evidence");
  });
}

function hasRetrievedClause(input: {
  retrievalResult: PolicyRetrievalResult;
  clauseId: string;
}) {
  return input.retrievalResult.matches.some(
    (match) => match.clauseId === input.clauseId,
  );
}

function hasValidCitationWithClause(input: {
  citations: CitedCoverageClause[];
  clauseId: string;
}) {
  return input.citations.some((citation) => citation.clauseId === input.clauseId);
}

function questionSuggestsRepairEstimateOnly(question: string | undefined) {
  if (!question) {
    return false;
  }

  const normalized = normalizeText(question);

  return (
    normalized.includes("only a repair estimate") ||
    normalized.includes("repair estimate alone") ||
    normalized.includes("using only repair estimate") ||
    normalized.includes("using only a repair estimate")
  );
}

function hasExclusionEvidence(input: {
  retrievalResult: PolicyRetrievalResult;
  validCitations: CitedCoverageClause[];
}) {
  const citedExclusion = input.validCitations.some((citation) =>
    citation.clauseId.startsWith("EX-"),
  );

  const retrievedExclusion = input.retrievalResult.matches.some((match) =>
    match.clauseId?.startsWith("EX-"),
  );

  return citedExclusion || retrievedExclusion;
}

function validateSingleCitation(input: {
  citation: CitedCoverageClause;
  chunksById: Map<string, MergedRetrievedPolicyChunk>;
}): {
  valid: boolean;
  reason?: string;
} {
  const chunk = input.chunksById.get(input.citation.chunkId);

  if (!chunk) {
    return {
      valid: false,
      reason: `Citation chunkId ${input.citation.chunkId} was not in retrieved chunks`,
    };
  }

  if (!chunk.clauseId) {
    return {
      valid: false,
      reason: `Retrieved chunk ${input.citation.chunkId} does not have a clauseId`,
    };
  }

  if (chunk.clauseId !== input.citation.clauseId) {
    return {
      valid: false,
      reason: `Citation clauseId ${input.citation.clauseId} does not match retrieved chunk ${input.citation.chunkId}`,
    };
  }

  if (
    !quoteExistsInChunk({
      quote: input.citation.quote,
      chunkText: chunk.text,
    })
  ) {
    return {
      valid: false,
      reason: `Citation quote for chunk ${input.citation.chunkId} was not found in the retrieved chunk text`,
    };
  }

  return {
    valid: true,
  };
}

function withMergedMissingEvidence(input: {
  answer: CoverageAnswer;
  extraMissingEvidence: string[];
}) {
  return CoverageAnswerSchema.parse({
    ...input.answer,
    missingEvidence: uniqueStrings([
      ...input.answer.missingEvidence,
      ...input.extraMissingEvidence,
    ]),
  });
}

function forceNeedsReviewAnswer(input: {
  originalAnswer: CoverageAnswer;
  validCitations: CitedCoverageClause[];
  guardrailReasons: string[];
  extraMissingEvidence: string[];
}): CoverageAnswer {
  const missingEvidence = uniqueStrings([
    ...input.originalAnswer.missingEvidence,
    ...input.extraMissingEvidence,
    "Human coverage review required",
  ]);

  return CoverageAnswerSchema.parse({
    decision: "NEEDS_REVIEW",
    answer:
      "The retrieved policy evidence does not support a final approval or denial. A human reviewer should verify the claim against the policy clauses and required evidence.",
    citedClauses: input.validCitations,
    missingEvidence,
    confidence: Math.min(input.originalAnswer.confidence, 0.35),
  });
}

export function validateCoverageCitations(
  input: ValidateCoverageCitationsInput,
): CoverageCitationValidationResult {
  const parsedAnswer = CoverageAnswerSchema.parse(input.answer);
  const guardrailReasons: string[] = [];

  const extraMissingEvidence = getClaimContextMissingEvidence(
    input.claimContext,
  );

  const chunksById = new Map(
    input.retrievalResult.matches.map((match) => [match.chunkId, match]),
  );

  const validCitations: CitedCoverageClause[] = [];

  for (const citation of parsedAnswer.citedClauses) {
    const result = validateSingleCitation({
      citation,
      chunksById,
    });

    if (result.valid) {
      validCitations.push(citation);
    } else if (result.reason) {
      guardrailReasons.push(result.reason);
    }
  }

  let shouldForceNeedsReview = false;

  if (input.retrievalResult.retrievalStatus === "INSUFFICIENT_EVIDENCE") {
    shouldForceNeedsReview = true;
    guardrailReasons.push(
      "Retrieval status was INSUFFICIENT_EVIDENCE, so a coverage decision cannot be trusted.",
    );
  }

  if (validCitations.length === 0) {
    shouldForceNeedsReview = true;
    guardrailReasons.push(
      "Coverage answer did not contain any valid citations to retrieved chunks.",
    );
  }

  if (parsedAnswer.decision === "COVERED") {
    const hasAnyCoverageIntent =
      input.retrievalResult.matches.some(hasCoverageIntent);

    if (!hasAnyCoverageIntent) {
      shouldForceNeedsReview = true;
      guardrailReasons.push(
        "Model returned COVERED but no retrieved chunk came from a coverage-intent query.",
      );
    }

    if (isOnlyExclusionOrEvidenceGap(input.retrievalResult.matches)) {
      shouldForceNeedsReview = true;
      guardrailReasons.push(
        "Model returned COVERED but retrieved evidence was only exclusion/evidence-gap oriented.",
      );
    }
  }

  const repairEstimateAloneNeedsReview =
    questionSuggestsRepairEstimateOnly(input.question) &&
    hasRetrievedClause({
      retrievalResult: input.retrievalResult,
      clauseId: "LIMIT-RP-001",
    }) &&
    !hasExclusionEvidence({
      retrievalResult: input.retrievalResult,
      validCitations,
    });

  if (
    repairEstimateAloneNeedsReview &&
    parsedAnswer.decision !== "NEEDS_REVIEW"
  ) {
    shouldForceNeedsReview = true;
    guardrailReasons.push(
      "Repair estimate alone is not a coverage exclusion; LIMIT-RP-001 requires insurer review before final approval.",
    );
  }

  const floodEvidenceNeedsReview =
    hasRetrievedClause({
      retrievalResult: input.retrievalResult,
      clauseId: "EV-FLD-001",
    }) &&
    parsedAnswer.decision === "NEEDS_REVIEW";

  const finalExtraMissingEvidence = uniqueStrings([
    ...extraMissingEvidence,
    ...(floodEvidenceNeedsReview
      ? [
          "flood or waterlogging evidence",
          "inspection evidence",
          "confirmation that no exclusion applies",
        ]
      : []),
  ]);

  if (shouldForceNeedsReview) {
    return {
      answer: forceNeedsReviewAnswer({
        originalAnswer: parsedAnswer,
        validCitations,
        guardrailReasons,
        extraMissingEvidence: finalExtraMissingEvidence,
      }),
      forcedNeedsReview: true,
      guardrailReasons,
    };
  }

  return {
    answer: withMergedMissingEvidence({
      answer: CoverageAnswerSchema.parse({
        ...parsedAnswer,
        citedClauses: validCitations,
      }),
      extraMissingEvidence: finalExtraMissingEvidence,
    }),
    forcedNeedsReview: false,
    guardrailReasons,
  };
}