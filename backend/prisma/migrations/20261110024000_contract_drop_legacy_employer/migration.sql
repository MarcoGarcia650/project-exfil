-- CONTRACT step of expand → backfill → switch → contract.
-- Drops the legacy Employer table and SavedEmployer.employerId, and makes
-- SavedEmployer.programId required. Destructive: take an RDS snapshot first.
-- Guard: refuse if any saved row was never moved onto a Program.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SavedEmployer" WHERE "programId" IS NULL) THEN
    RAISE EXCEPTION 'contract aborted: SavedEmployer rows without programId exist';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "SavedEmployer" DROP CONSTRAINT "SavedEmployer_employerId_fkey";

-- DropForeignKey
ALTER TABLE "SavedEmployer" DROP CONSTRAINT "SavedEmployer_programId_fkey";

-- DropIndex
DROP INDEX "SavedEmployer_userId_employerId_key";

-- AlterTable
ALTER TABLE "SavedEmployer" DROP COLUMN "employerId",
ALTER COLUMN "programId" SET NOT NULL;

-- DropTable
DROP TABLE "Employer";

-- DropEnum
DROP TYPE "ProgramType";

-- AddForeignKey
ALTER TABLE "SavedEmployer" ADD CONSTRAINT "SavedEmployer_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

