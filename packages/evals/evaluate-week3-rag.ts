import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateCoverageAnswer } from "@repo/ai";
import {
  retrievePolicyEvidence,
  validateCoverageCitations,
} from "@repo/rag";
import {
  CoverageAnswerSchema,
  type CoverageAnswer,
} from "@repo/shared/schemas";

type CoverageDecision =
  | "COVERED"
  | "NOT_COVERED"
  | "PARTIALLY_COVERED"
  | "NEEDS_REVIEW";

type EvalQuestion = {
  questionId: string;
  packetId: string | null;
  question: string;
  expectedRetrievedClauses: string[];
  expectedAnswerType: CoverageDecision;
  expectedCitationRequired: boolean;
  expectedRefusal: boolean;
  falseApprovalAllowed: boolean;
  mustMentionMissingEvidence?: string[];
};

type PacketExpectedAnswer = {
  expectedAnswerType?: CoverageDecision;
  expectedRetrievedClauses?: string[];
  expectedCitationRequired?: boolean;
  expectedRefusal?: boolean;
  falseApprovalAllowed?: boolean;
  mustMentionMissingEvidence?: string[];
};

type CaseResult = {
  questionId: string;
  packetId: string | null;
  question: string;

  expectedDecision: CoverageDecision;
  actualDecision: CoverageDecision;

  expectedRetrievedClauses: string[];
  retrievedClauseIds: string[];

  retrievalStatus: "ENOUGH_EVIDENCE" | "INSUFFICIENT_EVIDENCE";
  retrievalReason: string;
  topSimilarity: number | null;

  citationCount: number;
  citationSupportPassed: boolean;
  forcedNeedsReview: boolean;
  guardrailReasons: string[];

  falseApproval: boolean;
  passed: boolean;
  blockers: string[];
};

type EvalSummary = {
  total: number;
  passed: number;
  failed: number;

  retrievalHitRate: number;
  decisionMatchRate: number;
  citationPresentRate: number;
  citationSupportRate: number;
  unsupportedRefusalRate: number;
  falseApprovalRate: number;
};

type EvalReport = {
  generatedAt: string;
  summary: EvalSummary;
  cases: CaseResult[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATASET_ROOT = process.env.WEEK3_RAG_DATASET_ROOT
  ? path.resolve(process.env.WEEK3_RAG_DATASET_ROOT)
  : path.resolve(__dirname, "../../sample-data/week-03-policy-rag");

const QUESTIONS_PATH = path.join(
  DATASET_ROOT,
  "questions",
  "coverage-questions.json",
);

const REPORT_ROOT = path.join(DATASET_ROOT, "eval-results");

const JSON_REPORT_PATH = path.join(
  REPORT_ROOT,
  "week-3-policy-rag-eval.json",
);

const MARKDOWN_REPORT_PATH = path.join(
  REPORT_ROOT,
  "week-3-policy-rag-eval.md",
);

function toPrettyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

async function readPacketClaimContext(packetId: string) {
  const filePath = path.join(DATASET_ROOT, "packets", packetId, "claim-context.json");
  return readJson<unknown>(filePath);
}

async function readPacketExpectedAnswer(
  packetId: string,
): Promise<PacketExpectedAnswer> {
  const filePath = path.join(
    DATASET_ROOT,
    "packets",
    packetId,
    "expected-answer.json",
  );

  try {
    return await readJson<PacketExpectedAnswer>(filePath);
  } catch {
    return {};
  }
}

function uniqueSortedStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).sort();
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesLoose(haystack: string, needle: string) {
  return normalizeText(haystack).includes(normalizeText(needle));
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function rate(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 1;
  }

  return numerator / denominator;
}

function buildInsufficientEvidenceAnswer(reason: string): CoverageAnswer {
  return CoverageAnswerSchema.parse({
    decision: "NEEDS_REVIEW",
    answer:
      "The retrieved policy evidence was not strong enough to make a supported coverage decision. A human reviewer should verify the claim against the policy clauses.",
    citedClauses: [],
    missingEvidence: [reason, "Human coverage review required"],
    confidence: 0.25,
  });
}

function citationSupportPassed(input: {
  answer: CoverageAnswer;
  matches: Array<{
    chunkId: string;
    clauseId: string | null;
    text: string;
  }>;
}) {
  const blockers: string[] = [];

  for (const citation of input.answer.citedClauses) {
    const match = input.matches.find(
      (item) =>
        item.chunkId === citation.chunkId &&
        item.clauseId === citation.clauseId,
    );

    if (!match) {
      blockers.push(
        `Citation ${citation.clauseId}/${citation.chunkId} does not match any retrieved chunk.`,
      );
      continue;
    }

    if (!includesLoose(match.text, citation.quote)) {
      blockers.push(
        `Citation quote for ${citation.clauseId}/${citation.chunkId} was not found in retrieved chunk text.`,
      );
    }
  }

  return {
    passed: blockers.length === 0,
    blockers,
  };
}

function answerMentionsMissingEvidence(input: {
  answer: CoverageAnswer;
  requiredTerms: string[];
}) {
  const answerText = [
    input.answer.answer,
    ...input.answer.missingEvidence,
  ].join(" ");

  const missingTerms = input.requiredTerms.filter(
    (term) => !includesLoose(answerText, term),
  );

  return {
    passed: missingTerms.length === 0,
    missingTerms,
  };
}

function mergeQuestionWithPacketExpected(input: {
  question: EvalQuestion;
  packetExpected: PacketExpectedAnswer;
}): EvalQuestion {
  return {
    ...input.question,
    expectedAnswerType:
      input.packetExpected.expectedAnswerType ??
      input.question.expectedAnswerType,
    expectedRetrievedClauses:
      input.packetExpected.expectedRetrievedClauses ??
      input.question.expectedRetrievedClauses,
    expectedCitationRequired:
      input.packetExpected.expectedCitationRequired ??
      input.question.expectedCitationRequired,
    expectedRefusal:
      input.packetExpected.expectedRefusal ?? input.question.expectedRefusal,
    falseApprovalAllowed:
      input.packetExpected.falseApprovalAllowed ??
      input.question.falseApprovalAllowed,
    mustMentionMissingEvidence:
      input.packetExpected.mustMentionMissingEvidence ??
      input.question.mustMentionMissingEvidence,
  };
}

async function evaluateOneQuestion(question: EvalQuestion): Promise<CaseResult> {
  const packetExpected = question.packetId
    ? await readPacketExpectedAnswer(question.packetId)
    : {};

  const expected = mergeQuestionWithPacketExpected({
    question,
    packetExpected,
  });

  const claimContext = expected.packetId
    ? await readPacketClaimContext(expected.packetId)
    : null;

  const retrievalResult = await retrievePolicyEvidence({
    question: expected.question,
    claimContext,
    topKFinal: 8,
  });

  let finalAnswer: CoverageAnswer;
  let forcedNeedsReview = false;
  let guardrailReasons: string[] = [];

  if (retrievalResult.retrievalStatus === "INSUFFICIENT_EVIDENCE") {
    finalAnswer = buildInsufficientEvidenceAnswer(retrievalResult.reason);
    forcedNeedsReview = true;
    guardrailReasons = [
      "Retrieval returned INSUFFICIENT_EVIDENCE, so generation was skipped.",
      retrievalResult.reason,
    ];
  } else {
    const generated = await generateCoverageAnswer({
      question: expected.question,
      claimContext,
      retrievalResult,
    });

    const citationValidation = validateCoverageCitations({
      answer: generated.answer,
      retrievalResult,
    });

    finalAnswer = citationValidation.answer;
    forcedNeedsReview = citationValidation.forcedNeedsReview;
    guardrailReasons = citationValidation.guardrailReasons;
  }

  const blockers: string[] = [];

  const retrievedClauseIds = uniqueSortedStrings(
    retrievalResult.matches.map((match) => match.clauseId),
  );

  const requiredClausesFound = expected.expectedRetrievedClauses.every(
    (clauseId) => retrievedClauseIds.includes(clauseId),
  );

  if (!requiredClausesFound) {
    blockers.push(
      `Missing expected retrieved clauses. Expected ${JSON.stringify(
        expected.expectedRetrievedClauses,
      )}, got ${JSON.stringify(retrievedClauseIds)}.`,
    );
  }

  const decisionMatches = finalAnswer.decision === expected.expectedAnswerType;

  if (!decisionMatches) {
    blockers.push(
      `Decision mismatch. Expected ${expected.expectedAnswerType}, got ${finalAnswer.decision}.`,
    );
  }

  const citationPresent =
    !expected.expectedCitationRequired || finalAnswer.citedClauses.length > 0;

  if (!citationPresent) {
    blockers.push("Expected at least one citation, but answer had none.");
  }

  const citationSupport = citationSupportPassed({
    answer: finalAnswer,
    matches: retrievalResult.matches,
  });

  if (!citationSupport.passed) {
    blockers.push(...citationSupport.blockers);
  }

  if (expected.expectedRefusal && finalAnswer.decision !== "NEEDS_REVIEW") {
    blockers.push(
      `Expected refusal/NEEDS_REVIEW, but got ${finalAnswer.decision}.`,
    );
  }

  const falseApproval =
    !expected.falseApprovalAllowed &&
    finalAnswer.decision === "COVERED" &&
    expected.expectedAnswerType !== "COVERED";

  if (falseApproval) {
    blockers.push(
      `False approval detected. Expected ${expected.expectedAnswerType}, got COVERED.`,
    );
  }

  const requiredMissingEvidence = expected.mustMentionMissingEvidence ?? [];

  if (requiredMissingEvidence.length > 0) {
    const missingEvidenceCheck = answerMentionsMissingEvidence({
      answer: finalAnswer,
      requiredTerms: requiredMissingEvidence,
    });

    if (!missingEvidenceCheck.passed) {
      blockers.push(
        `Answer did not mention required missing evidence terms: ${JSON.stringify(
          missingEvidenceCheck.missingTerms,
        )}.`,
      );
    }
  }

  const topMatch = retrievalResult.matches[0];

  return {
    questionId: expected.questionId,
    packetId: expected.packetId,
    question: expected.question,

    expectedDecision: expected.expectedAnswerType,
    actualDecision: finalAnswer.decision,

    expectedRetrievedClauses: expected.expectedRetrievedClauses,
    retrievedClauseIds,

    retrievalStatus: retrievalResult.retrievalStatus,
    retrievalReason: retrievalResult.reason,
    topSimilarity: topMatch ? topMatch.similarity : null,

    citationCount: finalAnswer.citedClauses.length,
    citationSupportPassed: citationSupport.passed,
    forcedNeedsReview,
    guardrailReasons,

    falseApproval,
    passed: blockers.length === 0,
    blockers,
  };
}

function buildSummary(cases: CaseResult[]): EvalSummary {
  const total = cases.length;
  const passed = cases.filter((item) => item.passed).length;
  const failed = total - passed;

  const retrievalPassed = cases.filter((item) =>
    item.expectedRetrievedClauses.every((clauseId) =>
      item.retrievedClauseIds.includes(clauseId),
    ),
  ).length;

  const decisionPassed = cases.filter(
    (item) => item.expectedDecision === item.actualDecision,
  ).length;

  const citationPresentPassed = cases.filter((item) => {
    const citationRequired = item.expectedRetrievedClauses.length > 0;
    return !citationRequired || item.citationCount > 0;
  }).length;

  const citationSupportPassedCount = cases.filter(
    (item) => item.citationSupportPassed,
  ).length;

  const unsupportedCases = cases.filter(
    (item) => item.expectedRetrievedClauses.length === 0,
  );

  const unsupportedRefusalPassed = unsupportedCases.filter(
    (item) =>
      item.actualDecision === "NEEDS_REVIEW" ||
      item.retrievalStatus === "INSUFFICIENT_EVIDENCE",
  ).length;

  const falseApprovalCount = cases.filter((item) => item.falseApproval).length;

  return {
    total,
    passed,
    failed,

    retrievalHitRate: rate(retrievalPassed, total),
    decisionMatchRate: rate(decisionPassed, total),
    citationPresentRate: rate(citationPresentPassed, total),
    citationSupportRate: rate(citationSupportPassedCount, total),
    unsupportedRefusalRate: rate(
      unsupportedRefusalPassed,
      unsupportedCases.length,
    ),
    falseApprovalRate: rate(falseApprovalCount, total),
  };
}

function buildMarkdownReport(report: EvalReport) {
  const lines: string[] = [];

  lines.push("# Week 3 Policy RAG Eval");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Total cases | ${report.summary.total} |`);
  lines.push(`| Passed | ${report.summary.passed} |`);
  lines.push(`| Failed | ${report.summary.failed} |`);
  lines.push(
    `| Retrieval hit rate | ${formatPercent(report.summary.retrievalHitRate)} |`,
  );
  lines.push(
    `| Decision match rate | ${formatPercent(report.summary.decisionMatchRate)} |`,
  );
  lines.push(
    `| Citation present rate | ${formatPercent(
      report.summary.citationPresentRate,
    )} |`,
  );
  lines.push(
    `| Citation support rate | ${formatPercent(
      report.summary.citationSupportRate,
    )} |`,
  );
  lines.push(
    `| Unsupported refusal rate | ${formatPercent(
      report.summary.unsupportedRefusalRate,
    )} |`,
  );
  lines.push(
    `| False approval rate | ${formatPercent(report.summary.falseApprovalRate)} |`,
  );
  lines.push("");

  lines.push("## Cases");
  lines.push("");

  for (const item of report.cases) {
    lines.push(`### ${item.passed ? "✅" : "❌"} ${item.questionId}`);
    lines.push("");
    lines.push(`Question: ${item.question}`);
    lines.push("");
    lines.push(`Packet: ${item.packetId ?? "none"}`);
    lines.push("");
    lines.push(`Expected decision: \`${item.expectedDecision}\``);
    lines.push("");
    lines.push(`Actual decision: \`${item.actualDecision}\``);
    lines.push("");
    lines.push(
      `Expected clauses: ${JSON.stringify(item.expectedRetrievedClauses)}`,
    );
    lines.push("");
    lines.push(`Retrieved clauses: ${JSON.stringify(item.retrievedClauseIds)}`);
    lines.push("");
    lines.push(`Retrieval status: \`${item.retrievalStatus}\``);
    lines.push("");
    lines.push(
      `Top similarity: ${
        item.topSimilarity === null ? "null" : item.topSimilarity.toFixed(4)
      }`,
    );
    lines.push("");
    lines.push(`Citation count: ${item.citationCount}`);
    lines.push("");
    lines.push(`Forced NEEDS_REVIEW: ${item.forcedNeedsReview ? "yes" : "no"}`);
    lines.push("");

    if (item.guardrailReasons.length > 0) {
      lines.push("Guardrail reasons:");
      lines.push("");
      for (const reason of item.guardrailReasons) {
        lines.push(`- ${reason}`);
      }
      lines.push("");
    }

    if (item.blockers.length > 0) {
      lines.push("Blockers:");
      lines.push("");
      for (const blocker of item.blockers) {
        lines.push(`- ${blocker}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const questions = await readJson<EvalQuestion[]>(QUESTIONS_PATH);

  const cases: CaseResult[] = [];

  for (const question of questions) {
    console.log(`Evaluating ${question.questionId}: ${question.question}`);

    try {
      const result = await evaluateOneQuestion(question);
      cases.push(result);

      console.log(
        `${result.passed ? "PASS" : "FAIL"} ${question.questionId} → ${result.actualDecision}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown eval error";

      cases.push({
        questionId: question.questionId,
        packetId: question.packetId,
        question: question.question,

        expectedDecision: question.expectedAnswerType,
        actualDecision: "NEEDS_REVIEW",

        expectedRetrievedClauses: question.expectedRetrievedClauses,
        retrievedClauseIds: [],

        retrievalStatus: "INSUFFICIENT_EVIDENCE",
        retrievalReason: message,
        topSimilarity: null,

        citationCount: 0,
        citationSupportPassed: false,
        forcedNeedsReview: true,
        guardrailReasons: [message],

        falseApproval: false,
        passed: false,
        blockers: [`Eval execution failed: ${message}`],
      });

      console.error(`FAIL ${question.questionId}: ${message}`);
    }
  }

  const report: EvalReport = {
    generatedAt: new Date().toISOString(),
    summary: buildSummary(cases),
    cases,
  };

  await mkdir(REPORT_ROOT, { recursive: true });
  await writeFile(JSON_REPORT_PATH, toPrettyJson(report));
  await writeFile(MARKDOWN_REPORT_PATH, buildMarkdownReport(report));

  console.log("");
  console.log("Week 3 RAG eval complete.");
  console.log(`JSON report: ${JSON_REPORT_PATH}`);
  console.log(`Markdown report: ${MARKDOWN_REPORT_PATH}`);
  console.log("");
  console.log(`Passed: ${report.summary.passed}/${report.summary.total}`);
  console.log(
    `False approval rate: ${formatPercent(report.summary.falseApprovalRate)}`,
  );

  if (report.summary.falseApprovalRate > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Week 3 RAG eval failed.", error);
  process.exitCode = 1;
});