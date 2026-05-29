-- CreateEnum
CREATE TYPE "FollowupRequestType" AS ENUM ('EVIDENCE_REQUEST', 'FIELD_CLARIFICATION', 'MIXED_INFO_REQUEST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgentActionType" ADD VALUE 'MARK_NEEDS_MORE_INFO';
ALTER TYPE "AgentActionType" ADD VALUE 'DRAFT_INFORMATION_REQUEST';

-- AlterEnum
ALTER TYPE "ExtractionEventType" ADD VALUE 'ADDITIONAL_INFORMATION_RECEIVED';

-- AlterTable
ALTER TABLE "followup_drafts" ADD COLUMN     "fieldRequests" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "requestType" "FollowupRequestType" NOT NULL DEFAULT 'EVIDENCE_REQUEST',
ADD COLUMN     "requestedFields" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "followup_drafts_requestType_idx" ON "followup_drafts"("requestType");
