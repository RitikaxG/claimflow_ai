-- CreateEnum
CREATE TYPE "AgentActionType" AS ENUM ('RETRIEVE_POLICY_CLAUSES', 'CREATE_REVIEW_TASK', 'REQUEST_MISSING_DOCUMENT', 'MARK_NEEDS_MORE_EVIDENCE', 'DRAFT_FOLLOWUP_REQUEST', 'DRAFT_APPROVAL_NOTE', 'DRAFT_DENIAL_REASON', 'ESCALATE_TO_HUMAN', 'ASK_CLARIFICATION', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "AgentActionStatus" AS ENUM ('PROPOSED', 'EXECUTED', 'BLOCKED', 'FAILED');

-- CreateEnum
CREATE TYPE "GuardrailDecision" AS ENUM ('ALLOWED', 'BLOCKED');

-- CreateTable
CREATE TABLE "agent_action_logs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "action" "AgentActionType" NOT NULL,
    "status" "AgentActionStatus" NOT NULL,
    "rationale" TEXT,
    "guardrailDecision" "GuardrailDecision" NOT NULL,
    "blockedReason" TEXT,
    "toolName" TEXT,
    "toolInputJson" JSONB,
    "toolOutputJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_drafts" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "requestedEvidence" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "followup_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_action_logs_runId_idx" ON "agent_action_logs"("runId");

-- CreateIndex
CREATE INDEX "agent_action_logs_action_idx" ON "agent_action_logs"("action");

-- CreateIndex
CREATE INDEX "agent_action_logs_status_idx" ON "agent_action_logs"("status");

-- CreateIndex
CREATE INDEX "followup_drafts_runId_idx" ON "followup_drafts"("runId");

-- AddForeignKey
ALTER TABLE "agent_action_logs" ADD CONSTRAINT "agent_action_logs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "extraction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_drafts" ADD CONSTRAINT "followup_drafts_runId_fkey" FOREIGN KEY ("runId") REFERENCES "extraction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
