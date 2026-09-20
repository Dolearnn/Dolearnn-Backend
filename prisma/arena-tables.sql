-- Arena (async 1v1 battles) tables. Generated with `prisma migrate diff` against the previous schema.
-- Purely additive: creates 2 tables + indexes + foreign keys, changes nothing existing.
-- Apply once (e.g. psql "$DATABASE_URL" -f prisma/arena-tables.sql). Runs in one transaction.

BEGIN;

-- CreateTable
CREATE TABLE "ArenaChallenge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examId" TEXT,
    "questionIds" TEXT[],
    "totalQuestions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaEntry" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "playerName" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArenaChallenge_code_key" ON "ArenaChallenge"("code");

-- CreateIndex
CREATE INDEX "ArenaChallenge_createdByUserId_createdAt_idx" ON "ArenaChallenge"("createdByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaEntry_attemptId_key" ON "ArenaEntry"("attemptId");

-- CreateIndex
CREATE INDEX "ArenaEntry_userId_joinedAt_idx" ON "ArenaEntry"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaEntry_challengeId_slot_key" ON "ArenaEntry"("challengeId", "slot");

-- AddForeignKey
ALTER TABLE "ArenaChallenge" ADD CONSTRAINT "ArenaChallenge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaChallenge" ADD CONSTRAINT "ArenaChallenge_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaChallenge" ADD CONSTRAINT "ArenaChallenge_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaEntry" ADD CONSTRAINT "ArenaEntry_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "ArenaChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaEntry" ADD CONSTRAINT "ArenaEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaEntry" ADD CONSTRAINT "ArenaEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaEntry" ADD CONSTRAINT "ArenaEntry_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
