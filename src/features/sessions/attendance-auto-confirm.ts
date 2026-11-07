import { AuditAction, AuditEntityType, CancellationStatus, Role, SessionStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../audit/audit.service';
import { createAdminNotifications, createNotification } from '../notifications/notification.service';

/*
 * A lesson counts once both the tutor and the learner confirm it. Learners
 * often forget to confirm, which would leave tutors unpaid, so: once the tutor
 * has confirmed and 24 hours have passed since the lesson ended without the
 * learner responding (and no cancellation request is open), DoLearn confirms
 * it for the learner.
 */
export const AUTO_CONFIRM_AFTER_HOURS = 24;
const SWEEP_EVERY_MS = 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export async function autoConfirmOverdueAttendance(now = new Date()) {
  // Sessions last at most a few hours; the end time is checked exactly below.
  const startedBefore = new Date(now.getTime() - AUTO_CONFIRM_AFTER_HOURS * HOUR_MS);
  const candidates = await prisma.session.findMany({
    where: {
      status: { not: SessionStatus.CANCELLED },
      startsAt: { lt: startedBefore },
      attendance: { teacherConfirmedAt: { not: null }, familyConfirmedAt: null },
      cancellations: { none: { status: CancellationStatus.PENDING } },
    },
    include: {
      attendance: true,
      note: { select: { id: true } },
      student: { include: { parent: { select: { userId: true } } } },
      teacher: { select: { id: true, userId: true } },
    },
  });

  let confirmed = 0;
  for (const session of candidates) {
    const endsAt = session.startsAt.getTime() + session.durationMins * 60 * 1000;
    if (now.getTime() - endsAt < AUTO_CONFIRM_AFTER_HOURS * HOUR_MS) continue;

    await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction so a learner confirming at the same
      // moment is never counted twice.
      const attendance = await tx.attendance.updateMany({
        where: { sessionId: session.id, familyConfirmedAt: null },
        data: { familyConfirmedAt: now },
      });
      if (attendance.count === 0) return;

      const wasCompleted = session.status === SessionStatus.COMPLETED;
      await tx.session.update({
        where: { id: session.id },
        data: { status: SessionStatus.COMPLETED },
      });
      if (!wasCompleted) {
        await tx.teacherProfile.update({
          where: { id: session.teacher.id },
          data: { totalSessions: { increment: 1 } },
        });
        if (session.lessonPackageId) {
          await tx.studentLessonPackage.update({
            where: { id: session.lessonPackageId },
            data: { hoursCompleted: { increment: 1 } },
          });
        }
      }

      await createAuditLog(
        {
          // Recorded against the learner's account, clearly marked as automatic.
          actor: { id: session.student.parent.userId, role: Role.STUDENT },
          action: AuditAction.FAMILY_ATTENDANCE_CONFIRMED,
          entityType: AuditEntityType.ATTENDANCE,
          entityId: session.attendance!.id,
          summary: `DoLearn confirmed ${session.subject} with ${session.student.fullName} automatically: the learner did not respond within ${AUTO_CONFIRM_AFTER_HOURS} hours.`,
          studentId: session.studentId,
          teacherId: session.teacher.id,
          metadata: { sessionId: session.id, automatic: true },
        },
        tx,
      );

      await createAdminNotifications(
        {
          title: 'Class confirmed automatically',
          body: `${session.subject} with ${session.student.fullName} was confirmed by the tutor; the learner did not respond within ${AUTO_CONFIRM_AFTER_HOURS} hours, so it now counts as attended.`,
          studentId: session.studentId,
          teacherId: session.teacher.id,
        },
        tx,
      );

      if (!session.note) {
        await createNotification(
          {
            userId: session.teacher.userId,
            role: Role.TEACHER,
            title: 'Write your session note to get paid',
            body: `${session.subject} with ${session.student.fullName} is confirmed. Add the session note so it counts towards your payout.`,
            studentId: session.studentId,
            teacherId: session.teacher.id,
          },
          tx,
        );
      }
    });
    confirmed += 1;
  }

  return confirmed;
}

/** Runs the check now and then every hour while the server is up. */
export function startAttendanceAutoConfirm() {
  const run = () =>
    autoConfirmOverdueAttendance()
      .then((count) => {
        if (count > 0) console.info(`Auto-confirmed attendance for ${count} session(s).`);
      })
      .catch((error) => console.error('Attendance auto-confirm failed:', (error as Error).message));

  void run();
  const timer = setInterval(run, SWEEP_EVERY_MS);
  timer.unref();
  return timer;
}
