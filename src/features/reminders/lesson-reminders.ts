import { SessionStatus } from '@prisma/client';
import { env } from '../../config/env';
import { sendBulkEmail } from '../../lib/email';
import { prisma } from '../../lib/prisma';

/*
 * Reminders for confirmed lessons, to both the learner and the teacher:
 * about 24 hours and about 1 hour before. Each is recorded on the session
 * before sending, so a restart can never send one twice.
 */
const SWEEP_EVERY_MS = 10 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const WINDOWS = [
  { field: 'reminder1SentAt', fromHours: 0, toHours: 1 },
  { field: 'reminder24SentAt', fromHours: 1, toHours: 24 },
] as const;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function lessonTime(startsAt: Date, timeZone: string) {
  return startsAt.toLocaleString('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function lessonReminderEmail(input: {
  to: string;
  name: string;
  subject: string;
  withWhom: string;
  when: string;
  meetLink: string | null;
}) {
  const firstName = input.name.trim().split(/\s+/)[0] || 'there';
  const heading = `${input.subject} lesson: ${input.when}`;
  return {
    to: input.to,
    subject: `Reminder: ${heading}`,
    text: [
      `Hi ${firstName},`,
      '',
      `Your ${input.subject} lesson with ${input.withWhom} is on ${input.when}.`,
      input.meetLink ? `Join here: ${input.meetLink}` : 'The admin will share the meeting link.',
    ].join('\n'),
    html: `<p>Hi ${escapeHtml(firstName)},</p><p>Your <strong>${escapeHtml(input.subject)}</strong> lesson with ${escapeHtml(input.withWhom)} is on <strong>${escapeHtml(input.when)}</strong>.</p>${
      input.meetLink
        ? `<p><a href="${escapeHtml(input.meetLink)}">Join the lesson</a></p>`
        : '<p>The admin will share the meeting link.</p>'
    }`,
  };
}

export async function sendLessonReminders({ now = new Date(), dryRun = false } = {}) {
  const planned: Array<{ sessionId: string; field: string; to: string[] }> = [];

  for (const window of WINDOWS) {
    const sessions = await prisma.session.findMany({
      where: {
        status: SessionStatus.UPCOMING,
        startsAt: {
          gt: new Date(now.getTime() + window.fromHours * HOUR_MS),
          lte: new Date(now.getTime() + window.toHours * HOUR_MS),
        },
        [window.field]: null,
      },
      include: {
        teacher: { include: { user: true } },
        student: { include: { intake: true, parent: { include: { user: true } } } },
      },
    });

    for (const session of sessions) {
      const learner = session.student.parent.user;
      const teacher = session.teacher.user;
      planned.push({ sessionId: session.id, field: window.field, to: [learner.email, teacher.email] });
      if (dryRun) continue;

      const claimed = await prisma.session.updateMany({
        where: { id: session.id, [window.field]: null },
        data: { [window.field]: now },
      });
      if (claimed.count === 0) continue;

      await sendBulkEmail([
        lessonReminderEmail({
          to: learner.email,
          name: learner.name,
          subject: session.subject,
          withWhom: teacher.name,
          when: lessonTime(session.startsAt, session.student.intake?.timezone ?? 'Africa/Lagos'),
          meetLink: session.meetLink,
        }),
        lessonReminderEmail({
          to: teacher.email,
          name: teacher.name,
          subject: session.subject,
          withWhom: session.student.fullName,
          when: lessonTime(session.startsAt, session.teacher.timezone),
          meetLink: session.meetLink,
        }),
      ]);
    }
  }

  return { planned };
}

/** Follows the same on/off switch as the other reminder emails. */
export function startLessonReminders() {
  if (!env.REMINDER_EMAILS_ENABLED) return null;
  const run = () =>
    sendLessonReminders().catch((error) =>
      console.error('Lesson reminders failed:', (error as Error).message),
    );
  void run();
  const timer = setInterval(run, SWEEP_EVERY_MS);
  timer.unref();
  return timer;
}
