// packages/memory/update/update-memory-from-agent-outcome.ts

import { prisma } from "@repo/db";
import { applyMemoryConfidenceUpdate } from "./apply-memory-confidence-update";

export type UpdateMemoryFromAgentOutcomeInput = {
  runId: string;
  agentActionLogId?: string;
};

export async function updateMemoryFromAgentOutcome(
  input: UpdateMemoryFromAgentOutcomeInput,
) {
  const hits = await prisma.memoryHit.findMany({
    where: {
      runId: input.runId,
      usedByAgent: true,
      ...(input.agentActionLogId
        ? { agentActionLogId: input.agentActionLogId }
        : {}),
    },
    include: {
      memory: true,
      agentActionLog: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const updatedMemoryIds: string[] = [];

  for (const hit of hits) {
    const result = await applyMemoryConfidenceUpdate({
      memoryId: hit.memoryId,
      updateType: "FEEDBACK_RECORDED",
      runId: input.runId,
      confidenceDelta: 0,
      note:
        "Memory was used by the agent. Confidence is unchanged until reviewer outcome confirms or contradicts relevance.",
      metadata: {
        memoryHitId: hit.id,
        agentActionLogId: hit.agentActionLogId,
        action: hit.agentActionLog?.action ?? null,
        actionStatus: hit.agentActionLog?.status ?? null,
        score: hit.score,
        matchedOn: hit.matchedOn,
      },
    });

    if (result.changed) {
      updatedMemoryIds.push(hit.memoryId);
    }
  }

  return {
    runId: input.runId,
    agentActionLogId: input.agentActionLogId ?? null,
    feedbackRecorded: updatedMemoryIds.length,
    updatedMemoryIds,
  };
}