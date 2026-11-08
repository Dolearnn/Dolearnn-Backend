-- "Fix my mistakes" quizzes are kept out of score trends.
-- Additive and safe to run more than once.
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "isReview" BOOLEAN NOT NULL DEFAULT false;
