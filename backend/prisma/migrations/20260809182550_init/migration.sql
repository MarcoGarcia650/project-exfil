-- CreateEnum
CREATE TYPE "Branch" AS ENUM ('ARMY', 'NAVY', 'AIR_FORCE', 'MARINES', 'COAST_GUARD', 'SPACE_FORCE', 'MILITARY_SPOUSE');

-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('INTERNSHIP_PIPELINE', 'DIRECT_HIRE', 'APPRENTICESHIP', 'FELLOWSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('RESEARCHING', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "branch" "Branch" NOT NULL,
    "targetField" TEXT,
    "separationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "programType" "ProgramType" NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibilityNotes" TEXT NOT NULL,
    "industryTags" TEXT[],
    "locations" TEXT[],
    "applicationWindow" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedEmployer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "notes" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedEmployer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "savedEmployerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_name_key" ON "Employer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SavedEmployer_userId_employerId_key" ON "SavedEmployer"("userId", "employerId");

-- AddForeignKey
ALTER TABLE "SavedEmployer" ADD CONSTRAINT "SavedEmployer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedEmployer" ADD CONSTRAINT "SavedEmployer_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_savedEmployerId_fkey" FOREIGN KEY ("savedEmployerId") REFERENCES "SavedEmployer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
