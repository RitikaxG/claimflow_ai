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

  SAME_LOSS_TYPE: 10,
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

function buildMissingFieldTags(missingFields: string[]): string[] {
  return missingFields.flatMap((field) => {
    const normalized = normalizeTagToken(field);

    return [`missing_field:${normalized}`, `${normalized}_missing`];
  });
}

function buildRequiredEvidenceTags(requiredEvidence: string[]): string[] {
  return requiredEvidence.flatMap((evidence) => {
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
    input.query.missingFields.map((field) => normalizeFieldToken(field)),
  );

  const matchedPatternFields = patternMissingFields.filter((field) =>
    currentMissingFields.has(field),
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
    buildMissingFieldTags(query.missingFields),
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
    buildRequiredEvidenceTags(query.requiredEvidence),
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

  const isEligible =
    score > 0 &&
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