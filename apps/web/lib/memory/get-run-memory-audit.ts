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
  retrievalCount: number;

  updates: {
    id: string;
    updateType: string;
    beforeStatus: string | null;
    afterStatus: string | null;
    confidenceDelta: number | null;
    note: string | null;
    metadata: unknown | null;
    createdAt: Date;
  }[];
};

export type RunMemoryAudit = {
  runId: string;
  memories: RunMemoryAuditItem[];
  summary: {
    totalHits: number;
    totalRetrievalEvents: number;
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

function riskRank(riskLevel: string) {
  if (riskLevel === "HIGH") {
    return 3;
  }

  if (riskLevel === "MEDIUM") {
    return 2;
  }

  return 1;
}

function chooseDisplayHit<
  THit extends {
    score: number;
    usedByAgent: boolean;
    createdAt: Date;
  },
>(hits: THit[]): THit {
  const sortedHits = [...hits].sort((left, right) => {
    if (left.usedByAgent !== right.usedByAgent) {
      return left.usedByAgent ? -1 : 1;
    }

    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });

  const displayHit = sortedHits[0];

  if (!displayHit) {
    throw new Error("Cannot choose display memory hit from an empty hit list.");
  }

  return displayHit;
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

  const hitsByMemoryId = new Map<string, typeof hits>();

  hits.forEach((hit) => {
    const currentHits = hitsByMemoryId.get(hit.memoryId) ?? [];
    currentHits.push(hit);
    hitsByMemoryId.set(hit.memoryId, currentHits);
  });

  const memories = Array.from(hitsByMemoryId.values()).map(
    (memoryHits): RunMemoryAuditItem => {
      const displayHit = chooseDisplayHit(memoryHits);

      const usedHit =
        memoryHits.find((hit) => hit.usedByAgent && hit.agentActionLog) ?? null;

      const usedByAgent = memoryHits.some((hit) => hit.usedByAgent);
      const agentActionLog = usedHit?.agentActionLog ?? displayHit.agentActionLog;

      return {
        memoryId: displayHit.memory.id,
        memoryHitId: displayHit.id,

        kind: displayHit.memory.kind,
        status: displayHit.memory.status,
        riskLevel: displayHit.memory.riskLevel,
        confidence: displayHit.memory.confidence,

        summary: displayHit.memory.summary,
        safeUse: displayHit.memory.safeUse,
        mustNotDo: getStringArray(displayHit.memory.mustNotDo),

        score: displayHit.score,
        matchedOn: getMatchedOn(displayHit.matchedOn),
        retrievalReason: displayHit.retrievalReason,

        usedByAgent,
        agentActionLogId: usedHit?.agentActionLogId ?? displayHit.agentActionLogId,
        agentAction: agentActionLog?.action ?? null,
        agentActionStatus: agentActionLog?.status ?? null,

        entityType: displayHit.memory.entityType,
        entityId: displayHit.memory.entityId,
        fieldPath: displayHit.memory.fieldPath,

        sourceRunId: displayHit.memory.sourceRunId,
        sourceReviewDecisionId: displayHit.memory.sourceReviewDecisionId,
        sourceCoverageQuestionId: displayHit.memory.sourceCoverageQuestionId,
        sourceAgentActionLogId: displayHit.memory.sourceAgentActionLogId,

        createdAt: displayHit.createdAt,
        retrievalCount: memoryHits.length,

        updates: displayHit.memory.updates.map((update) => ({
          id: update.id,
          updateType: update.updateType,
          beforeStatus: update.beforeStatus,
          afterStatus: update.afterStatus,
          confidenceDelta: update.confidenceDelta,
          note: update.note,
          metadata: update.metadata,
          createdAt: update.createdAt,
        })),
      };
    },
  );

  memories.sort((left, right) => {
    if (left.usedByAgent !== right.usedByAgent) {
      return left.usedByAgent ? -1 : 1;
    }

    const riskDiff = riskRank(right.riskLevel) - riskRank(left.riskLevel);

    if (riskDiff !== 0) {
      return riskDiff;
    }

    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });

  return {
    runId,
    memories,
    summary: {
      totalHits: memories.length,
      totalRetrievalEvents: hits.length,
      usedByAgentCount: memories.filter((item) => item.usedByAgent).length,
      highRiskCount: memories.filter((item) => item.riskLevel === "HIGH").length,
      latestRetrievedAt: hits[0]?.createdAt ?? null,
    },
  };
}