import {
  createMemoryFromReviewDecision,
  updateMemoryFromReviewOutcome,
} from "@repo/memory";

export async function learnFromReviewDecision(reviewDecisionId: string) {
  const memoryWrite = await createMemoryFromReviewDecision({
    reviewDecisionId,
  });

  const memoryUpdate = await updateMemoryFromReviewOutcome({
    reviewDecisionId,
    createdMemoryIds: memoryWrite.memoryIds,
  });

  return {
    memoryWrite,
    memoryUpdate,
  };
}