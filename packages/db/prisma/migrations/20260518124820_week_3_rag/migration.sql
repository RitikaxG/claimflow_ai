CREATE EXTENSION IF NOT EXISTS vector;
-- CreateEnum
CREATE TYPE "PolicySourceType" AS ENUM ('SYNTHETIC_MARKDOWN', 'PUBLIC_PDF', 'PUBLIC_WEB', 'TEXT');

-- CreateEnum
CREATE TYPE "CoverageDecision" AS ENUM ('COVERED', 'NOT_COVERED', 'PARTIALLY_COVERED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "RetrievalStatus" AS ENUM ('ENOUGH_EVIDENCE', 'INSUFFICIENT_EVIDENCE');

-- CreateTable
CREATE TABLE "policy_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "insurerName" TEXT,
    "productType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sourcePath" TEXT,
    "sourceType" "PolicySourceType" NOT NULL DEFAULT 'SYNTHETIC_MARKDOWN',
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_chunks" (
    "id" TEXT NOT NULL,
    "policyDocumentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "sectionTitle" TEXT,
    "clauseId" TEXT,
    "pageNumber" INTEGER,
    "text" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_questions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "normalizedQuery" TEXT,
    "retrievalStatus" "RetrievalStatus",
    "retrievalJson" JSONB,
    "answerJson" JSONB,
    "finalDecision" "CoverageDecision" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "policy_documents_productType_idx" ON "policy_documents"("productType");

-- CreateIndex
CREATE INDEX "policy_documents_version_idx" ON "policy_documents"("version");

-- CreateIndex
CREATE INDEX "policy_documents_sourceType_idx" ON "policy_documents"("sourceType");

-- CreateIndex
CREATE INDEX "policy_documents_contentHash_idx" ON "policy_documents"("contentHash");

-- CreateIndex
CREATE INDEX "policy_chunks_policyDocumentId_idx" ON "policy_chunks"("policyDocumentId");

-- CreateIndex
CREATE INDEX "policy_chunks_clauseId_idx" ON "policy_chunks"("clauseId");

-- CreateIndex
CREATE UNIQUE INDEX "policy_chunks_policyDocumentId_chunkIndex_key" ON "policy_chunks"("policyDocumentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "coverage_questions_runId_idx" ON "coverage_questions"("runId");

-- CreateIndex
CREATE INDEX "coverage_questions_finalDecision_idx" ON "coverage_questions"("finalDecision");

-- CreateIndex
CREATE INDEX "coverage_questions_retrievalStatus_idx" ON "coverage_questions"("retrievalStatus");

-- AddForeignKey
ALTER TABLE "policy_chunks" ADD CONSTRAINT "policy_chunks_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "policy_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_questions" ADD CONSTRAINT "coverage_questions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "extraction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
