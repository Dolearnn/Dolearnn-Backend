-- Grade levels for the WAEC/UTME target group (SS1-SS3 and recent school leavers).
-- Purely additive: adds 4 values to the "GradeLevel" enum and changes no rows.
-- Apply once: psql "$DATABASE_URL" -f prisma/grade-levels.sql
--   (or: npx prisma db execute --file prisma/grade-levels.sql --schema prisma/schema.prisma)
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block on older Postgres,
-- so there is no BEGIN/COMMIT here.

ALTER TYPE "GradeLevel" ADD VALUE IF NOT EXISTS 'SS1' BEFORE 'PRIMARY';
ALTER TYPE "GradeLevel" ADD VALUE IF NOT EXISTS 'SS2' BEFORE 'PRIMARY';
ALTER TYPE "GradeLevel" ADD VALUE IF NOT EXISTS 'SS3' BEFORE 'PRIMARY';
ALTER TYPE "GradeLevel" ADD VALUE IF NOT EXISTS 'SCHOOL_LEAVER' BEFORE 'PRIMARY';
