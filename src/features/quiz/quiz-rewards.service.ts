import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { assertOwnsStudent } from './quiz.service';

/*
 * XP, levels, streaks and the weekly leaderboard.
 *
 * Everything is derived from submitted quiz attempts (Arena battles are quiz
 * attempts too), so there is no extra table to keep in sync and the rules can
 * change without a migration. Rules reward learning, not clicking:
 *
 *   - 10 XP per correct answer.
 *   - 20 XP for finishing a quiz with at least half of the questions answered.
 *   - At most DAILY_XP_CAP XP per learner per day, so grinding easy quizzes
 *     does not pay.
 *
 * Days and weeks follow Nigerian time (Africa/Lagos, UTC+1, no daylight saving).
 */

export type RewardsUser = { id: string; role: Role };

const XP_PER_CORRECT = 10;
const XP_FOR_COMPLETION = 20;
const DAILY_XP_CAP = 500;
const LEADERBOARD_SIZE = 10;
// A streak survives one missed day; two missed days in a row end it.
const STREAK_MAX_GAP_DAYS = 2;

export const LEVELS = [
  { name: 'Explorer', minXp: 0 },
  { name: 'Scholar', minXp: 500 },
  { name: 'Master', minXp: 2000 },
  { name: 'Champion', minXp: 5000 },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
export const LAGOS_OFFSET_MS = 60 * 60 * 1000;

// "YYYY-MM-DD" for today in Lagos.
export function lagosToday() {
  return new Date(Date.now() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

// Monday of the current Lagos week, as "YYYY-MM-DD".
export function lagosWeekStart() {
  const today = new Date(`${lagosToday()}T00:00:00Z`);
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

function dayNumber(isoDay: string) {
  return Math.round(new Date(`${isoDay}T00:00:00Z`).getTime() / DAY_MS);
}

// XP per learner per Lagos day, capped. Shared by the personal summary and the
// leaderboard so both always use the same rules.
const dailyXpCte = Prisma.sql`
  attempt_xp AS (
    SELECT a."userId",
           a."studentId",
           ((a."submittedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos')::date AS day,
           ${XP_PER_CORRECT} * COALESCE(a."correctCount", 0)
             + CASE WHEN answered.n * 2 >= a."totalQuestions" THEN ${XP_FOR_COMPLETION} ELSE 0 END AS xp
    FROM "QuizAttempt" a
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS n FROM jsonb_object_keys(COALESCE(a."answers", '{}'::jsonb))
    ) answered
    WHERE a."status" = 'SUBMITTED' AND a."submittedAt" IS NOT NULL
  ),
  daily_xp AS (
    SELECT "userId", "studentId", day, LEAST(SUM(xp), ${DAILY_XP_CAP})::int AS xp
    FROM attempt_xp
    GROUP BY "userId", "studentId", day
  )`;

function levelFor(xp: number) {
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (xp >= level.minXp) index = i;
  });
  const next = LEVELS[index + 1] ?? null;
  return {
    level: LEVELS[index],
    nextLevel: next,
    // 0-100 progress through the current level (100 at the top level).
    progressPercent: next
      ? Math.floor(((xp - LEVELS[index].minXp) / (next.minXp - LEVELS[index].minXp)) * 100)
      : 100,
  };
}

export function streaksFor(activeDays: string[], today: string) {
  const days = [...new Set(activeDays)].map(dayNumber).sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, best: 0, activeToday: false };

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = days[i] - days[i - 1] <= STREAK_MAX_GAP_DAYS ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const todayNumber = dayNumber(today);
  const last = days[days.length - 1];
  const alive = todayNumber - last <= STREAK_MAX_GAP_DAYS;
  return { current: alive ? run : 0, best, activeToday: last === todayNumber };
}

// "Zara Okafor" -> "Zara O." so the leaderboard never shows full names.
function publicName(fullName: string | null) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Learner';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export async function learnerKey(user: RewardsUser, studentId?: string) {
  return studentId ? await assertOwnsStudent(user, studentId) : null;
}

export async function getRewards(user: RewardsUser, query: { studentId?: string }) {
  const studentId = await learnerKey(user, query.studentId);

  const rows = await prisma.$queryRaw<Array<{ day: Date; xp: number }>>`
    WITH ${dailyXpCte}
    SELECT day, xp FROM daily_xp
    WHERE "userId" = ${user.id} AND "studentId" IS NOT DISTINCT FROM ${studentId}::text
    ORDER BY day`;

  const today = lagosToday();
  const weekStart = lagosWeekStart();
  const days = rows.map((row) => ({ day: row.day.toISOString().slice(0, 10), xp: row.xp }));
  const xp = days.reduce((sum, row) => sum + row.xp, 0);
  const xpToday = days.find((row) => row.day === today)?.xp ?? 0;

  return {
    xp,
    weekXp: days.filter((row) => row.day >= weekStart).reduce((sum, row) => sum + row.xp, 0),
    xpToday,
    dailyCapReached: xpToday >= DAILY_XP_CAP,
    ...levelFor(xp),
    streak: streaksFor(
      days.map((row) => row.day),
      today,
    ),
    rules: {
      xpPerCorrect: XP_PER_CORRECT,
      xpForCompletion: XP_FOR_COMPLETION,
      dailyXpCap: DAILY_XP_CAP,
      levels: LEVELS,
    },
  };
}

export async function getWeeklyLeaderboard(user: RewardsUser, query: { studentId?: string }) {
  const studentId = await learnerKey(user, query.studentId);
  const weekStart = lagosWeekStart();

  // Rank every learner with XP this week, then keep the top N plus the caller.
  const rows = await prisma.$queryRaw<
    Array<{
      userId: string;
      studentId: string | null;
      name: string | null;
      hidden: boolean;
      xp: number;
      rank: bigint;
    }>
  >`
    WITH ${dailyXpCte},
    weekly AS (
      SELECT d."userId", d."studentId", SUM(d.xp)::int AS xp
      FROM daily_xp d
      JOIN "User" u ON u.id = d."userId"
      WHERE d.day >= ${weekStart}::date
        AND u.role IN ('STUDENT', 'PARENT')
      GROUP BY d."userId", d."studentId"
    ),
    ranked AS (
      SELECT w.*, RANK() OVER (ORDER BY w.xp DESC) AS rank
      FROM weekly w
    )
    SELECT r."userId", r."studentId", r.xp, r.rank,
           COALESCE(s."fullName", u.name) AS name,
           -- A child's own setting (set by the parent), otherwise the account's.
           CASE WHEN r."studentId" IS NOT NULL THEN s."hideFromLeaderboard"
                ELSE u."hideFromLeaderboard" END AS hidden
    FROM ranked r
    JOIN "User" u ON u.id = r."userId"
    LEFT JOIN "Student" s ON s.id = r."studentId"
    WHERE r.rank <= ${LEADERBOARD_SIZE}
       OR (r."userId" = ${user.id} AND r."studentId" IS NOT DISTINCT FROM ${studentId}::text)
    ORDER BY r.rank, name`;

  const isMe = (row: (typeof rows)[number]) => row.userId === user.id && row.studentId === studentId;
  const entries = rows
    .filter((row) => Number(row.rank) <= LEADERBOARD_SIZE)
    .slice(0, LEADERBOARD_SIZE)
    .map((row) => ({
      rank: Number(row.rank),
      // Hidden learners keep their rank (so everyone else's stays honest) but
      // not their name. You always see your own name.
      name: row.hidden && !isMe(row) ? HIDDEN_NAME : publicName(row.name),
      xp: row.xp,
      isMe: isMe(row),
    }));
  const mine = rows.find(isMe);

  return {
    weekStart,
    entries,
    me: mine ? { rank: Number(mine.rank), xp: mine.xp } : null,
    hidden: await isHidden(user, studentId),
  };
}

const HIDDEN_NAME = 'Hidden learner';

async function isHidden(user: RewardsUser, studentId: string | null) {
  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { hideFromLeaderboard: true },
    });
    return student?.hideFromLeaderboard ?? false;
  }
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { hideFromLeaderboard: true },
  });
  return account?.hideFromLeaderboard ?? false;
}

/** Hide or show a learner's name on the leaderboard. Parents set it per child. */
export async function setLeaderboardPrivacy(
  user: RewardsUser,
  input: { hidden: boolean; studentId?: string },
) {
  const studentId = await learnerKey(user, input.studentId);
  if (studentId) {
    await prisma.student.update({
      where: { id: studentId },
      data: { hideFromLeaderboard: input.hidden },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { hideFromLeaderboard: input.hidden },
    });
  }
  return { hidden: input.hidden };
}
