-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "awaitingResearch" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: the only DRAFT built by the legacy backfill rather than from
-- SOURCE_VERIFIED research (see prisma/migrate-legacy-employers.js).
-- Matches nothing if that row doesn't exist or has since been re-imported
-- (a re-import with changed content would no longer be a legacy draft, but
-- the flag is cleared by the importer in that case anyway).
UPDATE "Program" SET "awaitingResearch" = true
WHERE "slug" = 'oracle-ovip' AND "publishStatus" = 'DRAFT';
