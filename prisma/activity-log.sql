-- Widen the admin audit trail into a log of everything users do on the platform.
-- action / entityType become plain text so new kinds of activity need no
-- migration; the actor becomes optional (visitors, failed sign-ins); each entry
-- gains a category, an outcome, and the IP address and device it came from.
-- Existing rows are kept.
-- Apply once: npx prisma db execute --file prisma/activity-log.sql --schema prisma/schema.prisma

ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE TEXT USING "action"::text;
ALTER TABLE "AuditLog" ALTER COLUMN "entityType" TYPE TEXT USING "entityType"::text;
DROP TYPE IF EXISTS "AuditAction";
DROP TYPE IF EXISTS "AuditEntityType";

ALTER TABLE "AuditLog" ALTER COLUMN "actorUserId" DROP NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "actorRole" DROP NOT NULL;

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "outcome" TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

UPDATE "AuditLog" SET "category" = 'TUTORING'
WHERE "action" IN ('FAMILY_ATTENDANCE_CONFIRMED', 'TEACHER_ATTENDANCE_CONFIRMED');

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");
