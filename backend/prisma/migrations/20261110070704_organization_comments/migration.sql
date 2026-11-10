-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "organizationId" TEXT,
ALTER COLUMN "programId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Comment_organizationId_parentId_createdAt_id_idx" ON "Comment"("organizationId", "parentId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Exactly one target per comment: a program listing OR an organization.
-- Every existing row has programId set, so this holds for current data.
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_exactly_one_target"
  CHECK (num_nonnulls("programId", "organizationId") = 1);
