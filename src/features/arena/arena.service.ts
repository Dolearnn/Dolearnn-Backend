import { randomInt } from 'node:crypto';
import { Prisma, QuizAttemptStatus, QuizMode, Role } from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { getCatalogIndex, getQuestionPool } from '../quiz/quiz.cache';
import {
  assertOwnsStudent,
  attemptSummary,
  loadQuestionsInOrder,
  pickQuestionIds,
  playableQuestion,
} from '../quiz/quiz.service';
import type { CreateChallengeInput, JoinChallengeInput } from './arena.schemas';

type ArenaUser = { id: string; role: Role };

const SEATS_PER_BATTLE = 2;
// A battle stays open for the second player for this long.
const CHALLENGE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
// No 0/O/1/I/L, so a code read out over the phone or WhatsApp is hard to get wrong.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_ATTEMPTS = 5;
const MY_BATTLES_LIMIT = 20;

function makeCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function normaliseCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'Player';
}

// Other players only ever see a first name.
async function playerNameFor(user: ArenaUser, studentId: string | null) {
  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { fullName: true },
    });
    return firstName(student?.fullName ?? '');
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true },
  });
  return firstName(account?.name ?? '');
}

async function resolveLearner(user: ArenaUser, requestedStudentId: string | undefined) {
  const studentId = requestedStudentId
    ? await assertOwnsStudent(user, requestedStudentId)
    : null;
  return { studentId, playerName: await playerNameFor(user, studentId) };
}

// ---------------------------------------------------------------------------
// Create + join
// ---------------------------------------------------------------------------

export async function createChallenge(user: ArenaUser, input: CreateChallengeInput) {
  const index = await getCatalogIndex();
  if (!index.subjectsById.has(input.subjectId)) {
    throw new AppError(404, 'Subject not found');
  }
  if (input.examId && !index.examIds.has(input.examId)) {
    throw new AppError(404, 'Exam not found');
  }

  const { studentId, playerName } = await resolveLearner(user, input.studentId);

  const pool = await getQuestionPool(input.examId ?? null, input.subjectId);
  if (pool.length === 0) {
    throw new AppError(404, 'No questions are available for this selection yet');
  }

  const questions = await loadQuestionsInOrder(
    pickQuestionIds(pool, Math.min(input.count, pool.length), new Set()),
    true,
  );
  if (questions.length === 0) {
    throw new AppError(404, 'No questions are available for this selection yet');
  }

  const startedAt = new Date();
  const questionIds = questions.map((question) => question.id);

  // The code is short, so a clash is possible; try again with a fresh one.
  for (let tries = 0; tries < CODE_ATTEMPTS; tries += 1) {
    const code = makeCode();
    try {
      const attempt = await prisma.$transaction(async (tx) => {
        const created = await tx.quizAttempt.create({
          data: {
            userId: user.id,
            studentId,
            examId: input.examId ?? null,
            subjectId: input.subjectId,
            mode: QuizMode.PRACTICE,
            questionIds,
            totalQuestions: questionIds.length,
            startedAt,
          },
          include: { subject: { select: { id: true, name: true } } },
        });

        await tx.arenaChallenge.create({
          data: {
            code,
            createdByUserId: user.id,
            subjectId: input.subjectId,
            examId: input.examId ?? null,
            questionIds,
            totalQuestions: questionIds.length,
            expiresAt: new Date(startedAt.getTime() + CHALLENGE_LIFETIME_MS),
            entries: {
              create: {
                slot: 1,
                userId: user.id,
                studentId,
                playerName,
                attemptId: created.id,
              },
            },
          },
        });

        return created;
      });

      return {
        code,
        attempt: attemptSummary(attempt),
        questions: questions.map(playableQuestion),
      };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  throw new AppError(503, 'Could not create the battle. Please try again.');
}

export async function joinChallenge(
  user: ArenaUser,
  rawCode: string,
  input: JoinChallengeInput,
) {
  const code = normaliseCode(rawCode);
  const challenge = await prisma.arenaChallenge.findUnique({
    where: { code },
    include: { entries: { select: { userId: true, studentId: true } } },
  });

  if (!challenge) throw new AppError(404, 'Battle not found. Check the code and try again.');
  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new AppError(410, 'This battle has expired.');
  }
  if (challenge.entries.length >= SEATS_PER_BATTLE) {
    throw new AppError(409, 'This battle already has two players.');
  }

  const { studentId, playerName } = await resolveLearner(user, input.studentId);

  if (
    challenge.entries.some(
      (entry) => entry.userId === user.id && entry.studentId === studentId,
    )
  ) {
    throw new AppError(409, 'You are already in this battle.');
  }

  // Both players get the exact same questions, even if one was unpublished since.
  const questions = await loadQuestionsInOrder(challenge.questionIds, false);
  if (questions.length === 0) {
    throw new AppError(409, 'The questions for this battle are no longer available.');
  }

  let attempt;
  try {
    attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({
        data: {
          userId: user.id,
          studentId,
          examId: challenge.examId,
          subjectId: challenge.subjectId,
          mode: QuizMode.PRACTICE,
          questionIds: challenge.questionIds,
          totalQuestions: challenge.totalQuestions,
        },
        include: { subject: { select: { id: true, name: true } } },
      });

      // The unique (challengeId, slot) index means only one request can take seat 2.
      await tx.arenaEntry.create({
        data: {
          challengeId: challenge.id,
          slot: 2,
          userId: user.id,
          studentId,
          playerName,
          attemptId: created.id,
        },
      });

      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'This battle already has two players.');
    }
    throw error;
  }

  return {
    code,
    attempt: attemptSummary(attempt),
    questions: questions.map(playableQuestion),
  };
}

// ---------------------------------------------------------------------------
// Reading a battle
// ---------------------------------------------------------------------------

type EntryRow = {
  slot: number;
  userId: string;
  playerName: string;
  attemptId: string;
  attempt: {
    status: QuizAttemptStatus;
    scorePercent: number | null;
    correctCount: number | null;
    startedAt: Date;
    submittedAt: Date | null;
  };
};

function isFinished(entry: EntryRow) {
  return entry.attempt.status === QuizAttemptStatus.SUBMITTED;
}

function secondsTaken(entry: EntryRow) {
  const { startedAt, submittedAt } = entry.attempt;
  return submittedAt
    ? Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000))
    : null;
}

// Higher score wins; if level, the faster player wins; if still level, a draw.
function decideWinner(first: EntryRow, second: EntryRow) {
  const a = first.attempt.scorePercent ?? 0;
  const b = second.attempt.scorePercent ?? 0;
  if (a !== b) return a > b ? first.slot : second.slot;

  const timeA = secondsTaken(first);
  const timeB = secondsTaken(second);
  if (timeA !== null && timeB !== null && timeA !== timeB) {
    return timeA < timeB ? first.slot : second.slot;
  }
  return null;
}

const entrySelect = {
  slot: true,
  userId: true,
  playerName: true,
  attemptId: true,
  attempt: {
    select: {
      status: true,
      scorePercent: true,
      correctCount: true,
      startedAt: true,
      submittedAt: true,
    },
  },
} satisfies Prisma.ArenaEntrySelect;

export async function getBattle(user: ArenaUser, rawCode: string) {
  const challenge = await prisma.arenaChallenge.findUnique({
    where: { code: normaliseCode(rawCode) },
    select: {
      code: true,
      totalQuestions: true,
      createdAt: true,
      expiresAt: true,
      subject: { select: { id: true, name: true } },
      entries: { select: entrySelect, orderBy: { slot: 'asc' } },
    },
  });

  if (!challenge) throw new AppError(404, 'Battle not found. Check the code and try again.');

  const entries: EntryRow[] = challenge.entries;
  const mine = entries.filter((entry) => entry.userId === user.id);
  const viewerIsPlayer = mine.length > 0;
  // Opponent scores stay hidden until you have finished your own game.
  const viewerFinished = viewerIsPlayer && mine.every(isFinished);

  const bothFinished = entries.length === SEATS_PER_BATTLE && entries.every(isFinished);
  const winnerSlot = bothFinished ? decideWinner(entries[0], entries[1]) : null;

  return {
    challenge: {
      code: challenge.code,
      subject: challenge.subject,
      totalQuestions: challenge.totalQuestions,
      createdAt: challenge.createdAt,
      expiresAt: challenge.expiresAt,
      isExpired: challenge.expiresAt.getTime() < Date.now(),
      isFull: entries.length >= SEATS_PER_BATTLE,
    },
    viewerIsPlayer,
    entries: entries.map((entry) => {
      const isMine = entry.userId === user.id;
      const finished = isFinished(entry);
      const showScore = finished && (isMine || viewerFinished);

      return {
        slot: entry.slot,
        playerName: entry.playerName,
        isMine,
        status: finished ? ('FINISHED' as const) : ('PLAYING' as const),
        // Only your own game's id is ever sent.
        attemptId: isMine ? entry.attemptId : null,
        scorePercent: showScore ? entry.attempt.scorePercent : null,
        correctCount: showScore ? entry.attempt.correctCount : null,
        secondsTaken: showScore ? secondsTaken(entry) : null,
      };
    }),
    outcome:
      bothFinished && viewerFinished
        ? { winnerSlot, isDraw: winnerSlot === null }
        : null,
  };
}

export async function listMyBattles(user: ArenaUser) {
  const rows = await prisma.arenaEntry.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: 'desc' },
    take: MY_BATTLES_LIMIT,
    select: {
      slot: true,
      playerName: true,
      joinedAt: true,
      challenge: {
        select: {
          code: true,
          totalQuestions: true,
          expiresAt: true,
          subject: { select: { id: true, name: true } },
          entries: { select: entrySelect, orderBy: { slot: 'asc' } },
        },
      },
    },
  });

  const battles = rows.map((row) => {
    const entries: EntryRow[] = row.challenge.entries;
    const me = entries.find((entry) => entry.slot === row.slot);
    const opponent = entries.find((entry) => entry.slot !== row.slot) ?? null;
    const iFinished = me ? isFinished(me) : false;

    let result: 'PLAYING' | 'WAITING' | 'WON' | 'LOST' | 'DRAW' | 'OPEN';
    if (!iFinished) result = 'PLAYING';
    else if (!opponent) result = 'OPEN';
    else if (!isFinished(opponent)) result = 'WAITING';
    else {
      const winner = decideWinner(entries[0], entries[1]);
      result = winner === null ? 'DRAW' : winner === row.slot ? 'WON' : 'LOST';
    }

    return {
      code: row.challenge.code,
      subject: row.challenge.subject,
      totalQuestions: row.challenge.totalQuestions,
      joinedAt: row.joinedAt,
      isExpired: row.challenge.expiresAt.getTime() < Date.now(),
      myName: row.playerName,
      myScorePercent: iFinished ? (me?.attempt.scorePercent ?? null) : null,
      opponentName: opponent?.playerName ?? null,
      // Same rule as the battle page: their score shows only once you have finished.
      opponentScorePercent:
        iFinished && opponent && isFinished(opponent) ? opponent.attempt.scorePercent : null,
      result,
    };
  });

  return { battles };
}
