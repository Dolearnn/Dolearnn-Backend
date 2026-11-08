-- The DoLearnn Daily. Additive and safe to run more than once.
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "isDaily" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "DailyQuestion" (
  "id" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "correctOptionId" TEXT NOT NULL,
  "explanation" TEXT,
  "usedOn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyQuestion_sourceKey_key" ON "DailyQuestion"("sourceKey");
CREATE INDEX IF NOT EXISTS "DailyQuestion_category_usedOn_idx" ON "DailyQuestion"("category", "usedOn");

CREATE TABLE IF NOT EXISTS "DailyQuiz" (
  "id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "questionIds" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyQuiz_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyQuiz_day_key" ON "DailyQuiz"("day");

CREATE TABLE IF NOT EXISTS "DailyEntry" (
  "id" TEXT NOT NULL,
  "dailyQuizId" TEXT NOT NULL,
  "userId" TEXT,
  "guestKey" TEXT,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "questionIndex" INTEGER NOT NULL DEFAULT 0,
  "questionStartedAt" TIMESTAMP(3) NOT NULL,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "totalMs" INTEGER NOT NULL DEFAULT 0,
  "flagged" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DailyEntry_dailyQuizId_fkey" FOREIGN KEY ("dailyQuizId") REFERENCES "DailyQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyEntry_dailyQuizId_userId_key" ON "DailyEntry"("dailyQuizId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyEntry_dailyQuizId_guestKey_key" ON "DailyEntry"("dailyQuizId", "guestKey");
CREATE INDEX IF NOT EXISTS "DailyEntry_userId_idx" ON "DailyEntry"("userId");

CREATE TABLE IF NOT EXISTS "QuestionReport" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "userId" TEXT,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "QuestionReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuestionReport_status_createdAt_idx" ON "QuestionReport"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "QuestionReport_kind_questionId_idx" ON "QuestionReport"("kind", "questionId");
