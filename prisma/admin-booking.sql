-- Admin-confirmed booking: decline reasons, lesson reminders, teacher hours (admin only).
-- Additive and safe to run more than once.
ALTER TABLE "SessionBookingRequest" ADD COLUMN IF NOT EXISTS "declineReason" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "reminder24SentAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "reminder1SentAt" TIMESTAMP(3);
CREATE TABLE IF NOT EXISTS "TeacherAdminHours" (
  "teacherId" TEXT NOT NULL,
  "hours" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherAdminHours_pkey" PRIMARY KEY ("teacherId"),
  CONSTRAINT "TeacherAdminHours_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
