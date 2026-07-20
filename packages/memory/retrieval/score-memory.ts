import type { BuildMemoryQuery } from "./build-memory-query";
import type { MemoryMatchSignal } from "../types";
import { getStringArray } from "../utils/json";

export type WorkflowMemoryLike = {
  id: string;
  kind: string;
  status: string;
  riskLevel: string;
  confidence: number;
  summary: string;
  safeUse: string;
  mustNotDo: unknown;
  entityType: string | null;
  entityId: string | null;
  fieldPath: string | null;
  tags: unknown;
  confirmedCount: number;
  contradictedCount: number;
};

export const MEMORY_SCORE = {
  EXACT_POLICY: 35,

  SAME_FIELD: 30,
  GENERIC_FIELD_BUCKET_MATCH: 5,

  MISSING_FIELD_MATCH: 30,
  REQUIRED_EVIDENCE_MATCH: 30,

  PATTERN_FULL_MATCH: 45,
  PATTERN_PARTIAL_MATCH: 10,

  EXACT_VENDOR: 25,
  EXACT_CLAIMANT: 20,

  SAME_CLAIM_TYPE: 15,
  SAME_LOSS_TYPE: 15,
  EVIDENCE_PROFILE_MATCH: 20,
  VALIDATION_PATTERN_MATCH: 25,
  HIGH_RISK_MEMORY: 10,
  HUMAN_VERIFIED_MEMORY: 10,
  CONFIRMED_MEMORY: 10,

  CONTRADICTED_BEFORE: -20,
  NAME_ONLY_WEAK_MATCH: -30,
} as const;

const ELIGIBLE_MEMORY_STATUSES = new Set([
  "ACTIVE",
  "STRENGTHENED",
  "WEAKENED",
]);

const GENERIC_FIELD_BUCKETS = new Set([
  "missingfields",
  "requiredevidence",
  "duplicatesignals",
  "retrievalstatus",
]);

const WORKFLOW_MATCH_TYPES = new Set<MemoryMatchSignal["type"]>([
  "EXACT_POLICY",
  "SAME_FIELD",
  "MISSING_FIELD_MATCH",
  "REQUIRED_EVIDENCE_MATCH",
  "PATTERN_FULL_MATCH",
  "PATTERN_PARTIAL_MATCH",
]);

const ENTITY_RISK_MEMORY_KINDS = new Set([
  "PRIOR_REJECTION",
  "CLAIMANT_PATTERN",
  "VENDOR_PATTERN",
]);

const BROAD_WORKFLOW_MATCH_TYPES = new Set<MemoryMatchSignal["type"]>([
  "SAME_CLAIM_TYPE",
  "SAME_LOSS_TYPE",
  "EVIDENCE_PROFILE_MATCH",
  "VALIDATION_PATTERN_MATCH",
]);

const STRONG_WORKFLOW_GAP_MATCH_TYPES = new Set<
  MemoryMatchSignal["type"]
>([
  "SAME_FIELD",
  "MISSING_FIELD_MATCH",
  "REQUIRED_EVIDENCE_MATCH",
  "PATTERN_FULL_MATCH",
]);

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeTagToken(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFieldToken(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function tagsWithPrefix(tags: string[], prefix: string): string[] {
  return tags
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length));
}

function currentMissingFieldAliasValues(query: BuildMemoryQuery): string[] {
  return uniqueStrings([
    ...query.missingFields,
    ...query.fieldPaths,
    ...tagsWithPrefix(query.tags, "missing_field:"),
  ]);
}

function currentRequiredEvidenceAliasValues(query: BuildMemoryQuery): string[] {
  return uniqueStrings([
    ...query.requiredEvidence,
    ...query.fieldPaths,
    ...tagsWithPrefix(query.tags, "required_evidence:"),
  ]);
}

function isGenericFieldBucket(fieldPath: string): boolean {
  return GENERIC_FIELD_BUCKETS.has(normalizeComparable(fieldPath));
}

function hasSameFieldPath(input: {
  memoryFieldPath: string | null;
  queryFieldPaths: string[];
}): boolean {
  if (!input.memoryFieldPath) {
    return false;
  }

  const memoryFieldPath = normalizeComparable(input.memoryFieldPath);

  return input.queryFieldPaths.some(
    (fieldPath) => normalizeComparable(fieldPath) === memoryFieldPath,
  );
}

function hasTag(memoryTags: string[], tag: string): boolean {
  const normalizedTag = normalizeTagToken(tag);

  return memoryTags.some((item) => normalizeTagToken(item) === normalizedTag);
}

function hasAnyTag(memoryTags: string[], tags: string[]): string | null {
  for (const tag of tags) {
    if (hasTag(memoryTags, tag)) {
      return tag;
    }
  }

  return null;
}

function hasSameLossType(input: {
  memoryTags: string[];
  query: BuildMemoryQuery;
}): boolean {
  if (!input.query.lossType) {
    return false;
  }

  const lossTypeTag = `loss_type:${normalizeTagToken(input.query.lossType)}`;

  return hasTag(input.memoryTags, lossTypeTag);
}

function hasSameProfileValue(input: {
  memoryTags: string[];
  prefix: string;
  value: string | null;
}): boolean {
  if (!input.value) {
    return false;
  }

  return hasTag(input.memoryTags, `${input.prefix}:${input.value}`);
}

function hasConflictingProfileValue(input: {
  memoryTags: string[];
  prefix: string;
  value: string | null;
}): boolean {
  if (!input.value) {
    return false;
  }

  const storedValues = tagsWithPrefix(input.memoryTags, `${input.prefix}:`)
    .map(normalizeTagToken);

  return (
    storedValues.length > 0 &&
    !storedValues.includes(normalizeTagToken(input.value))
  );
}

function pushSignal(input: {
  matchedOn: MemoryMatchSignal[];
  type: MemoryMatchSignal["type"];
  value: string;
  points: number;
}) {
  input.matchedOn.push({
    type: input.type,
    value: input.value,
    points: input.points,
  });
}

function buildRetrievalReason(matchedOn: MemoryMatchSignal[]): string {
  if (matchedOn.length === 0) {
    return "No relevant structured memory match.";
  }

  return `Matched on ${matchedOn
    .map((signal) => `${signal.type}(${signal.value}, ${signal.points})`)
    .join(", ")}.`;
}

function buildMissingFieldTags(values: string[]): string[] {
  return values.flatMap((field) => {
    const normalized = normalizeTagToken(field);

    return [`missing_field:${normalized}`, `${normalized}_missing`];
  });
}

function buildRequiredEvidenceTags(values: string[]): string[] {
  return values.flatMap((evidence) => {
    const normalized = normalizeTagToken(evidence);

    return [`required_evidence:${normalized}`, `${normalized}_required`];
  });
}

function extractMissingFieldPatternFromTags(memoryTags: string[]): string[] {
  return memoryTags
    .map((tag) => normalizeTagToken(tag))
    .filter((tag) => tag.endsWith("_missing"))
    .map((tag) => tag.replace(/_missing$/, ""))
    .filter((tag) => tag.length > 0);
}

function scoreRecurringMissingFieldPattern(input: {
  memory: WorkflowMemoryLike;
  memoryTags: string[];
  query: BuildMemoryQuery;
  matchedOn: MemoryMatchSignal[];
}) {
  if (input.memory.kind !== "RECURRING_ERROR_PATTERN") {
    return;
  }

  const patternMissingFields = extractMissingFieldPatternFromTags(
    input.memoryTags,
  );

  if (patternMissingFields.length === 0) {
    return;
  }

  const currentMissingFields = new Set(
    currentMissingFieldAliasValues(input.query).map((field) =>
      normalizeFieldToken(field),
    ),
  );

  const matchedPatternFields = patternMissingFields.filter((field) =>
    currentMissingFields.has(normalizeFieldToken(field)),
  );

  if (matchedPatternFields.length === 0) {
    return;
  }

  if (matchedPatternFields.length === patternMissingFields.length) {
    pushSignal({
      matchedOn: input.matchedOn,
      type: "PATTERN_FULL_MATCH",
      value: patternMissingFields.join("+"),
      points: MEMORY_SCORE.PATTERN_FULL_MATCH,
    });

    return;
  }

  pushSignal({
    matchedOn: input.matchedOn,
    type: "PATTERN_PARTIAL_MATCH",
    value: `${matchedPatternFields.join("+")} of ${patternMissingFields.join(
      "+",
    )}`,
    points: MEMORY_SCORE.PATTERN_PARTIAL_MATCH,
  });
}

function hasWorkflowMatch(matchedOn: MemoryMatchSignal[]): boolean {
  return matchedOn.some((signal) => WORKFLOW_MATCH_TYPES.has(signal.type));
}

function hasBroadWorkflowMatch(input: {
  memory: WorkflowMemoryLike;
  matchedOn: MemoryMatchSignal[];
}): boolean {
  if (!isGeneralizedWorkflowMemory(input.memory)) {
    return false;
  }

  const distinctProfileMatches = new Set(
    input.matchedOn
      .filter((signal) => BROAD_WORKFLOW_MATCH_TYPES.has(signal.type))
      .map((signal) => signal.type),
  );

  const hasStrongGapMatch = input.matchedOn.some((signal) =>
    STRONG_WORKFLOW_GAP_MATCH_TYPES.has(signal.type),
  );

  const hasClaimShapeMatch = input.matchedOn.some(
    (signal) =>
      signal.type === "SAME_CLAIM_TYPE" ||
      signal.type === "SAME_LOSS_TYPE",
  );

  // Three broad similarities remain sufficient. An exact current-workflow gap
  // (for example the same missing FIR field or required police report) can also
  // qualify when the claim/loss shape matches. The memory remains guidance only
  // and never becomes evidence for the current claim.
  return (
    distinctProfileMatches.size >= 3 ||
    (hasStrongGapMatch && hasClaimShapeMatch)
  );
}

function isGeneralizedWorkflowMemory(memory: WorkflowMemoryLike): boolean {
  return (
    memory.kind === "PRIOR_REVIEW_DECISION" &&
    memory.entityType === "WORKFLOW"
  );
}

function hasEntityRiskMatch(input: {
  memory: WorkflowMemoryLike;
  matchedOn: MemoryMatchSignal[];
}): boolean {
  if (!ENTITY_RISK_MEMORY_KINDS.has(input.memory.kind)) {
    return false;
  }

  return input.matchedOn.some(
    (signal) =>
      signal.type === "EXACT_CLAIMANT" ||
      signal.type === "EXACT_VENDOR" ||
      signal.type === "EXACT_POLICY",
  );
}

function getQueryEntityIdForMemory(input: {
  memory: WorkflowMemoryLike;
  query: BuildMemoryQuery;
}): string | null {
  if (input.memory.entityType === "CLAIMANT") {
    return input.query.claimantId;
  }

  if (input.memory.entityType === "VENDOR") {
    return input.query.vendorId;
  }

  if (input.memory.entityType === "POLICY") {
    return input.query.policyId;
  }

  return null;
}

function hasEntityScopeMismatch(input: {
  memory: WorkflowMemoryLike;
  query: BuildMemoryQuery;
}): boolean {
  const memoryEntityType = input.memory.entityType;
  const memoryEntityId = input.memory.entityId;

  if (!memoryEntityType || !memoryEntityId) {
    return false;
  }

  if (!["CLAIMANT", "VENDOR", "POLICY"].includes(memoryEntityType)) {
    return false;
  }

  const queryEntityId = getQueryEntityIdForMemory(input);

  if (!queryEntityId) {
    return false;
  }

  return queryEntityId !== memoryEntityId;
}

export function scoreMemory(input: {
  memory: WorkflowMemoryLike;
  query: BuildMemoryQuery;
}): {
  score: number;
  matchedOn: MemoryMatchSignal[];
  retrievalReason: string;
  isEligible: boolean;
} {
  const { memory, query } = input;
  const matchedOn: MemoryMatchSignal[] = [];

  if (!ELIGIBLE_MEMORY_STATUSES.has(memory.status)) {
    return {
      score: 0,
      matchedOn,
      retrievalReason: `Memory status ${memory.status} is not eligible for retrieval.`,
      isEligible: false,
    };
  }

  if (
    hasEntityScopeMismatch({
      memory,
      query,
    })
  ) {
    return {
      score: 0,
      matchedOn,
      retrievalReason: `Memory is scoped to ${memory.entityType}/${memory.entityId}, but current claim has a different entity.`,
      isEligible: false,
    };
  }

  if (
    memory.entityType === "POLICY" &&
    query.policyId &&
    memory.entityId === query.policyId
  ) {
    pushSignal({
      matchedOn,
      type: "EXACT_POLICY",
      value: query.policyId,
      points: MEMORY_SCORE.EXACT_POLICY,
    });
  }

  if (
    hasSameFieldPath({
      memoryFieldPath: memory.fieldPath,
      queryFieldPaths: query.fieldPaths,
    })
  ) {
    if (memory.fieldPath && isGenericFieldBucket(memory.fieldPath)) {
      pushSignal({
        matchedOn,
        type: "GENERIC_FIELD_BUCKET_MATCH",
        value: memory.fieldPath,
        points: MEMORY_SCORE.GENERIC_FIELD_BUCKET_MATCH,
      });
    } else {
      pushSignal({
        matchedOn,
        type: "SAME_FIELD",
        value: memory.fieldPath ?? "unknown",
        points: MEMORY_SCORE.SAME_FIELD,
      });
    }
  }

  const memoryTags = getStringArray(memory.tags);

  const missingFieldMatch = hasAnyTag(
    memoryTags,
    buildMissingFieldTags(currentMissingFieldAliasValues(query)),
  );

  if (missingFieldMatch) {
    pushSignal({
      matchedOn,
      type: "MISSING_FIELD_MATCH",
      value: missingFieldMatch,
      points: MEMORY_SCORE.MISSING_FIELD_MATCH,
    });
  }

  const requiredEvidenceMatch = hasAnyTag(
    memoryTags,
    buildRequiredEvidenceTags(currentRequiredEvidenceAliasValues(query)),
  );

  if (requiredEvidenceMatch) {
    pushSignal({
      matchedOn,
      type: "REQUIRED_EVIDENCE_MATCH",
      value: requiredEvidenceMatch,
      points: MEMORY_SCORE.REQUIRED_EVIDENCE_MATCH,
    });
  }

  scoreRecurringMissingFieldPattern({
    memory,
    memoryTags,
    query,
    matchedOn,
  });

  if (
    memory.entityType === "VENDOR" &&
    query.vendorId &&
    memory.entityId === query.vendorId
  ) {
    pushSignal({
      matchedOn,
      type: "EXACT_VENDOR",
      value: query.vendorId,
      points: MEMORY_SCORE.EXACT_VENDOR,
    });
  }

  if (
    memory.entityType === "CLAIMANT" &&
    query.claimantId &&
    memory.entityId === query.claimantId
  ) {
    pushSignal({
      matchedOn,
      type: "EXACT_CLAIMANT",
      value: query.claimantId,
      points: MEMORY_SCORE.EXACT_CLAIMANT,
    });
  }

  if (
    hasSameLossType({
      memoryTags,
      query,
    })
  ) {
    pushSignal({
      matchedOn,
      type: "SAME_LOSS_TYPE",
      value: query.lossType ?? "unknown",
      points: MEMORY_SCORE.SAME_LOSS_TYPE,
    });
  }

  if (
    hasSameProfileValue({
      memoryTags,
      prefix: "claim_type",
      value: query.claimType,
    })
  ) {
    pushSignal({
      matchedOn,
      type: "SAME_CLAIM_TYPE",
      value: query.claimType ?? "unknown",
      points: MEMORY_SCORE.SAME_CLAIM_TYPE,
    });
  }

  if (
    hasSameProfileValue({
      memoryTags,
      prefix: "evidence_profile",
      value: query.evidenceProfile,
    })
  ) {
    pushSignal({
      matchedOn,
      type: "EVIDENCE_PROFILE_MATCH",
      value: query.evidenceProfile,
      points: MEMORY_SCORE.EVIDENCE_PROFILE_MATCH,
    });
  }

  if (
    hasSameProfileValue({
      memoryTags,
      prefix: "validation_pattern",
      value: query.validationPattern,
    })
  ) {
    pushSignal({
      matchedOn,
      type: "VALIDATION_PATTERN_MATCH",
      value: query.validationPattern,
      points: MEMORY_SCORE.VALIDATION_PATTERN_MATCH,
    });
  }

  if (memory.riskLevel === "HIGH") {
    pushSignal({
      matchedOn,
      type: "HIGH_RISK_MEMORY",
      value: memory.riskLevel,
      points: MEMORY_SCORE.HIGH_RISK_MEMORY,
    });
  }

  if (hasTag(memoryTags, "human_verified")) {
    pushSignal({
      matchedOn,
      type: "HUMAN_VERIFIED_MEMORY",
      value: "human_verified",
      points: MEMORY_SCORE.HUMAN_VERIFIED_MEMORY,
    });
  }

  if (memory.confirmedCount > 0) {
    pushSignal({
      matchedOn,
      type: "CONFIRMED_MEMORY",
      value: String(memory.confirmedCount),
      points: MEMORY_SCORE.CONFIRMED_MEMORY,
    });
  }

  if (memory.contradictedCount > 0) {
    pushSignal({
      matchedOn,
      type: "CONTRADICTED_BEFORE",
      value: String(memory.contradictedCount),
      points: MEMORY_SCORE.CONTRADICTED_BEFORE,
    });
  }

  const score = matchedOn.reduce((total, signal) => total + signal.points, 0);

  const hasConflictingWorkflowProfile =
    hasConflictingProfileValue({
      memoryTags,
      prefix: "claim_type",
      value: query.claimType,
    }) ||
    hasConflictingProfileValue({
      memoryTags,
      prefix: "loss_type",
      value: query.lossType,
    });

  const isEligible = isGeneralizedWorkflowMemory(memory)
    ? score > 0 &&
      !hasConflictingWorkflowProfile &&
      hasBroadWorkflowMatch({ memory, matchedOn })
    : score > 0 &&
      (hasWorkflowMatch(matchedOn) ||
        hasEntityRiskMatch({
          memory,
          matchedOn,
        }));

  return {
    score,
    matchedOn,
    retrievalReason: buildRetrievalReason(matchedOn),
    isEligible,
  };
}
