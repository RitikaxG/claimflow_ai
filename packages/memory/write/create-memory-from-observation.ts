import { prisma, Prisma } from "@repo/db";
import {
  type MemoryObservation,
  MemoryObservationSchema,
} from "../types";
import { isRecord } from "../utils/json";
import { toJsonSafeValue } from "../utils/json";

export type CreateMemoryFromObservationResult = {
  memoryId: string | null;
  skipped: boolean;
  reason: string;
};


function toPrismaJson(value : unknown) : Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function hasSourceObservationId(
  evidenceJson: unknown,
  observationId: string,
): boolean {
  if (!isRecord(evidenceJson)) {
    return false;
  }

  const sourceObservationIds = evidenceJson.sourceObservationIds;

  return (
    Array.isArray(sourceObservationIds) &&
    sourceObservationIds.some((item) => item === observationId)
  );
}

function isSameDeterministicMemoryCandidate(input: {
  memory: {
    summary: string;
    evidenceJson: unknown;
  };
  observation: MemoryObservation;
}): boolean {
  const { memory, observation } = input;

  if (memory.summary === observation.summary) {
    return true;
  }

  return hasSourceObservationId(memory.evidenceJson, observation.observationId);
}

export function defaultConfidenceForObservation(
  observation: MemoryObservation,
): number {
  if (observation.recommendedMemoryKind === "HUMAN_CORRECTION") {
    return 0.75;
  }

  if (observation.recommendedMemoryKind === "PRIOR_REJECTION") {
    return 0.7;
  }

  if (observation.riskLevel === "HIGH") {
    return 0.65;
  }

  if (observation.riskLevel === "MEDIUM") {
    return 0.68;
  }

  return 0.6;
}

function validateMemorySafetyFields(observation: MemoryObservation) {
  if (observation.summary.trim().length === 0) {
    throw new Error(
      `Memory observation ${observation.observationId} is missing summary.`,
    );
  }

  if (observation.safeUse.trim().length === 0) {
    throw new Error(
      `Memory observation ${observation.observationId} is missing safeUse.`,
    );
  }

  if (observation.mustNotDo.length === 0) {
    throw new Error(
      `Memory observation ${observation.observationId} is missing mustNotDo rules.`,
    );
  }
}

function buildEvidenceJson(observation: MemoryObservation): Record<string, unknown> {
  const baseEvidence = isRecord(observation.evidenceJson)
    ? observation.evidenceJson
    : {};

  return {
    ...baseEvidence,
    sourceObservationIds: [observation.observationId],
    sourcePacketIds: observation.sourcePacketId
      ? [observation.sourcePacketId]
      : [],
    historicalClaimId: observation.historicalClaimId ?? null,
    sourceType: observation.sourceType,
    sourceId: observation.sourceId,
    beforeValue: toJsonSafeValue(observation.beforeValue) ?? null,
    afterValue: toJsonSafeValue(observation.afterValue) ?? null,
  };
};

function buildSourceLinks(observation : MemoryObservation){
  return {
    sourceRunId : observation.sourceType === "EXTRACTION_RUN" ? observation.sourceId : null,
    sourceReviewDecisionId : observation.sourceType === "REVIEW_DECISION" ? observation.sourceId : null,
    sourceCoverageQuestionId : observation.sourceType === "COVERAGE_QUESTION" ? observation.sourceId : null,
    sourceAgentActionLogId : observation.sourceType === "AGENT_ACTION_LOG" ? observation.sourceId : null,
  }
}

export async function createMemoryFromObservation(
  rawObservation: MemoryObservation,
): Promise<CreateMemoryFromObservationResult> {
  const observation = MemoryObservationSchema.parse(rawObservation);

  if (!observation.shouldCreateMemory) {
    return {
      memoryId: null,
      skipped: true,
      reason: "OBSERVATION_MARKED_DO_NOT_CREATE_MEMORY",
    };
  }

  validateMemorySafetyFields(observation);

  return prisma.$transaction(async (tx) => {
    const candidateExistingMemories = await tx.workflowMemory.findMany({
      where: {
        kind: observation.recommendedMemoryKind,
        entityType: observation.entityType ?? null,
        entityId: observation.entityId ?? null,
        fieldPath: observation.fieldPath ?? null,
      },
      take: 25,
    });

    const existingMemory = candidateExistingMemories.find((memory) =>
      isSameDeterministicMemoryCandidate({
        memory,
        observation,
      }),
    );

    if (existingMemory) {
      // Rebuild-safe refresh: preserve lifecycle/confidence/feedback while
      // bringing deterministic workflow profile tags in sync with the source
      // review. This is important when retrieval profiling evolves.
      await tx.workflowMemory.update({
        where: {
          id: existingMemory.id,
        },
        data: {
          ...buildSourceLinks(observation),
          riskLevel: observation.riskLevel,
          summary: observation.summary,
          safeUse: observation.safeUse,
          mustNotDo: observation.mustNotDo,
          tags: observation.tags,
          evidenceJson: toPrismaJson(buildEvidenceJson(observation)),
        },
      });

      return {
        memoryId: existingMemory.id,
        skipped: true,
        reason: "MEMORY_ALREADY_EXISTS_PROFILE_REFRESHED",
      };
    }

    const memory = await tx.workflowMemory.create({
      data: {
        ...buildSourceLinks(observation),
        kind: observation.recommendedMemoryKind,
        status: "ACTIVE",
        riskLevel: observation.riskLevel,
        confidence: defaultConfidenceForObservation(observation),
        summary: observation.summary,
        safeUse: observation.safeUse,
        mustNotDo: observation.mustNotDo,
        entityType: observation.entityType ?? null,
        entityId: observation.entityId ?? null,
        fieldPath: observation.fieldPath ?? null,
        tags: observation.tags,
        evidenceJson: toPrismaJson(buildEvidenceJson(observation)),
        confirmedCount: 0,
        contradictedCount: 0,
      },
    });

    await tx.memoryUpdate.create({
      data: {
        memoryId: memory.id,
        updateType: "CREATED",
        afterStatus: "ACTIVE",
        confidenceDelta: memory.confidence,
        note: `Created from memory observation ${observation.observationId}`,
        metadata: {
          observationId: observation.observationId,
          sourceType: observation.sourceType,
          sourceId: observation.sourceId,
          sourcePacketId: observation.sourcePacketId ?? null,
        },
      },
    });

    return {
      memoryId: memory.id,
      skipped: false,
      reason: "MEMORY_CREATED",
    };
  });
}
