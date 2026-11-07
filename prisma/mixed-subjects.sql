-- Mixed-subject exams: a quiz attempt can cover several subjects.
-- Additive and safe to run more than once.
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "subjectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
