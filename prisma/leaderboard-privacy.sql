-- Leaderboard privacy: lets a learner (or a parent, for a child) hide their name
-- from the weekly leaderboard. Hidden learners are still ranked, shown as
-- "Hidden learner" to everyone else.
-- Purely additive: two boolean columns defaulting to false; no existing data changes.
-- Apply once: npx prisma db execute --file prisma/leaderboard-privacy.sql --schema prisma/schema.prisma

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hideFromLeaderboard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "hideFromLeaderboard" BOOLEAN NOT NULL DEFAULT false;
