-- CreateEnum
CREATE TYPE "ReviewTaskStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'EDITED_AND_APPROVED', 'REJECTED', 'NEEDS_MORE_INFO');

-- CreateEnum
CREATE TYPE "ReviewPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "ReviewDecisionType" AS ENUM ('APPROVE_AS_IS', 'EDIT_AND_APPROVE', 'REJECT', 'REQUEST_MODE_INFO');

-- CreateEnum
CREATE TYPE "ReviewEventType" AS ENUM ('REVIEW_TASK_CREATED', 'REVIEW_STARTED', 'REVIEW_APPROVED_AS_IS', 'REVIEW_EDITED_AND_APPROVED', 'REVIEW_REJECTED', 'REVIEW_MORE_INFO_REQUESTED');

-- CreateTable
CREATE TABLE "review_tasks" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "status" "ReviewTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ReviewPriority" NOT NULL DEFAULT 'NORMAL',
    "reasonJson" JSONB NOT NULL,
    "assignedTo" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_decisions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "decision" "ReviewDecisionType" NOT NULL,
    "correctedJson" JSONB,
    "notes" TEXT,
    "reviewerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_events" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "ReviewEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_tasks_runId_key" ON "review_tasks"("runId");

-- CreateIndex
CREATE INDEX "review_tasks_status_idx" ON "review_tasks"("status");

-- CreateIndex
CREATE INDEX "review_tasks_priority_idx" ON "review_tasks"("priority");

-- CreateIndex
CREATE INDEX "review_tasks_createdAt_idx" ON "review_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "review_decisions_taskId_idx" ON "review_decisions"("taskId");

-- CreateIndex
CREATE INDEX "review_decisions_decision_idx" ON "review_decisions"("decision");

-- CreateIndex
CREATE INDEX "review_events_taskId_idx" ON "review_events"("taskId");

-- CreateIndex
CREATE INDEX "review_events_type_idx" ON "review_events"("type");

-- AddForeignKey
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_runId_fkey" FOREIGN KEY ("runId") REFERENCES "extraction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "review_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "review_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
