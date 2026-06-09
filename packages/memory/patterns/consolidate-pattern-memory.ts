import { Prisma, prisma } from "@repo/db";
import {
  type PatternSourceMemory,
  type RepeatedMemoryPatternCandidate,
  getPatternSourceObservationIds,
} from "./find-repeated-memory-patterns";
import { getStringArray, isRecord } from "../utils/json";

export type ConsolidatePatternMemoryResult = {
  memoryId: string;
  created: boolean;
  sourceMemoryIds: string[];
  memoryUpdateId: string;
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function collectFromEvidenceArray(
  memories: PatternSourceMemory[],
  key: string,
): string[] {
  return uniqueStrings(
    memories.flatMap((memory) => {
      if (!isRecord(memory.evidenceJson)) return [];

      const value = memory.evidenceJson[key];

      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    }),
  );
}

function collectSourceWeeks(memories: PatternSourceMemory[]): number[] {
  return Array.from(
    new Set(
      memories.flatMap((memory) => {
        if (!isRecord(memory.evidenceJson)) return [];

        const value = memory.evidenceJson.sourceWeeks;

        return Array.isArray(value)
          ? value.filter((item): item is number => typeof item === "number")
          : [];
      }),
    ),
  ).sort((left, right) => left - right);
}

function sourceMemorySnapshots(memories: PatternSourceMemory[]) {
  return memories.map((memory) => ({
    memoryId: memory.id,
    kind: memory.kind,
    status: memory.status,
    riskLevel: memory.riskLevel,
    confidence: memory.confidence,
    summary: memory.summary,
    entityType: memory.entityType,
    entityId: memory.entityId,
    fieldPath: memory.fieldPath,
  }));
}

function buildPatternEvidence(candidate: RepeatedMemoryPatternCandidate) {
  return {
    patternKey: candidate.patternKey,
    generalizedFromMemoryIds: candidate.sourceMemories.map((memory) => memory.id),
    sourceMemoryKinds: uniqueStrings(
      candidate.sourceMemories.map((memory) => memory.kind),
    ),
    sourceObservationIds: getPatternSourceObservationIds(candidate.sourceMemories),
    sourcePacketIds: collectFromEvidenceArray(
      candidate.sourceMemories,
      "sourcePacketIds",
    ),
    sourceWeeks: collectSourceWeeks(candidate.sourceMemories),
    sourceMemorySnapshots: sourceMemorySnapshots(candidate.sourceMemories),
    generalizedAt: new Date().toISOString(),
  };
}

function hasSamePatternKey(evidenceJson: unknown, patternKey: string): boolean {
  return isRecord(evidenceJson) && evidenceJson.patternKey === patternKey;
}

async function findExistingPattern(candidate: RepeatedMemoryPatternCandidate) {
  const scopedCandidates = await prisma.workflowMemory.findMany({
    where: {
      kind: candidate.patternType,
      entityType: candidate.entityType,
      entityId: candidate.entityId,
      fieldPath: candidate.fieldPath,
      status: {
        in: ["ACTIVE", "STRENGTHENED", "WEAKENED"],
      },
    },
    take: 50,
  });

  return (
    scopedCandidates.find((memory) =>
      hasSamePatternKey(memory.evidenceJson, candidate.patternKey),
    ) ?? null
  );
}

function mergeEvidence(input: {
  existingEvidenceJson: unknown;
  newEvidenceJson: ReturnType<typeof buildPatternEvidence>;
}) {
  const existing = isRecord(input.existingEvidenceJson)
    ? input.existingEvidenceJson
    : {};

  const existingMemoryIds = getStringArray(existing.generalizedFromMemoryIds);
  const existingObservationIds = getStringArray(existing.sourceObservationIds);
  const existingPacketIds = getStringArray(existing.sourcePacketIds);

  return {
    ...existing,
    ...input.newEvidenceJson,
    generalizedFromMemoryIds: uniqueStrings([
      ...existingMemoryIds,
      ...input.newEvidenceJson.generalizedFromMemoryIds,
    ]),
    sourceObservationIds: uniqueStrings([
      ...existingObservationIds,
      ...input.newEvidenceJson.sourceObservationIds,
    ]),
    sourcePacketIds: uniqueStrings([
      ...existingPacketIds,
      ...input.newEvidenceJson.sourcePacketIds,
    ]),
    lastGeneralizedAt: new Date().toISOString(),
  };
}

export async function consolidatePatternMemory(
  candidate: RepeatedMemoryPatternCandidate,
): Promise<ConsolidatePatternMemoryResult> {
  const sourceMemoryIds = candidate.sourceMemories.map((memory) => memory.id);

  const existingPattern = await findExistingPattern(candidate);
  const patternEvidence = buildPatternEvidence(candidate);

  if (existingPattern) {
    const mergedEvidence = mergeEvidence({
      existingEvidenceJson: existingPattern.evidenceJson,
      newEvidenceJson: patternEvidence,
    });

    return prisma.$transaction(async (tx) => {
      const updated = await tx.workflowMemory.update({
        where: {
          id: existingPattern.id,
        },
        data: {
          status: "STRENGTHENED",
          confidence: Math.min(
            0.9,
            Number(Math.max(existingPattern.confidence, candidate.confidence).toFixed(4)),
          ),
          riskLevel: candidate.riskLevel,
          summary: candidate.summary,
          safeUse: candidate.safeUse,
          mustNotDo: toPrismaJson(candidate.mustNotDo),
          tags: toPrismaJson(
            uniqueStrings([
              ...getStringArray(existingPattern.tags),
              ...candidate.tags,
            ]),
          ),
          evidenceJson: toPrismaJson(mergedEvidence),
        },
      });

      const memoryUpdate = await tx.memoryUpdate.create({
        data: {
          memoryId: updated.id,
          updateType: "GENERALIZED",
          beforeStatus: existingPattern.status,
          afterStatus: updated.status,
          confidenceDelta: Number(
            (updated.confidence - existingPattern.confidence).toFixed(4),
          ),
          note:
            "Existing semantic pattern memory was strengthened from repeated episodic memories.",
          metadata: toPrismaJson({
            patternKey: candidate.patternKey,
            sourceMemoryIds,
            created: false,
          }),
        },
      });

      return {
        memoryId: updated.id,
        created: false,
        sourceMemoryIds,
        memoryUpdateId: memoryUpdate.id,
      };
    });
  }

  return prisma.$transaction(async (tx) => {
    const memory = await tx.workflowMemory.create({
      data: {
        kind: candidate.patternType,
        status: "ACTIVE",
        riskLevel: candidate.riskLevel,
        confidence: candidate.confidence,

        summary: candidate.summary,
        safeUse: candidate.safeUse,
        mustNotDo: toPrismaJson(candidate.mustNotDo),

        entityType: candidate.entityType,
        entityId: candidate.entityId,
        fieldPath: candidate.fieldPath,
        tags: toPrismaJson(candidate.tags),

        evidenceJson: toPrismaJson(patternEvidence),

        confirmedCount: 0,
        contradictedCount: 0,
      },
    });

    const memoryUpdate = await tx.memoryUpdate.create({
      data: {
        memoryId: memory.id,
        updateType: "GENERALIZED",
        afterStatus: memory.status,
        confidenceDelta: memory.confidence,
        note:
          "Created semantic pattern memory by generalizing repeated episodic workflow memories.",
        metadata: toPrismaJson({
          patternKey: candidate.patternKey,
          sourceMemoryIds,
          created: true,
        }),
      },
    });

    return {
      memoryId: memory.id,
      created: true,
      sourceMemoryIds,
      memoryUpdateId: memoryUpdate.id,
    };
  });
}