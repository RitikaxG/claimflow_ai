-- CreateEnum
CREATE TYPE "EvalSuiteKind" AS ENUM ('WEEK1_EXTRACTION', 'WEEK2_REVIEW', 'WEEK3_RAG', 'WEEK4_AGENT', 'WEEK5_MEMORY', 'WEEK6_GATEWAY_OBSERVABILITY');

-- CreateEnum
CREATE TYPE "EvalCaseStatus" AS ENUM ('PASSED', 'FAILED', 'WARNING');

-- CreateTable
CREATE TABLE "eval_runs" (
    "id" TEXT NOT NULL,
    "suite" "EvalSuiteKind" NOT NULL,
    "label" TEXT,
    "totalCases" INTEGER NOT NULL,
    "passedCases" INTEGER NOT NULL,
    "failedCases" INTEGER NOT NULL,
    "warningCases" INTEGER NOT NULL,
    "passRate" DOUBLE PRECISION NOT NULL,
    "averageScore" DOUBLE PRECISION,
    "metricsJson" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_case_results" (
    "id" TEXT NOT NULL,
    "evalRunId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "EvalCaseStatus" NOT NULL,
    "score" DOUBLE PRECISION,
    "expectedJson" JSONB,
    "actualJson" JSONB,
    "failureReason" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_case_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eval_runs_suite_idx" ON "eval_runs"("suite");

-- CreateIndex
CREATE INDEX "eval_runs_createdAt_idx" ON "eval_runs"("createdAt");

-- CreateIndex
CREATE INDEX "eval_case_results_evalRunId_idx" ON "eval_case_results"("evalRunId");

-- CreateIndex
CREATE INDEX "eval_case_results_caseId_idx" ON "eval_case_results"("caseId");

-- CreateIndex
CREATE INDEX "eval_case_results_status_idx" ON "eval_case_results"("status");

-- AddForeignKey
ALTER TABLE "eval_case_results" ADD CONSTRAINT "eval_case_results_evalRunId_fkey" FOREIGN KEY ("evalRunId") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
