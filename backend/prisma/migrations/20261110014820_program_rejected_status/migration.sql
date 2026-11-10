-- AlterEnum
ALTER TYPE "PublishStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;
