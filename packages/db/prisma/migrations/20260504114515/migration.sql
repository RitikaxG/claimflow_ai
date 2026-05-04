/*
  Warnings:

  - The values [VAIDATION_COMPLETED] on the enum `ExtractionEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `validatedJson` on the `extraction_runs` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExtractionEventType_new" AS ENUM ('DOCUMENT_UPLOADED', 'EXTRACTION_STARTED', 'MODEL_RESPONSE_RECEIVED', 'EXTRACTION_COMPLETED', 'VALIDATION_STARTED', 'VALIDATION_COMPLETED', 'MISSING_FIELDS_DETECTED', 'CONFLICTS_DETECTED', 'RUN_COMPLETED', 'RUN_NEEDS_REVIEW', 'RUN_FAILED');
ALTER TABLE "extraction_events" ALTER COLUMN "type" TYPE "ExtractionEventType_new" USING ("type"::text::"ExtractionEventType_new");
ALTER TYPE "ExtractionEventType" RENAME TO "ExtractionEventType_old";
ALTER TYPE "ExtractionEventType_new" RENAME TO "ExtractionEventType";
DROP TYPE "public"."ExtractionEventType_old";
COMMIT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "contentText" TEXT;

-- AlterTable
ALTER TABLE "extraction_runs" DROP COLUMN "validatedJson",
ADD COLUMN     "validationJson" JSONB;
