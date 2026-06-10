import { prisma } from "@repo/db";

export type RunMemoryAuditItem = {
  memoryId: string;
  memoryHitId: string;

  kind: string;
  status: string;
  riskLevel: string;
  confidence: number;

  summary: string;
  safeUse: string;
  mustNotDo: string[];

  score: number;
  matchedOn: {
    type: string;
    value: string;
    points: number;
  }[];
  retrievalReason: string | null;

  usedByAgent: boolean;
  agentActionLogId: string | null;
  agentAction: string | null;
  agentActionStatus: string | null;

  entityType: string | null;
  entityId: string | null;
  fieldPath: string | null;

  sourceRunId: string | null;
  sourceReviewDecisionId: string | null;
  sourceCoverageQuestionId: string | null;
  sourceAgentActionLogId: string | null;

  createdAt: Date;

  updates: {
    id: string;
    updateType: string;
    beforeStatus: string | null;
    afterStatus: string | null;
    confidenceDelta: number | null;
    note: string | null;
    createdAt: Date;
  }[];
};

export type RunMemoryAudit = {
  runId: string;
  memories: RunMemoryAuditItem[];
  summary: {
    totalHits: number;
    usedByAgentCount: number;
    highRiskCount: number;
    latestRetrievedAt: Date | null;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }

  return [];
}

function getMatchedOn(
  value: unknown,
): { type: string; value: string; points: number }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const type = item.type;
    const signalValue = item.value;
    const points = item.points;

    if (
      typeof type !== "string" ||
      typeof signalValue !== "string" ||
      typeof points !== "number"
    ) {
      return [];
    }

    return [
      {
        type,
        value: signalValue,
        points,
      },
    ];
  });
}

export async function getRunMemoryAudit(
  runId: string,
): Promise<RunMemoryAudit> {
  const hits = await prisma.memoryHit.findMany({
    where: {
      runId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      agentActionLog: true,
      memory: {
        include: {
          updates: {
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          },
        },
      },
    },
  });

  const memories = hits.map((hit): RunMemoryAuditItem => {
    return {
      memoryId: hit.memory.id,
      memoryHitId: hit.id,

      kind: hit.memory.kind,
      status: hit.memory.status,
      riskLevel: hit.memory.riskLevel,
      confidence: hit.memory.confidence,

      summary: hit.memory.summary,
      safeUse: hit.memory.safeUse,
      mustNotDo: getStringArray(hit.memory.mustNotDo),

      score: hit.score,
      matchedOn: getMatchedOn(hit.matchedOn),
      retrievalReason: hit.retrievalReason,

      usedByAgent: hit.usedByAgent,
      agentActionLogId: hit.agentActionLogId,
      agentAction: hit.agentActionLog?.action ?? null,
      agentActionStatus: hit.agentActionLog?.status ?? null,

      entityType: hit.memory.entityType,
      entityId: hit.memory.entityId,
      fieldPath: hit.memory.fieldPath,

      sourceRunId: hit.memory.sourceRunId,
      sourceReviewDecisionId: hit.memory.sourceReviewDecisionId,
      sourceCoverageQuestionId: hit.memory.sourceCoverageQuestionId,
      sourceAgentActionLogId: hit.memory.sourceAgentActionLogId,

      createdAt: hit.createdAt,

      updates: hit.memory.updates.map((update) => ({
        id: update.id,
        updateType: update.updateType,
        beforeStatus: update.beforeStatus,
        afterStatus: update.afterStatus,
        confidenceDelta: update.confidenceDelta,
        note: update.note,
        createdAt: update.createdAt,
      })),
    };
  });

  return {
    runId,
    memories,
    summary: {
      totalHits: memories.length,
      usedByAgentCount: memories.filter((item) => item.usedByAgent).length,
      highRiskCount: memories.filter((item) => item.riskLevel === "HIGH").length,
      latestRetrievedAt: memories[0]?.createdAt ?? null,
    },
  };
}