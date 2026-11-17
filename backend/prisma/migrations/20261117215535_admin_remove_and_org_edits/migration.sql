-- AlterEnum
ALTER TYPE "PublishStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "editedInAppAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedFromStatus" "PublishStatus";
