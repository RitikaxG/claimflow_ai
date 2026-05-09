/*
  Warnings:

  - The values [REQUEST_MODE_INFO] on the enum `ReviewDecisionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReviewDecisionType_new" AS ENUM ('APPROVE_AS_IS', 'EDIT_AND_APPROVE', 'REJECT', 'REQUEST_MORE_INFO');
ALTER TABLE "review_decisions" ALTER COLUMN "decision" TYPE "ReviewDecisionType_new" USING ("decision"::text::"ReviewDecisionType_new");
ALTER TYPE "ReviewDecisionType" RENAME TO "ReviewDecisionType_old";
ALTER TYPE "ReviewDecisionType_new" RENAME TO "ReviewDecisionType";
DROP TYPE "public"."ReviewDecisionType_old";
COMMIT;
