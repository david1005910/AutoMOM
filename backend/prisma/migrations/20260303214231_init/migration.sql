-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'email',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "metAt" TIMESTAMP(3) NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'pending',
    "transcriptRaw" TEXT,
    "minutes" JSONB,
    "attendees" JSONB NOT NULL DEFAULT '[]',
    "agenda" TEXT,
    "fileKey" TEXT,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_shareToken_key" ON "Meeting"("shareToken");

-- CreateIndex
CREATE INDEX "Meeting_userId_createdAt_idx" ON "Meeting"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Meeting_shareToken_idx" ON "Meeting"("shareToken");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
