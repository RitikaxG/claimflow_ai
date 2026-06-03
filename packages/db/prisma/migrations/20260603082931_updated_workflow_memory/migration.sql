-- DropForeignKey
ALTER TABLE "workflow_memories" DROP CONSTRAINT "workflow_memories_sourceReviewDecisionId_fkey";

-- DropForeignKey
ALTER TABLE "workflow_memories" DROP CONSTRAINT "workflow_memories_sourceRunId_fkey";

-- AddForeignKey
ALTER TABLE "workflow_memories" ADD CONSTRAINT "workflow_memories_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "extraction_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_memories" ADD CONSTRAINT "workflow_memories_sourceReviewDecisionId_fkey" FOREIGN KEY ("sourceReviewDecisionId") REFERENCES "review_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
