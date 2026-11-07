-- One account per learner: each learner account gets a single tutoring profile
-- (a "Student" row) created automatically, instead of parents adding child
-- profiles. The learner's age is not asked at sign-up, so it becomes optional.
-- Additive/relaxing only: no data changes.
-- Apply once: npx prisma db execute --file prisma/single-account.sql --schema prisma/schema.prisma

ALTER TABLE "Student" ALTER COLUMN "age" DROP NOT NULL;
