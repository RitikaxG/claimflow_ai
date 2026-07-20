import { prisma } from "@repo/db";
import { createMemoryFromReviewDecision } from "./create-memory-from-review-decision";

export type BackfillCompletedReviewMemoriesResult = {
  completedReviewCount: number;
  alreadyCoveredCount: number;
  processedCount: number;
  createdCount: number;
  skippedCount: number;
};

export async function backfillCompletedReviewMemories(): Promise<BackfillCompletedReviewMemoriesResult> {
  const decisions = await prisma.reviewDecision.findMany({
    where: {
      decision: {
        in: ["APPROVE_AS_IS", "EDIT_AND_APPROVE", "REJECT"],
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const existingWorkflowMemories = await prisma.workflowMemory.findMany({
    where: {
      sourceReviewDecisionId: {
        in: decisions.map((decision) => decision.id),
      },
      kind: "PRIOR_REVIEW_DECISION",
      entityType: "WORKFLOW",
    },
    select: {
      sourceReviewDecisionId: true,
    },
  });

  const coveredDecisionIds = new Set(
    existingWorkflowMemories
      .map((memory) => memory.sourceReviewDecisionId)
      .filter((id): id is string => Boolean(id)),
  );

  let createdCount = 0;
  let skippedCount = 0;
  let processedCount = 0;

  for (const decision of decisions) {
    // Processing is intentionally idempotent. Existing deterministic memories
    // are refreshed so older approved claims receive the latest safe workflow
    // profile tags; lifecycle state and reviewer feedback remain unchanged.
    const result = await createMemoryFromReviewDecision({
      reviewDecisionId: decision.id,
    });

    processedCount += 1;
    createdCount += result.createdCount;
    skippedCount += result.skippedCount;
  }

  return {
    completedReviewCount: decisions.length,
    alreadyCoveredCount: coveredDecisionIds.size,
    processedCount,
    createdCount,
    skippedCount,
  };
}
