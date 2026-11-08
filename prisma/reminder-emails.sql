-- Reminder emails: let learners opt out, and remember when we last wrote.
-- Additive and safe to run more than once.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailRemindersOff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
