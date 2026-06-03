-- CreateEnum
CREATE TYPE "WorkflowMemoryKind" AS ENUM ('HUMAN_CORRECTION', 'PRIOR_REJECTION', 'PRIOR_REVIEW_DECISION', 'CLAIMANT_PATTERN', 'VENDOR_PATTERN', 'POLICY_HISTORY', 'RECURRING_ERROR_PATTERN');

-- CreateEnum
CREATE TYPE "WorkflowMemoryStatus" AS ENUM ('ACTIVE', 'STRENGTHENED', 'WEAKENED', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "WorkflowMemoryRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MemoryUpdateType" AS ENUM ('CREATED', 'STRENGTHENED', 'WEAKENED', 'SUPERSEDED', 'RETIRED', 'FEEDBACK_RECORDED', 'GENERALIZED');

-- CreateTable
CREATE TABLE "workflow_memories" (
    "id" TEXT NOT NULL,
    "kind" "WorkflowMemoryKind" NOT NULL,
    "status" "WorkflowMemoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "riskLevel" "WorkflowMemoryRiskLevel" NOT NULL DEFAULT 'LOW',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "summary" TEXT NOT NULL,
    "safeUse" TEXT NOT NULL,
    "mustNotDo" JSONB NOT NULL DEFAULT '[]',
    "entityType" TEXT,
    "entityId" TEXT,
    "fieldPath" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "evidenceJson" JSONB,
    "sourceRunId" TEXT,
    "sourceReviewDecisionId" TEXT,
    "sourceCoverageQuestionId" TEXT,
    "sourceAgentActionLogId" TEXT,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "contradictedCount" INTEGER NOT NULL DEFAULT 0,
    "supersededByMemoryId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_hits" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "matchedOn" JSONB NOT NULL DEFAULT '[]',
    "retrievalReason" TEXT,
    "usedByAgent" BOOLEAN NOT NULL DEFAULT false,
    "agentActionLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_hits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_updates" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "updateType" "MemoryUpdateType" NOT NULL,
    "runId" TEXT,
    "reviewDecisionId" TEXT,
    "beforeStatus" "WorkflowMemoryStatus",
    "afterStatus" "WorkflowMemoryStatus",
    "confidenceDelta" DOUBLE PRECISION,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_memories_kind_idx" ON "workflow_memories"("kind");

-- CreateIndex
CREATE INDEX "workflow_memories_status_idx" ON "workflow_memories"("status");

-- CreateIndex
CREATE INDEX "workflow_memories_riskLevel_idx" ON "workflow_memories"("riskLevel");

-- CreateIndex
CREATE INDEX "workflow_memories_entityType_entityId_idx" ON "workflow_memories"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "workflow_memories_fieldPath_idx" ON "workflow_memories"("fieldPath");

-- CreateIndex
CREATE INDEX "workflow_memories_sourceRunId_idx" ON "workflow_memories"("sourceRunId");

-- CreateIndex
CREATE INDEX "workflow_memories_sourceReviewDecisionId_idx" ON "workflow_memories"("sourceReviewDecisionId");

-- CreateIndex
CREATE INDEX "workflow_memories_status_kind_idx" ON "workflow_memories"("status", "kind");

-- CreateIndex
CREATE INDEX "workflow_memories_status_entityType_entityId_idx" ON "workflow_memories"("status", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "memory_hits_memoryId_idx" ON "memory_hits"("memoryId");

-- CreateIndex
CREATE INDEX "memory_hits_runId_idx" ON "memory_hits"("runId");

-- CreateIndex
CREATE INDEX "memory_hits_score_idx" ON "memory_hits"("score");

-- CreateIndex
CREATE INDEX "memory_hits_usedByAgent_idx" ON "memory_hits"("usedByAgent");

-- CreateIndex
CREATE INDEX "memory_hits_agentActionLogId_idx" ON "memory_hits"("agentActionLogId");

-- CreateIndex
CREATE INDEX "memory_updates_memoryId_idx" ON "memory_updates"("memoryId");

-- CreateIndex
CREATE INDEX "memory_updates_updateType_idx" ON "memory_updates"("updateType");

-- CreateIndex
CREATE INDEX "memory_updates_runId_idx" ON "memory_updates"("runId");

-- CreateIndex
CREATE INDEX "memory_updates_reviewDecisionId_idx" ON "memory_updates"("reviewDecisionId");

-- CreateIndex
CREATE INDEX "memory_updates_createdAt_idx" ON "memory_updates"("createdAt");

-- AddForeignKey
ALTER TABLE "workflow_memories" ADD CONSTRAINT "workflow_memories_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "extraction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_memories" ADD CONSTRAINT "workflow_memories_sourceReviewDecisionId_fkey" FOREIGN KEY ("sourceReviewDecisionId") REFERENCES "review_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_memories" ADD CONSTRAINT "workflow_memories_supersededByMemoryId_fkey" FOREIGN KEY ("supersededByMemoryId") REFERENCES "workflow_memories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_hits" ADD CONSTRAINT "memory_hits_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "workflow_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_hits" ADD CONSTRAINT "memory_hits_runId_fkey" FOREIGN KEY ("runId") REFERENCES "extraction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_hits" ADD CONSTRAINT "memory_hits_agentActionLogId_fkey" FOREIGN KEY ("agentActionLogId") REFERENCES "agent_action_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_updates" ADD CONSTRAINT "memory_updates_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "workflow_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_updates" ADD CONSTRAINT "memory_updates_runId_fkey" FOREIGN KEY ("runId") REFERENCES "extraction_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_updates" ADD CONSTRAINT "memory_updates_reviewDecisionId_fkey" FOREIGN KEY ("reviewDecisionId") REFERENCES "review_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
