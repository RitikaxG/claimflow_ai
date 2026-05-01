-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('PDF', 'EMAIL_TEXT', 'IMAGE');

-- CreateEnum
CREATE TYPE "ExtractionRunStatus" AS ENUM ('UPLOADED', 'EXTRACTING', 'VALIDATING', 'COMPLETED', 'NEEDS_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "ExtractionEventType" AS ENUM ('DOCUMENT_UPLOADED', 'EXTRACTION_STARTED', 'MODEL_RESPONSE_RECEIVED', 'EXTRACTION_COMPLETED', 'VALIDATION_STARTED', 'VAIDATION_COMPLETED', 'MISSING_FIELDS_DETECTED', 'CONFLICTS_DETECTED', 'RUN_COMPLETED', 'RUN_NEEDS_REVIEW', 'RUN_FAILED');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT,
    "sourceType" "DocumentSourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_runs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "ExtractionRunStatus" NOT NULL DEFAULT 'UPLOADED',
    "model" TEXT,
    "promptVersion" TEXT,
    "rawModelOutput" JSONB,
    "extractedJson" JSONB,
    "validatedJson" JSONB,
    "missingFieldsJson" JSONB,
    "confidenceJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_events" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" "ExtractionEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extraction_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extraction_runs_documentId_idx" ON "extraction_runs"("documentId");

-- CreateIndex
CREATE INDEX "extraction_runs_status_idx" ON "extraction_runs"("status");

-- CreateIndex
CREATE INDEX "extraction_events_runId_idx" ON "extraction_events"("runId");

-- CreateIndex
CREATE INDEX "extraction_events_type_idx" ON "extraction_events"("type");

-- AddForeignKey
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_events" ADD CONSTRAINT "extraction_events_runId_fkey" FOREIGN KEY ("runId") REFERENCES "extraction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
