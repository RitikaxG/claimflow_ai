import { prisma } from "@repo/db";
import { getStringArray, isRecord } from "../utils/json";

export type PatternCandidateType =
  | "RECURRING_ERROR_PATTERN"
  | "VENDOR_PATTERN"
  | "CLAIMANT_PATTERN";

export type PatternSourceMemory = {
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
  evidenceJson: unknown;
  confirmedCount: number;
  contradictedCount: number;
};

export type RepeatedMemoryPatternCandidate = {
  patternType: PatternCandidateType;
  patternKey: string;

  entityType: string | null;
  entityId: string | null;
  fieldPath: string | null;

  sourceMemories: PatternSourceMemory[];

  summary: string;
  safeUse: string;
  mustNotDo: string[];
  tags: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
};

export type FindRepeatedMemoryPatternsInput = {
  sourceMemoryIds?: string[];
  minFieldCorrectionCount?: number;
  minVendorRiskCount?: number;
  minClaimantPatternCount?: number;
};

const ELIGIBLE_SOURCE_STATUSES = ["ACTIVE", "STRENGTHENED", "WEAKENED"] as const;

const EPISODIC_SOURCE_KINDS = [
  "HUMAN_CORRECTION",
  "PRIOR_REJECTION",
  "PRIOR_REVIEW_DECISION",
  "POLICY_HISTORY",
] as const;

function normalizeToken(value: string): string {
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

function riskRank(value: string): number {
  if (value === "HIGH") return 3;
  if (value === "MEDIUM") return 2;
  return 1;
}

function maxRiskLevel(memories: PatternSourceMemory[]): "LOW" | "MEDIUM" | "HIGH" {
  const max = memories.reduce(
    (current, memory) => Math.max(current, riskRank(memory.riskLevel)),
    1,
  );

  if (max >= 3) return "HIGH";
  if (max === 2) return "MEDIUM";
  return "LOW";
}

function averageConfidence(memories: PatternSourceMemory[]): number {
  if (memories.length === 0) return 0.65;

  const average =
    memories.reduce((sum, memory) => sum + memory.confidence, 0) /
    memories.length;

  return Math.min(0.85, Math.max(0.6, Number(average.toFixed(4))));
}

function groupBy<T>(
  items: T[],
  buildKey: (item: T) => string | null,
): Map<string, T[]> {
  const output = new Map<string, T[]>();

  for (const item of items) {
    const key = buildKey(item);

    if (!key) continue;

    const existing = output.get(key) ?? [];
    existing.push(item);
    output.set(key, existing);
  }

  return output;
}

function firstStrongTag(memory: PatternSourceMemory): string | null {
  const tags = getStringArray(memory.tags);

  return (
    tags.find((tag) => tag.includes("risk")) ??
    tags.find((tag) => tag.includes("conflict")) ??
    tags.find((tag) => tag.includes("duplicate")) ??
    tags.find((tag) => tag.includes("rejection")) ??
    tags.find((tag) => tag.includes("missing")) ??
    tags[0] ??
    null
  );
}

function buildSourceTags(memories: PatternSourceMemory[]): string[] {
  return uniqueStrings(
    memories.flatMap((memory) => getStringArray(memory.tags)),
  );
}

function fieldDisplayName(fieldPath: string): string {
  return fieldPath.trim();
}

function buildFieldPatternCandidate(
  fieldPath: string,
  memories: PatternSourceMemory[],
): RepeatedMemoryPatternCandidate {
  const normalizedField = normalizeToken(fieldPath);

  return {
    patternType: "RECURRING_ERROR_PATTERN",
    patternKey: `field_correction:${normalizedField}`,

    entityType: "FIELD_PATH",
    entityId: normalizedField,
    fieldPath: "missingFields",

    sourceMemories: memories,

    summary: `Repeated reviewer corrections indicate ${fieldDisplayName(
      fieldPath,
    )} is a recurring extraction risk.`,
    safeUse: `When ${fieldDisplayName(
      fieldPath,
    )} is missing, conflicting, or low-confidence in the current claim, ask the reviewer to verify it.`,
    mustNotDo: [
      `auto-correct ${fieldDisplayName(fieldPath)} from memory`,
      "overwrite extractedJson",
      "treat old corrected values as current truth",
      "approve or reject the claim from this pattern",
    ],
    tags: uniqueStrings([
      "semantic_pattern",
      "recurring_error_pattern",
      "field_correction_pattern",
      `${normalizedField}_missing`,
      `missing_field:${normalizedField}`,
      ...buildSourceTags(memories),
    ]),
    riskLevel: maxRiskLevel(memories),
    confidence: averageConfidence(memories),
  };
}

function buildVendorPatternCandidate(
  vendorId: string,
  patternTag: string,
  memories: PatternSourceMemory[],
): RepeatedMemoryPatternCandidate {
  const normalizedTag = normalizeToken(patternTag);
  const fieldPath =
    memories.find((memory) => memory.fieldPath)?.fieldPath ?? "vendorRisk";

  return {
    patternType: "VENDOR_PATTERN",
    patternKey: `vendor:${vendorId}:${normalizedTag}`,

    entityType: "VENDOR",
    entityId: vendorId,
    fieldPath,

    sourceMemories: memories,

    summary: `Repeated workflow memories indicate vendor ${vendorId} has recurring review risk around ${patternTag}.`,
    safeUse:
      "If the current claim has matching vendor documents or conflicts, route to human review and show the current evidence.",
    mustNotDo: [
      "auto-reject based on vendor memory",
      "choose invoice or repair values automatically",
      "overwrite extractedJson",
      "treat vendor memory as current claim evidence",
    ],
    tags: uniqueStrings([
      "semantic_pattern",
      "vendor_pattern",
      normalizedTag,
      ...buildSourceTags(memories),
    ]),
    riskLevel: maxRiskLevel(memories),
    confidence: averageConfidence(memories),
  };
}

function buildClaimantPatternCandidate(
  claimantId: string,
  patternTag: string,
  memories: PatternSourceMemory[],
): RepeatedMemoryPatternCandidate {
  const normalizedTag = normalizeToken(patternTag);
  const fieldPath =
    memories.find((memory) => memory.fieldPath)?.fieldPath ?? "claimantPattern";

  return {
    patternType: "CLAIMANT_PATTERN",
    patternKey: `claimant:${claimantId}:${normalizedTag}`,

    entityType: "CLAIMANT",
    entityId: claimantId,
    fieldPath,

    sourceMemories: memories,

    summary: `Repeated workflow memories indicate claimant ${claimantId} has recurring review signals around ${patternTag}.`,
    safeUse:
      "Use this only as a routing signal when the current claim has similar current evidence or validation signals.",
    mustNotDo: [
      "auto-reject as duplicate or suspicious",
      "draft denial based on claimant memory",
      "overwrite extractedJson",
      "ignore current policy evidence",
    ],
    tags: uniqueStrings([
      "semantic_pattern",
      "claimant_pattern",
      normalizedTag,
      ...buildSourceTags(memories),
    ]),
    riskLevel: maxRiskLevel(memories),
    confidence: averageConfidence(memories),
  };
}

function extractSourceObservationIds(memories: PatternSourceMemory[]): string[] {
  return uniqueStrings(
    memories.flatMap((memory) => {
      if (!isRecord(memory.evidenceJson)) return [];

      const sourceObservationIds = memory.evidenceJson.sourceObservationIds;

      return Array.isArray(sourceObservationIds)
        ? sourceObservationIds.filter((item): item is string => typeof item === "string")
        : [];
    }),
  );
}

export function getPatternSourceObservationIds(
  memories: PatternSourceMemory[],
): string[] {
  return extractSourceObservationIds(memories);
}

export async function findRepeatedMemoryPatterns(
  input: FindRepeatedMemoryPatternsInput = {},
): Promise<RepeatedMemoryPatternCandidate[]> {
  const sourceMemories = await prisma.workflowMemory.findMany({
    where: {
      status: {
        in: [...ELIGIBLE_SOURCE_STATUSES],
      },
      kind: {
        in: [...EPISODIC_SOURCE_KINDS],
      },
      ...(input.sourceMemoryIds
        ? {
            id: {
              in: input.sourceMemoryIds,
            },
          }
        : {}),
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 500,
  });

  const candidates: RepeatedMemoryPatternCandidate[] = [];

  const fieldCorrectionGroups = groupBy(sourceMemories, (memory) => {
    if (memory.kind !== "HUMAN_CORRECTION") return null;
    if (!memory.fieldPath) return null;

    return memory.fieldPath;
  });

  for (const [fieldPath, memories] of fieldCorrectionGroups.entries()) {
    if (memories.length < (input.minFieldCorrectionCount ?? 3)) continue;

    candidates.push(buildFieldPatternCandidate(fieldPath, memories));
  }

  const vendorRiskGroups = groupBy(sourceMemories, (memory) => {
    if (memory.entityType !== "VENDOR") return null;
    if (!memory.entityId) return null;

    const tag = firstStrongTag(memory);
    if (!tag) return null;

    return `${memory.entityId}:${normalizeToken(tag)}`;
  });

  for (const [key, memories] of vendorRiskGroups.entries()) {
    if (memories.length < (input.minVendorRiskCount ?? 2)) continue;

    const [vendorId, normalizedTag] = key.split(":");

    if (!vendorId || !normalizedTag) continue;

    candidates.push(
      buildVendorPatternCandidate(vendorId, normalizedTag, memories),
    );
  }

  const claimantPatternGroups = groupBy(sourceMemories, (memory) => {
    if (memory.entityType !== "CLAIMANT") return null;
    if (!memory.entityId) return null;

    const tag = firstStrongTag(memory);
    if (!tag) return null;

    return `${memory.entityId}:${normalizeToken(tag)}`;
  });

  for (const [key, memories] of claimantPatternGroups.entries()) {
    if (memories.length < (input.minClaimantPatternCount ?? 2)) continue;

    const [claimantId, normalizedTag] = key.split(":");

    if (!claimantId || !normalizedTag) continue;

    candidates.push(
      buildClaimantPatternCandidate(claimantId, normalizedTag, memories),
    );
  }

  return candidates.sort(
    (left, right) => right.sourceMemories.length - left.sourceMemories.length,
  );
}