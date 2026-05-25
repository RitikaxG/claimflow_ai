-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExtractionEventType" ADD VALUE 'AGENT_STEP_STARTED';
ALTER TYPE "ExtractionEventType" ADD VALUE 'AGENT_ACTION_PROPOSED';
ALTER TYPE "ExtractionEventType" ADD VALUE 'AGENT_ACTION_BLOCKED';
ALTER TYPE "ExtractionEventType" ADD VALUE 'AGENT_TOOL_EXECUTED';
ALTER TYPE "ExtractionEventType" ADD VALUE 'FOLLOWUP_DRAFT_CREATED';
ALTER TYPE "ExtractionEventType" ADD VALUE 'ADDITIONAL_EVIDENCE_RECEIVED';
ALTER TYPE "ExtractionEventType" ADD VALUE 'REVIEW_REOPENED';

-- AlterTable
ALTER TABLE "agent_action_logs" ALTER COLUMN "guardrailDecision" DROP NOT NULL;
