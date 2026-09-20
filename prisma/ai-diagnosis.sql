-- AI diagnosis: one table caching an AI-written summary per submitted quiz attempt.
-- Purely additive: 1 table + 1 foreign key, changes nothing existing.
-- Apply once (e.g. psql "$DATABASE_URL" -f prisma/ai-diagnosis.sql). Runs in one transaction.

BEGIN;

-- CreateTable
CREATE TABLE "AttemptDiagnosis" (
    "attemptId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptDiagnosis_pkey" PRIMARY KEY ("attemptId")
);

-- AddForeignKey
ALTER TABLE "AttemptDiagnosis" ADD CONSTRAINT "AttemptDiagnosis_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
