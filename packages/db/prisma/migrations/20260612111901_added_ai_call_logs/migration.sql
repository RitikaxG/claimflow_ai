-- CreateEnum
CREATE TYPE "AiCallKind" AS ENUM ('EXTRACTION', 'VALIDATION_ASSIST', 'RAG_QUERY_REWRITE', 'RAG_ANSWER', 'AGENT_PLANNER', 'MEMORY_WRITER', 'MEMORY_SUMMARIZER', 'EVAL_JUDGE', 'SYNTHETIC_GATEWAY_TEST');

-- CreateEnum
CREATE TYPE "AiCallStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'RETRYABLE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AiGatewayFailureType" AS ENUM ('MODEL_TIMEOUT', 'INVALID_JSON_RESPONSE', 'PROVIDER_ERROR', 'COST_LIMIT_EXCEEDED', 'LATENCY_SPIKE', 'PROMPT_VERSION_REGRESSION', 'EVAL_SCORE_DROPPED', 'MISSING_TRACE_ID', 'MISSING_MODEL_VERSION', 'UNKNOWN');

-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "runId" TEXT,
    "kind" "AiCallKind" NOT NULL,
    "status" "AiCallStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelVersion" TEXT,
    "promptVersion" TEXT,
    "schemaVersion" TEXT,
    "inputJson" JSONB,
    "outputJson" JSONB,
    "parsedOutputJson" JSONB,
    "errorType" "AiGatewayFailureType",
    "errorMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCostUsd" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_call_logs_traceId_idx" ON "ai_call_logs"("traceId");

-- CreateIndex
CREATE INDEX "ai_call_logs_runId_idx" ON "ai_call_logs"("runId");

-- CreateIndex
CREATE INDEX "ai_call_logs_kind_idx" ON "ai_call_logs"("kind");

-- CreateIndex
CREATE INDEX "ai_call_logs_status_idx" ON "ai_call_logs"("status");

-- CreateIndex
CREATE INDEX "ai_call_logs_errorType_idx" ON "ai_call_logs"("errorType");

-- CreateIndex
CREATE INDEX "ai_call_logs_createdAt_idx" ON "ai_call_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "extraction_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
