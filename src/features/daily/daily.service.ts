import { randomUUID } from 'crypto';
import { Prisma, QuizAttemptStatus, QuizMode, type DailyEntry, type DailyQuiz } from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { lagosToday, lagosWeekStart } from '../quiz/quiz-rewards.service';

/*
 * The DoLearnn Daily: one short quiz, the same for everyone, new each day at
 * midnight Nigerian time. Questions are served one at a time and marked on the
 * server. It has its own question pool, so Practice cannot give the answers away.
 */
type Category = 'english' | 'maths' | 'history';

export const PLAN: Record<Category, number> = { english: 5, maths: 3, history: 2 };
const SECONDS: Record<Category, number> = { english: 20, maths: 40, history: 20 };
// Slow connections: an answer this soon after the limit still counts.
const GRACE_MS = 3000;
// A perfect score this fast is held back from the leaderboard for review.
const SUSPICIOUS_PERFECT_MS = 15_000;
const TOP = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyIdentity = { userId: string | null; guestKey: string | null };
type PoolQuestion = Awaited<ReturnType<typeof loadQuestions>>[number];

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const limitMs = (question: PoolQuestion) => SECONDS[question.category as Category] * 1000;

function shiftDay(day: string, by: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY_MS).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Today's quiz
// ---------------------------------------------------------------------------

async function pickQuestions(day: string) {
  const picked: string[] = [];
  for (const [category, count] of Object.entries(PLAN)) {
    const unused = await prisma.dailyQuestion.findMany({
      where: { category, usedOn: null },
      select: { id: true },
    });
    const chosen = shuffle(unused).slice(0, count).map((row) => row.id);
    // Pool used up: bring back the questions that were used longest ago.
    if (chosen.length < count) {
      const oldest = await prisma.dailyQuestion.findMany({
        where: { category, usedOn: { not: null, lt: day } },
        orderBy: { usedOn: 'asc' },
        take: count - chosen.length,
        select: { id: true },
      });
      chosen.push(...oldest.map((row) => row.id));
    }
    picked.push(...chosen);
  }
  return shuffle(picked);
}

async function todaysQuiz() {
  const day = lagosToday();
  const existing = await prisma.dailyQuiz.findUnique({ where: { day } });
  if (existing) return existing;

  const questionIds = await pickQuestions(day);
  if (questionIds.length === 0) throw new AppError(503, "Today's quiz is not ready yet.");

  try {
    const quiz = await prisma.dailyQuiz.create({
      data: { day, number: (await prisma.dailyQuiz.count()) + 1, questionIds },
    });
    await prisma.dailyQuestion.updateMany({ where: { id: { in: questionIds } }, data: { usedOn: day } });
    return quiz;
  } catch (error) {
    // Two people opened the first quiz of the day at the same moment.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.dailyQuiz.findUniqueOrThrow({ where: { day } });
    }
    throw error;
  }
}

async function loadQuestions(ids: string[]) {
  const rows = await prisma.dailyQuestion.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

function findEntry(quizId: string, identity: DailyIdentity) {
  if (identity.userId) {
    return prisma.dailyEntry.findUnique({
      where: { dailyQuizId_userId: { dailyQuizId: quizId, userId: identity.userId } },
    });
  }
  if (identity.guestKey) {
    return prisma.dailyEntry.findUnique({
      where: { dailyQuizId_guestKey: { dailyQuizId: quizId, guestKey: identity.guestKey } },
    });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Playing
// ---------------------------------------------------------------------------

function questionView(entry: DailyEntry, questions: PoolQuestion[], now: number) {
  const question = questions[entry.questionIndex];
  const left = limitMs(question) - (now - entry.questionStartedAt.getTime());
  return {
    id: question.id,
    index: entry.questionIndex,
    total: questions.length,
    category: question.category,
    text: question.text,
    // The correct answer never leaves the server until the quiz is finished.
    options: shuffle(question.options as Array<{ id: string; text: string }>),
    secondsLeft: Math.max(1, Math.ceil(left / 1000)),
  };
}

// Puts the day's result into streaks and XP. Marked so it stays out of Practice
// history and score trends: it is not a measure of any one subject.
async function recordForStreak(entry: DailyEntry, total: number, finishedAt: Date) {
  if (!entry.userId) return;
  const subject = await prisma.subject.findFirst({ where: { slug: 'use-of-english' }, select: { id: true } });
  if (!subject) return;

  await prisma.quizAttempt.create({
    data: {
      userId: entry.userId,
      subjectId: subject.id,
      mode: QuizMode.PRACTICE,
      status: QuizAttemptStatus.SUBMITTED,
      questionIds: [],
      totalQuestions: total,
      startedAt: entry.startedAt,
      submittedAt: finishedAt,
      correctCount: entry.correctCount,
      scorePercent: Math.round((entry.correctCount / total) * 100),
      answers: Object.fromEntries(
        Object.entries(entry.answers as Record<string, string | null>).filter(([, value]) => value !== null),
      ),
      topicBreakdown: [],
      isReview: true,
      isDaily: true,
    },
  });
}

async function finishIfDone(entry: DailyEntry, questions: PoolQuestion[]) {
  if (entry.questionIndex < questions.length || entry.finishedAt) return entry;

  const finishedAt = new Date();
  const flagged = entry.correctCount === questions.length && entry.totalMs < SUSPICIOUS_PERFECT_MS;
  const claimed = await prisma.dailyEntry.updateMany({
    where: { id: entry.id, finishedAt: null },
    data: { finishedAt, flagged },
  });
  const finished = await prisma.dailyEntry.findUniqueOrThrow({ where: { id: entry.id } });
  if (claimed.count === 1) await recordForStreak(finished, questions.length, finishedAt);
  return finished;
}

// A question whose time ran out counts as unanswered, even if the learner left.
async function settleExpired(entry: DailyEntry, questions: PoolQuestion[], now: number) {
  let index = entry.questionIndex;
  let startedAt = entry.questionStartedAt.getTime();
  let totalMs = entry.totalMs;
  const answers = { ...(entry.answers as Record<string, string | null>) };

  while (index < questions.length && now - startedAt > limitMs(questions[index]) + GRACE_MS) {
    const limit = limitMs(questions[index]);
    answers[questions[index].id] = null;
    totalMs += limit;
    startedAt += limit;
    index += 1;
  }
  if (index === entry.questionIndex) return entry;

  await prisma.dailyEntry.updateMany({
    where: { id: entry.id, questionIndex: entry.questionIndex },
    data: { questionIndex: index, questionStartedAt: new Date(startedAt), totalMs, answers },
  });
  return prisma.dailyEntry.findUniqueOrThrow({ where: { id: entry.id } });
}

async function rankOf(quizId: string, entry: DailyEntry) {
  const ranked = { dailyQuizId: quizId, userId: { not: null }, finishedAt: { not: null }, flagged: false };
  const [ahead, players] = await Promise.all([
    prisma.dailyEntry.count({
      where: {
        ...ranked,
        id: { not: entry.id },
        OR: [
          { correctCount: { gt: entry.correctCount } },
          { correctCount: entry.correctCount, totalMs: { lt: entry.totalMs } },
        ],
      },
    }),
    prisma.dailyEntry.count({ where: ranked }),
  ]);
  const field = players + (entry.userId ? 0 : 1);
  const rank = ahead + 1;
  return { rank, players: field, aheadPercent: field > 1 ? Math.round(((field - rank) / (field - 1)) * 100) : 100 };
}

async function resultView(quiz: DailyQuiz, entry: DailyEntry, questions: PoolQuestion[]) {
  const answers = entry.answers as Record<string, string | null>;
  return {
    score: entry.correctCount,
    total: questions.length,
    seconds: Math.round(entry.totalMs / 1000),
    flagged: entry.flagged,
    ranked: Boolean(entry.userId),
    ...(await rankOf(quiz.id, entry)),
    review: questions.map((question) => ({
      id: question.id,
      category: question.category,
      text: question.text,
      options: question.options,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      yourAnswer: answers[question.id] ?? null,
    })),
  };
}

async function stateFor(quiz: DailyQuiz, entry: DailyEntry | null, guestKey: string | null) {
  const base = { day: quiz.day, number: quiz.number, total: quiz.questionIds.length, guestKey };
  if (!entry) return { ...base, status: 'new' as const };

  const questions = await loadQuestions(quiz.questionIds);
  const now = Date.now();
  const settled = await finishIfDone(await settleExpired(entry, questions, now), questions);
  if (settled.finishedAt) {
    return { ...base, status: 'finished' as const, result: await resultView(quiz, settled, questions) };
  }
  return { ...base, status: 'playing' as const, question: questionView(settled, questions, now) };
}

export async function getDailyState(identity: DailyIdentity) {
  const quiz = await todaysQuiz();
  return stateFor(quiz, await findEntry(quiz.id, identity), identity.guestKey);
}

export async function startDaily(identity: DailyIdentity) {
  const quiz = await todaysQuiz();
  const who = identity.userId ? identity : { userId: null, guestKey: identity.guestKey ?? randomUUID() };

  let entry = await findEntry(quiz.id, who);
  if (!entry) {
    try {
      entry = await prisma.dailyEntry.create({
        data: { dailyQuizId: quiz.id, userId: who.userId, guestKey: who.guestKey, questionStartedAt: new Date() },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      entry = await findEntry(quiz.id, who);
    }
  }
  return stateFor(quiz, entry, who.guestKey);
}

export async function answerDaily(
  identity: DailyIdentity,
  input: { questionId: string; optionId: string | null },
) {
  const quiz = await todaysQuiz();
  const found = await findEntry(quiz.id, identity);
  if (!found) throw new AppError(404, 'Start the quiz first.');

  const questions = await loadQuestions(quiz.questionIds);
  const now = Date.now();
  const entry = await settleExpired(found, questions, now);
  const current = questions[entry.questionIndex];

  // Finished, or a late or repeated tap: just send back where things stand.
  if (entry.finishedAt || !current || current.id !== input.questionId) {
    return stateFor(quiz, entry, identity.guestKey);
  }

  const spent = Math.min(now - entry.questionStartedAt.getTime(), limitMs(current));
  const isCorrect = input.optionId === current.correctOptionId;
  await prisma.dailyEntry.updateMany({
    where: { id: entry.id, questionIndex: entry.questionIndex },
    data: {
      questionIndex: entry.questionIndex + 1,
      questionStartedAt: new Date(now),
      totalMs: entry.totalMs + spent,
      correctCount: entry.correctCount + (isCorrect ? 1 : 0),
      answers: { ...(entry.answers as Record<string, string | null>), [current.id]: input.optionId },
    },
  });
  return stateFor(quiz, await prisma.dailyEntry.findUniqueOrThrow({ where: { id: entry.id } }), identity.guestKey);
}

/** After signing up: moves today's guest score onto the new account. */
export async function claimGuestEntry(userId: string, guestKey: string) {
  const quiz = await todaysQuiz();
  const [guest, own] = await Promise.all([
    findEntry(quiz.id, { userId: null, guestKey }),
    findEntry(quiz.id, { userId, guestKey: null }),
  ]);
  if (!guest?.finishedAt || own) return { claimed: false };

  const entry = await prisma.dailyEntry.update({
    where: { id: guest.id },
    data: { userId, guestKey: null },
  });
  await recordForStreak(entry, quiz.questionIds.length, guest.finishedAt);
  return { claimed: true };
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

type BoardRow = {
  userId: string;
  nickname: string | null;
  hidden: boolean;
  score: number;
  ms: number;
  days: number;
  rank: bigint;
  players: bigint;
};

// Until a learner picks a nickname: never their real name, and still distinct.
function placeholderNickname(userId: string) {
  return `Learner ${userId.slice(-4).toUpperCase()}`;
}

async function board(from: string, to: string, userId: string | null, top: number) {
  const rows = await prisma.$queryRaw<BoardRow[]>`
    WITH totals AS (
      SELECT e."userId", u."nickname", u."hideFromLeaderboard" AS hidden,
             SUM(e."correctCount")::int AS score, SUM(e."totalMs")::int AS ms, COUNT(*)::int AS days
      FROM "DailyEntry" e
      JOIN "DailyQuiz" q ON q."id" = e."dailyQuizId"
      JOIN "User" u ON u."id" = e."userId"
      WHERE q."day" >= ${from} AND q."day" <= ${to}
        AND e."finishedAt" IS NOT NULL AND NOT e."flagged"
      GROUP BY e."userId", u."nickname", u."hideFromLeaderboard"
    ),
    ranked AS (
      SELECT *, RANK() OVER (ORDER BY score DESC, ms ASC) AS rank, COUNT(*) OVER () AS players FROM totals
    )
    SELECT * FROM ranked WHERE rank <= ${top} OR "userId" = ${userId} ORDER BY rank`;

  const view = (row: BoardRow) => ({
    rank: Number(row.rank),
    name: row.hidden ? 'Hidden learner' : (row.nickname ?? placeholderNickname(row.userId)),
    score: row.score,
    seconds: Math.round(row.ms / 1000),
    days: row.days,
    isMe: row.userId === userId,
  });
  const players = rows[0] ? Number(rows[0].players) : 0;
  return {
    players,
    top: rows.filter((row) => Number(row.rank) <= top).map(view),
    me: rows.filter((row) => row.userId === userId).map(view)[0] ?? null,
  };
}

export async function getDailyLeaderboard(userId: string | null) {
  const today = lagosToday();
  const yesterday = shiftDay(today, -1);
  const [day, week, previous, account] = await Promise.all([
    board(today, today, userId, TOP),
    board(lagosWeekStart(), today, userId, TOP),
    board(yesterday, yesterday, null, 3),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { hideFromLeaderboard: true, nickname: true } })
      : null,
  ]);
  return {
    today: day,
    week,
    yesterday: previous.top,
    hidden: account?.hideFromLeaderboard ?? false,
    canHide: Boolean(account),
    nickname: account?.nickname ?? null,
  };
}

// ---------------------------------------------------------------------------
// Nicknames
// ---------------------------------------------------------------------------

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// The board is public and many players are under 18. A short list for the obvious
// cases; the words are matched inside the nickname, so none may be part of a real name.
const NOT_ALLOWED = ['admin', 'dolearn', 'moderator', 'hiddenlearner', 'fuck', 'shit', 'bitch', 'asshole', 'porn', 'nigger', 'nigga'];

export async function setDailyNickname(userId: string, input: string) {
  const nickname = input.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(nickname)) {
    throw new AppError(400, 'Use 3 to 20 letters, numbers or underscores, with no spaces.');
  }
  if (/\d{7,}/.test(nickname)) {
    throw new AppError(400, 'A nickname cannot contain a phone number.');
  }

  const key = compact(nickname);
  if (NOT_ALLOWED.some((word) => key.includes(word))) {
    throw new AppError(400, 'That nickname is not allowed. Please choose another.');
  }

  const account = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!account) throw new AppError(404, 'Account not found');
  if (key === compact(account.name)) {
    throw new AppError(400, 'Choose a nickname that is not your full name.');
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { nickname } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'That nickname is taken. Please choose another.');
    }
    throw error;
  }
  return { nickname };
}
