/*
 * Adds the foreign-key / filter indexes declared in schema.prisma to the live
 * database without locking tables (CREATE INDEX CONCURRENTLY).
 *
 * Safe to run repeatedly: every statement is IF NOT EXISTS.
 * Index names match Prisma's naming convention so `prisma db push` / introspection
 * will not report drift.
 *
 *   node scripts/add-indexes.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const statements = [
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Student_parentId_idx" ON "Student"("parentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Student_assignedTeacherId_idx" ON "Student"("assignedTeacherId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionBookingRequest_parentId_idx" ON "SessionBookingRequest"("parentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionBookingRequest_studentId_idx" ON "SessionBookingRequest"("studentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionBookingRequest_status_idx" ON "SessionBookingRequest"("status")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "StudentLessonPackage_parentId_idx" ON "StudentLessonPackage"("parentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "StudentLessonPackage_studentId_idx" ON "StudentLessonPackage"("studentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Goal_studentId_idx" ON "Goal"("studentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionProposal_studentId_idx" ON "SessionProposal"("studentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionProposal_teacherId_idx" ON "SessionProposal"("teacherId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionProposal_status_idx" ON "SessionProposal"("status")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_studentId_startsAt_idx" ON "Session"("studentId", "startsAt")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_teacherId_startsAt_idx" ON "Session"("teacherId", "startsAt")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_lessonPackageId_idx" ON "Session"("lessonPackageId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Session_status_startsAt_idx" ON "Session"("status", "startsAt")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "CancellationRequest_sessionId_idx" ON "CancellationRequest"("sessionId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "CancellationRequest_status_idx" ON "CancellationRequest"("status")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionNote_teacherId_idx" ON "SessionNote"("teacherId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Payment_parentId_createdAt_idx" ON "Payment"("parentId", "createdAt")',
];

(async () => {
  for (const sql of statements) {
    const name = sql.match(/"([A-Za-z_]+_idx)"/)[1];
    process.stdout.write(`  ${name} ... `);
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('ok');
    } catch (error) {
      console.log(`FAILED: ${error.message}`);
    }
  }
  await prisma.$disconnect();
})();
