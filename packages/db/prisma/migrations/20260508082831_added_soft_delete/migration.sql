-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExtractionEventType" ADD VALUE 'DOCUMENT_SOFT_DELETED';
ALTER TYPE "ExtractionEventType" ADD VALUE 'DOCUMENT_RESTORED';
ALTER TYPE "ExtractionEventType" ADD VALUE 'DUPLICATE_UPLOAD_DETECTED';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedReason" TEXT;

-- CreateIndex
CREATE INDEX "documents_contentHash_idx" ON "documents"("contentHash");

-- CreateIndex
CREATE INDEX "documents_sourceType_contentHash_idx" ON "documents"("sourceType", "contentHash");

-- CreateIndex
CREATE INDEX "documents_deletedAt_idx" ON "documents"("deletedAt");
