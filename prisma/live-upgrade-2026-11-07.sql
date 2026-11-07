-- Run ONCE on the live database BEFORE deploying the strategy-alignment backend
-- (paste into the Neon SQL Editor). Every statement is additive or relaxing and
-- safe to re-run; no existing data is changed. Combines:
--   prisma/grade-levels.sql, prisma/leaderboard-privacy.sql, prisma/single-account.sql

-- 1. Grade levels for SS1-SS3 and school leavers.
ALTER TYPE "GradeLevel" ADD VALUE IF NOT EXISTS 'SS1' BEFORE 'PRIMARY';
ALTER TYPE "GradeLevel" ADD VALUE IF NOT EXISTS 'SS2' BEFORE 'PRIMARY';
ALTER TYPE "GradeLevel" ADD VALUE IF NOT EXISTS 'SS3' BEFORE 'PRIMARY';
ALTER TYPE "GradeLevel" ADD VALUE IF NOT EXISTS 'SCHOOL_LEAVER' BEFORE 'PRIMARY';

-- 2. Leaderboard "hide my name".
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hideFromLeaderboard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "hideFromLeaderboard" BOOLEAN NOT NULL DEFAULT false;

-- 3. One account per learner: a learner's tutoring profile has no age at first.
ALTER TABLE "Student" ALTER COLUMN "age" DROP NOT NULL;

-- Check (should return 2 rows, then 1 row with is_nullable = YES):
SELECT table_name, column_name FROM information_schema.columns
 WHERE column_name = 'hideFromLeaderboard' AND table_name IN ('User', 'Student');
SELECT is_nullable FROM information_schema.columns
 WHERE table_name = 'Student' AND column_name = 'age';
