-- AlterTable
ALTER TABLE "extraction_runs" ADD COLUMN     "schemaVersion" TEXT NOT NULL DEFAULT 'auto_claim_v1';

-- CreateIndex
CREATE INDEX "extraction_runs_schemaVersion_idx" ON "extraction_runs"("schemaVersion");
