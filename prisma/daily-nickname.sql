-- Daily leaderboard nicknames: learners appear under a nickname they choose,
-- never their real name. No two learners can share one, ignoring capitals.
-- Purely additive: one optional column and an index; no existing data changes.
-- Apply once: npx prisma db execute --file prisma/daily-nickname.sql --schema prisma/schema.prisma

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_nickname_lower_key" ON "User" (lower("nickname"));
