import { createHmac, timingSafeEqual } from 'crypto';
import { AccountStatus, QuizAttemptStatus, Role } from '@prisma/client';
import { env } from '../../config/env';
import { sendEmail } from '../../lib/email';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { STREAK_MAX_GAP_DAYS, streaksFor } from '../quiz/quiz-rewards.service';
import { collectMistakes, lagosDay } from '../quiz/quiz.service';

/*
 * Reminder emails bring learners back only when there is a real reason:
 * a streak that ends tonight, or questions ready to retry. Rules:
 *   - Off unless REMINDER_EMAILS_ENABLED=true, and anyone can stop them.
 *   - At most one a day, never to someone who already practised today.
 *   - Quieter over time, and none after two weeks of inactivity.
 */
const SWEEP_EVERY_MS = 60 * 60 * 1000;
// Sent in the evening, Nigerian time, once school is over.
const FIRST_SEND_HOUR = 17;
const LAST_SEND_HOUR = 20;
// Keeps a day's total well inside Gmail's sending limit: 4 hourly runs x 80.
const MAX_PER_RUN = 80;
const STOP_AFTER_INACTIVE_DAYS = 14;
const QUIET_AFTER_INACTIVE_DAYS = 7;
const DAYS_BETWEEN_REMINDERS = 2;
const DAYS_BETWEEN_REMINDERS_QUIET = 7;
const MIN_STREAK_WORTH_SAVING = 2;
// Far enough back to work out any realistic current streak.
const STREAK_LOOKBACK_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Reminder = {
  kind: 'streak' | 'mistakes';
  streak: number;
  mistakesDue: number;
};

function daysBetween(earlier: string, later: string) {
  return Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / DAY_MS);
}

/** What (if anything) to send this learner today. No side effects. */
export function chooseReminder(input: {
  today: string;
  activeDays: string[];
  mistakesDue: number;
  lastReminderDay: string | null;
}): Reminder | null {
  const { today, activeDays, mistakesDue, lastReminderDay } = input;
  if (activeDays.length === 0 || lastReminderDay === today) return null;

  const streak = streaksFor(activeDays, today);
  if (streak.activeToday) return null;

  const lastActive = [...activeDays].sort().at(-1)!;
  const inactiveDays = daysBetween(lastActive, today);
  if (inactiveDays > STOP_AFTER_INACTIVE_DAYS) return null;

  // Today is the last day this streak can be saved.
  if (inactiveDays === STREAK_MAX_GAP_DAYS && streak.current >= MIN_STREAK_WORTH_SAVING) {
    return { kind: 'streak', streak: streak.current, mistakesDue };
  }

  const wait = inactiveDays <= QUIET_AFTER_INACTIVE_DAYS ? DAYS_BETWEEN_REMINDERS : DAYS_BETWEEN_REMINDERS_QUIET;
  const waited = lastReminderDay === null || daysBetween(lastReminderDay, today) >= wait;
  if (mistakesDue > 0 && waited) {
    return { kind: 'mistakes', streak: streak.current, mistakesDue };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Unsubscribe links
// ---------------------------------------------------------------------------

// A dedicated signature, not a login token: a forwarded email must never be
// able to sign someone in. All this code can do is turn reminders off.
function unsubscribeCode(userId: string) {
  if (!env.JWT_SECRET) throw new AppError(503, 'Reminders are not configured.');
  return createHmac('sha256', env.JWT_SECRET).update(`reminders-off:${userId}`).digest('base64url');
}

function frontendUrl() {
  return env.FRONTEND_URL.replace(/\/$/, '');
}

export function unsubscribeLink(userId: string) {
  return `${frontendUrl()}/unsubscribe?u=${encodeURIComponent(userId)}&c=${unsubscribeCode(userId)}`;
}

export async function turnOffRemindersWithLink(userId: string, code: string) {
  const expected = Buffer.from(unsubscribeCode(userId));
  const given = Buffer.from(code);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new AppError(400, 'This link is not valid.');
  }
  await prisma.user.updateMany({ where: { id: userId }, data: { emailRemindersOff: true } });
}

export async function getReminderSetting(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailRemindersOff: true },
  });
  return { enabled: !user?.emailRemindersOff };
}

export async function setReminderSetting(userId: string, enabled: boolean) {
  await prisma.user.update({ where: { id: userId }, data: { emailRemindersOff: !enabled } });
  return { enabled };
}

// ---------------------------------------------------------------------------
// The email
// ---------------------------------------------------------------------------

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function questions(count: number) {
  return `${count} ${count === 1 ? 'question' : 'questions'}`;
}

export function buildReminderEmail(user: { id: string; email: string; name: string }, reminder: Reminder) {
  const firstName = user.name.trim().split(/\s+/)[0] || 'there';
  const link = `${frontendUrl()}/student`;
  const stopLink = unsubscribeLink(user.id);
  const mistakes = questions(reminder.mistakesDue);
  const isReady = reminder.mistakesDue === 1 ? 'is' : 'are';

  const { subject, body, cta } =
    reminder.kind === 'streak'
      ? {
          subject: `Your ${reminder.streak}-day streak ends tonight`,
          body: `One short quiz today keeps it going.${
            reminder.mistakesDue > 0 ? ` You also have ${mistakes} ready to try again.` : ''
          }`,
          cta: 'Keep my streak',
        }
      : {
          subject: `${mistakes.charAt(0).toUpperCase()}${mistakes.slice(1)} ${isReady} ready to try again`,
          body: `These are questions you got wrong earlier. Trying them again takes about five minutes and helps the right answer stick.`,
          cta: 'Try them again',
        };

  return {
    to: user.email,
    subject,
    text: [
      `Hi ${firstName},`,
      '',
      `${subject}.`,
      body,
      '',
      `${cta}: ${link}`,
      '',
      `Stop these reminders: ${stopLink}`,
    ].join('\n'),
    html: `<div style="background:#f4f8fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
    <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#044272">DoLearnn</p>
    <p style="margin:0 0 8px;font-size:16px">Hi ${escapeHtml(firstName)},</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#022a49">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6">${escapeHtml(body)}</p>
    <a href="${link}" style="display:inline-block;background:#044272;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:999px">${cta}</a>
  </div>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:1.6;color:#6b7280;text-align:center">
    You get this because you practise on DoLearnn. <a href="${stopLink}" style="color:#6b7280">Stop these reminders</a>
  </p>
</div>`,
  };
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/**
 * Works out who should hear from us today and emails them. With `dryRun` it
 * only returns who would be emailed: nothing is sent or recorded.
 */
export async function sendDueReminders({ now = new Date(), dryRun = false } = {}) {
  const today = lagosDay(now);
  const startOfToday = new Date(`${today}T00:00:00+01:00`);
  const recent = new Date(now.getTime() - (STOP_AFTER_INACTIVE_DAYS + 1) * DAY_MS);

  const learners = await prisma.user.findMany({
    where: {
      role: { in: [Role.STUDENT, Role.PARENT] },
      status: AccountStatus.ACTIVE,
      emailRemindersOff: false,
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: startOfToday } }],
      quizAttempts: { some: { status: QuizAttemptStatus.SUBMITTED, submittedAt: { gte: recent } } },
    },
    select: { id: true, email: true, name: true, lastReminderAt: true },
  });
  if (learners.length === 0) return { considered: 0, sent: 0, planned: [] };

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId: { in: learners.map((learner) => learner.id) },
      studentId: null,
      status: QuizAttemptStatus.SUBMITTED,
      submittedAt: { gte: new Date(now.getTime() - STREAK_LOOKBACK_DAYS * DAY_MS) },
    },
    select: { userId: true, submittedAt: true },
  });
  const daysByLearner = new Map<string, string[]>();
  for (const attempt of attempts) {
    const list = daysByLearner.get(attempt.userId) ?? [];
    list.push(lagosDay(attempt.submittedAt!));
    daysByLearner.set(attempt.userId, list);
  }

  const planned: Array<{ email: string; kind: Reminder['kind']; subject: string }> = [];
  let sent = 0;

  for (const learner of learners) {
    if (sent >= MAX_PER_RUN) break;

    const activeDays = daysByLearner.get(learner.id) ?? [];
    if (activeDays.includes(today)) continue;

    const { due } = await collectMistakes(learner.id, null);
    const reminder = chooseReminder({
      today,
      activeDays,
      mistakesDue: due.length,
      lastReminderDay: learner.lastReminderAt ? lagosDay(learner.lastReminderAt) : null,
    });
    if (!reminder) continue;

    const email = buildReminderEmail(learner, reminder);
    planned.push({ email: learner.email, kind: reminder.kind, subject: email.subject });
    if (dryRun) continue;

    // Record first: a restart or second server can then never send it twice.
    const claimed = await prisma.user.updateMany({
      where: {
        id: learner.id,
        OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: startOfToday } }],
      },
      data: { lastReminderAt: now },
    });
    if (claimed.count === 0) continue;

    try {
      await sendEmail(email);
      sent += 1;
    } catch (error) {
      console.error('Reminder email failed:', (error as Error).message);
    }
  }

  return { considered: learners.length, sent, planned };
}

/** Hourly check; emails only go out during the evening window. */
export function startReminderEmails() {
  if (!env.REMINDER_EMAILS_ENABLED) {
    console.log('Reminder emails: off (set REMINDER_EMAILS_ENABLED=true to turn on)');
    return null;
  }
  console.log('Reminder emails: on');

  const run = () => {
    const hour = new Date(Date.now() + 60 * 60 * 1000).getUTCHours();
    if (hour < FIRST_SEND_HOUR || hour > LAST_SEND_HOUR) return;
    sendDueReminders()
      .then(({ sent }) => {
        if (sent > 0) console.info(`Sent ${sent} reminder email(s).`);
      })
      .catch((error) => console.error('Reminder emails failed:', (error as Error).message));
  };

  run();
  const timer = setInterval(run, SWEEP_EVERY_MS);
  timer.unref();
  return timer;
}
