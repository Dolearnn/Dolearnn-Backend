import {
  CurrentLevel,
  Prisma,
  QuestionStatus,
  QuizAttemptStatus,
  QuizMode,
  Role,
} from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import {
  getCatalogIndex,
  getQuestionPool,
  type PoolQuestion,
} from './quiz.cache';
import type {
  ListAttemptsQuery,
  ProgressQuery,
  StartAttemptInput,
  SubmitAttemptInput,
  WeakTopicsQuery,
} from './quiz.schemas';

type QuizUser = { id: string; role: Role };

type QuestionOption = { id: string; text: string };

type TopicBreakdown = {
  topicId: string;
  name: string;
  attempted: number;
  correct: number;
};

// A mock exam gives one minute per question.
const MOCK_SECONDS_PER_QUESTION = 60;
// Submissions arriving just after the timer still count (slow networks).
const SUBMIT_GRACE_MS = 30_000;
// In-progress attempts older than this are abandoned.
const STALE_ATTEMPT_MS = 12 * 60 * 60 * 1000;
// How many recent attempts to look at so a retake prefers unseen questions.
const RECENT_ATTEMPTS_FOR_VARIETY = 3;
// A topic needs this many answered questions before we call it weak.
const MIN_TOPIC_SAMPLE = 3;
const WEAK_TOPIC_BELOW_PERCENT = 60;
const SUGGEST_TUTORING_BELOW_PERCENT = 75;
// Progress looks at this many of a learner's most recent submitted attempts.
const PROGRESS_ATTEMPT_LIMIT = 200;
// A topic needs this many answered questions in both the first and the latest
// attempt before a before/after change is shown; fewer is just noise.
const MIN_TOPIC_COMPARE_SAMPLE = 2;
// A topic moving by at least this many points counts as improved or declined.
const TOPIC_CHANGE_POINTS = 10;
// How many recent scores to return per subject for the trend line.
const PROGRESS_TREND_POINTS = 10;

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickQuestionIds(pool: PoolQuestion[], count: number, seen: Set<string>) {
  const fresh = shuffle(pool.filter((question) => !seen.has(question.id)));
  const picked = fresh.slice(0, count);

  if (picked.length < count) {
    const repeats = shuffle(pool.filter((question) => seen.has(question.id)));
    picked.push(...repeats.slice(0, count - picked.length));
  }

  return shuffle(picked).map((question) => question.id);
}

function percent(correct: number, total: number) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function levelForScore(scorePercent: number): CurrentLevel {
  if (scorePercent < 40) return CurrentLevel.STRUGGLING;
  if (scorePercent < 70) return CurrentLevel.AVERAGE;
  return CurrentLevel.ABOVE_AVERAGE;
}

export async function assertOwnsStudent(user: QuizUser, studentId: string) {
  if (user.role !== Role.PARENT) {
    throw new AppError(403, 'Only family accounts can quiz on behalf of a student');
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, parent: { userId: user.id } },
    select: { id: true },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  return student.id;
}

// ---------------------------------------------------------------------------
// Questions as sent to the browser
// ---------------------------------------------------------------------------

export async function loadQuestionsInOrder(ids: string[], onlyPublished: boolean) {
  const rows = await prisma.question.findMany({
    where: {
      id: { in: ids },
      ...(onlyPublished ? { status: QuestionStatus.PUBLISHED } : {}),
    },
    select: {
      id: true,
      topicId: true,
      text: true,
      imageUrl: true,
      options: true,
      correctOptionId: true,
      explanation: true,
    },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

// The correct answer and explanation must never reach the browser while an
// attempt is in progress.
export function playableQuestion(row: {
  id: string;
  topicId: string;
  text: string;
  imageUrl: string | null;
  options: Prisma.JsonValue;
}) {
  return {
    id: row.id,
    topicId: row.topicId,
    text: row.text,
    imageUrl: row.imageUrl,
    options: row.options as QuestionOption[],
  };
}

export type AttemptRow = Prisma.QuizAttemptGetPayload<{
  include: { subject: { select: { id: true; name: true } } };
}>;

export function attemptSummary(attempt: AttemptRow) {
  return {
    id: attempt.id,
    mode: attempt.mode,
    status: attempt.status,
    subject: attempt.subject,
    examId: attempt.examId,
    studentId: attempt.studentId,
    totalQuestions: attempt.totalQuestions,
    timeLimitSecs: attempt.timeLimitSecs,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
  };
}

function tutoringSuggestion(
  attempt: Pick<AttemptRow, 'subject' | 'studentId'>,
  breakdown: TopicBreakdown[],
  scorePercent: number,
) {
  const weakTopics = breakdown
    .filter((topic) => topic.attempted >= 2)
    .map((topic) => ({
      topicId: topic.topicId,
      name: topic.name,
      accuracyPercent: percent(topic.correct, topic.attempted),
    }))
    .filter((topic) => topic.accuracyPercent < WEAK_TOPIC_BELOW_PERCENT)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
    .slice(0, 5);

  if (weakTopics.length === 0 || scorePercent >= SUGGEST_TUTORING_BELOW_PERCENT) {
    return null;
  }

  // Shaped like the intake form so the UI can pre-fill a tutoring request.
  return {
    weakTopics,
    prefill: {
      studentId: attempt.studentId,
      subject: attempt.subject.name,
      specificTopics: weakTopics.map((topic) => topic.name).join(', '),
      currentLevel: levelForScore(scorePercent),
    },
  };
}

// The learner's previous submitted attempt in the same subject, so a retake can
// show whether they improved. Served by the (userId, subjectId, startedAt) index.
async function previousAttemptComparison(attempt: AttemptRow, scorePercent: number) {
  if (!attempt.submittedAt) return null;

  const previous = await prisma.quizAttempt.findFirst({
    where: {
      userId: attempt.userId,
      studentId: attempt.studentId,
      subjectId: attempt.subjectId,
      status: QuizAttemptStatus.SUBMITTED,
      scorePercent: { not: null },
      submittedAt: { lt: attempt.submittedAt },
    },
    orderBy: { submittedAt: 'desc' },
    select: { scorePercent: true, submittedAt: true },
  });

  if (!previous || previous.scorePercent === null) return null;

  return {
    previousScorePercent: previous.scorePercent,
    previousSubmittedAt: previous.submittedAt,
    changePoints: scorePercent - previous.scorePercent,
  };
}

async function submittedAttemptView(attempt: AttemptRow) {
  const answers = (attempt.answers ?? {}) as Record<string, string>;
  const breakdown = (attempt.topicBreakdown ?? []) as TopicBreakdown[];
  const scorePercent = attempt.scorePercent ?? 0;
  const [questions, comparison] = await Promise.all([
    loadQuestionsInOrder(attempt.questionIds, false),
    previousAttemptComparison(attempt, scorePercent),
  ]);

  return {
    attempt: attemptSummary(attempt),
    result: {
      scorePercent,
      correctCount: attempt.correctCount ?? 0,
      totalQuestions: attempt.totalQuestions,
      timedOut: attempt.timedOut,
      topics: breakdown.map((topic) => ({
        ...topic,
        accuracyPercent: percent(topic.correct, topic.attempted),
      })),
      tutoring: tutoringSuggestion(attempt, breakdown, scorePercent),
      comparison,
    },
    review: questions.map((question) => {
      const yourAnswer = answers[question.id] ?? null;
      return {
        ...playableQuestion(question),
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
        yourAnswer,
        isCorrect: yourAnswer === question.correctOptionId,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Public catalog
// ---------------------------------------------------------------------------

export async function getCatalog() {
  const { catalog } = await getCatalogIndex();
  return catalog;
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

export async function startAttempt(user: QuizUser, input: StartAttemptInput) {
  const index = await getCatalogIndex();
  const subject = index.subjectsById.get(input.subjectId);

  if (!subject) {
    throw new AppError(404, 'Subject not found');
  }

  if (input.examId && !index.examIds.has(input.examId)) {
    throw new AppError(404, 'Exam not found');
  }

  let topicFilter: Set<string> | null = null;
  if (input.topicIds?.length) {
    const subjectTopicIds = new Set(subject.topics.map((topic) => topic.id));
    if (!input.topicIds.every((topicId) => subjectTopicIds.has(topicId))) {
      throw new AppError(400, 'One or more topics do not belong to this subject');
    }
    topicFilter = new Set(input.topicIds);
  }

  const studentId = input.studentId
    ? await assertOwnsStudent(user, input.studentId)
    : null;

  const pool = await getQuestionPool(input.examId ?? null, input.subjectId);
  const eligible = topicFilter
    ? pool.filter((question) => topicFilter.has(question.topicId))
    : pool;

  if (eligible.length === 0) {
    throw new AppError(404, 'No questions are available for this selection yet');
  }

  const [, recentAttempts] = await Promise.all([
    prisma.quizAttempt.updateMany({
      where: {
        userId: user.id,
        status: QuizAttemptStatus.IN_PROGRESS,
        startedAt: { lt: new Date(Date.now() - STALE_ATTEMPT_MS) },
      },
      data: { status: QuizAttemptStatus.EXPIRED },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, subjectId: input.subjectId, studentId },
      orderBy: { startedAt: 'desc' },
      take: RECENT_ATTEMPTS_FOR_VARIETY,
      select: { questionIds: true },
    }),
  ]);

  const seen = new Set(recentAttempts.flatMap((attempt) => attempt.questionIds));
  const count = Math.min(input.count, eligible.length);
  const questions = await loadQuestionsInOrder(
    pickQuestionIds(eligible, count, seen),
    true,
  );

  // The pool can be a few minutes stale; a question unpublished in the meantime
  // is dropped rather than served.
  if (questions.length === 0) {
    throw new AppError(404, 'No questions are available for this selection yet');
  }

  const isMock = input.mode === QuizMode.MOCK;
  const timeLimitSecs = isMock ? questions.length * MOCK_SECONDS_PER_QUESTION : null;
  const startedAt = new Date();

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      studentId,
      examId: input.examId ?? null,
      subjectId: input.subjectId,
      mode: input.mode,
      questionIds: questions.map((question) => question.id),
      totalQuestions: questions.length,
      timeLimitSecs,
      startedAt,
      expiresAt: timeLimitSecs ? new Date(startedAt.getTime() + timeLimitSecs * 1000) : null,
    },
    include: { subject: { select: { id: true, name: true } } },
  });

  return {
    attempt: attemptSummary(attempt),
    questions: questions.map(playableQuestion),
  };
}

async function findOwnAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { subject: { select: { id: true, name: true } } },
  });

  if (!attempt) {
    throw new AppError(404, 'Quiz attempt not found');
  }

  return attempt;
}

export async function getAttempt(user: QuizUser, attemptId: string) {
  const attempt = await findOwnAttempt(user.id, attemptId);

  if (attempt.status === QuizAttemptStatus.SUBMITTED) {
    return submittedAttemptView(attempt);
  }

  if (attempt.status === QuizAttemptStatus.EXPIRED) {
    throw new AppError(410, 'This quiz attempt has expired. Please start a new one.');
  }

  const questions = await loadQuestionsInOrder(attempt.questionIds, false);
  return {
    attempt: attemptSummary(attempt),
    questions: questions.map(playableQuestion),
  };
}

export async function submitAttempt(
  user: QuizUser,
  attemptId: string,
  input: SubmitAttemptInput,
) {
  const attempt = await findOwnAttempt(user.id, attemptId);

  // Submitting twice (e.g. a retry after a dropped connection) returns the
  // stored result instead of grading again.
  if (attempt.status === QuizAttemptStatus.SUBMITTED) {
    return submittedAttemptView(attempt);
  }

  if (attempt.status === QuizAttemptStatus.EXPIRED) {
    throw new AppError(410, 'This quiz attempt has expired. Please start a new one.');
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: attempt.questionIds } },
    select: {
      id: true,
      correctOptionId: true,
      topic: { select: { id: true, name: true } },
    },
  });

  if (questions.length === 0) {
    throw new AppError(409, 'The questions for this attempt are no longer available');
  }

  // Grade on the server. Skipped questions count as attempted-but-wrong so
  // they show up as weak spots. Answers for questions that were never served
  // are ignored.
  const answers: Record<string, string> = {};
  const topics = new Map<string, TopicBreakdown>();
  let correctCount = 0;

  for (const question of questions) {
    const chosen = input.answers[question.id];
    if (chosen !== undefined) answers[question.id] = chosen;

    const isCorrect = chosen === question.correctOptionId;
    if (isCorrect) correctCount += 1;

    const entry = topics.get(question.topic.id) ?? {
      topicId: question.topic.id,
      name: question.topic.name,
      attempted: 0,
      correct: 0,
    };
    entry.attempted += 1;
    if (isCorrect) entry.correct += 1;
    topics.set(question.topic.id, entry);
  }

  const breakdown = [...topics.values()];
  const scorePercent = percent(correctCount, questions.length);
  const submittedAt = new Date();
  const timedOut =
    attempt.expiresAt !== null &&
    submittedAt.getTime() > attempt.expiresAt.getTime() + SUBMIT_GRACE_MS;
  const learnerId = attempt.studentId ?? user.id;

  const claimed = await prisma.$transaction(async (tx) => {
    // Only one request can move the attempt out of IN_PROGRESS, so a double
    // tap or a retry can never count the same quiz twice.
    const update = await tx.quizAttempt.updateMany({
      where: {
        id: attempt.id,
        userId: user.id,
        status: QuizAttemptStatus.IN_PROGRESS,
      },
      data: {
        status: QuizAttemptStatus.SUBMITTED,
        submittedAt,
        correctCount,
        scorePercent,
        timedOut,
        answers,
        topicBreakdown: breakdown,
      },
    });

    if (update.count === 0) return false;

    // One statement updates every topic touched by this attempt.
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "UserTopicStat" ("learnerId", "topicId", "userId", "attempted", "correct", "lastAttemptAt")
      SELECT ${learnerId}::text, t."topicId", ${user.id}::text, t."attempted", t."correct", (NOW() AT TIME ZONE 'UTC')
      FROM unnest(
        ${breakdown.map((topic) => topic.topicId)}::text[],
        ${breakdown.map((topic) => topic.attempted)}::int[],
        ${breakdown.map((topic) => topic.correct)}::int[]
      ) AS t("topicId", "attempted", "correct")
      ON CONFLICT ("learnerId", "topicId") DO UPDATE SET
        "attempted" = "UserTopicStat"."attempted" + EXCLUDED."attempted",
        "correct" = "UserTopicStat"."correct" + EXCLUDED."correct",
        "lastAttemptAt" = EXCLUDED."lastAttemptAt"
    `);

    return true;
  });

  const saved = await findOwnAttempt(user.id, attempt.id);
  if (!claimed && saved.status !== QuizAttemptStatus.SUBMITTED) {
    throw new AppError(409, 'This quiz attempt could not be submitted. Please try again.');
  }

  return submittedAttemptView(saved);
}

export async function listAttempts(user: QuizUser, query: ListAttemptsQuery) {
  const rows = await prisma.quizAttempt.findMany({
    where: { userId: user.id, status: { not: QuizAttemptStatus.EXPIRED } },
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      mode: true,
      status: true,
      studentId: true,
      totalQuestions: true,
      correctCount: true,
      scorePercent: true,
      startedAt: true,
      submittedAt: true,
      subject: { select: { id: true, name: true } },
    },
  });

  const hasMore = rows.length > query.limit;
  const attempts = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    attempts,
    nextCursor: hasMore ? attempts[attempts.length - 1].id : null,
  };
}

// ---------------------------------------------------------------------------
// Weak topics
// ---------------------------------------------------------------------------

export async function getWeakTopics(user: QuizUser, query: WeakTopicsQuery) {
  const learnerId = query.studentId
    ? await assertOwnsStudent(user, query.studentId)
    : user.id;

  const stats = await prisma.userTopicStat.findMany({
    where: {
      learnerId,
      userId: user.id,
      attempted: { gte: MIN_TOPIC_SAMPLE },
    },
    select: {
      attempted: true,
      correct: true,
      lastAttemptAt: true,
      topic: {
        select: {
          id: true,
          name: true,
          subject: { select: { id: true, name: true } },
        },
      },
    },
  });

  const topics = stats
    .map((stat) => {
      const accuracyPercent = percent(stat.correct, stat.attempted);
      return {
        topicId: stat.topic.id,
        name: stat.topic.name,
        subject: stat.topic.subject,
        attempted: stat.attempted,
        correct: stat.correct,
        accuracyPercent,
        isWeak: accuracyPercent < WEAK_TOPIC_BELOW_PERCENT,
        lastAttemptAt: stat.lastAttemptAt,
      };
    })
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
    .slice(0, 50);

  // One tutoring suggestion per subject that has weak topics, shaped like the
  // intake form so the UI can pre-fill a request.
  const bySubject = new Map<string, typeof topics>();
  for (const topic of topics.filter((entry) => entry.isWeak)) {
    const list = bySubject.get(topic.subject.id) ?? [];
    list.push(topic);
    bySubject.set(topic.subject.id, list);
  }

  const tutoring = [...bySubject.values()].map((weak) => {
    const subjectTopics = topics.filter(
      (topic) => topic.subject.id === weak[0].subject.id,
    );
    const attempted = subjectTopics.reduce((sum, topic) => sum + topic.attempted, 0);
    const correct = subjectTopics.reduce((sum, topic) => sum + topic.correct, 0);

    return {
      subject: weak[0].subject,
      weakTopics: weak.slice(0, 5).map((topic) => ({
        topicId: topic.topicId,
        name: topic.name,
        accuracyPercent: topic.accuracyPercent,
      })),
      prefill: {
        studentId: query.studentId ?? null,
        subject: weak[0].subject.name,
        specificTopics: weak
          .slice(0, 5)
          .map((topic) => topic.name)
          .join(', '),
        currentLevel: levelForScore(percent(correct, attempted)),
      },
    };
  });

  return { topics, tutoring };
}

// ---------------------------------------------------------------------------
// Progress (reassessment)
// ---------------------------------------------------------------------------

type ProgressTopicPoint = { attempted: number; correct: number };

type TopicChange = 'improved' | 'declined' | 'steady';

// Compares how a learner did the first time against the latest time, per
// subject and per topic, using the per-attempt breakdown already stored on each
// submitted attempt (no extra writes and no schema change).
export async function getProgress(user: QuizUser, query: ProgressQuery) {
  const studentId = query.studentId
    ? await assertOwnsStudent(user, query.studentId)
    : null;

  const rows = await prisma.quizAttempt.findMany({
    where: {
      userId: user.id,
      studentId,
      status: QuizAttemptStatus.SUBMITTED,
      scorePercent: { not: null },
    },
    orderBy: { startedAt: 'desc' },
    take: PROGRESS_ATTEMPT_LIMIT,
    select: {
      id: true,
      subjectId: true,
      scorePercent: true,
      submittedAt: true,
      topicBreakdown: true,
      subject: { select: { id: true, name: true } },
    },
  });

  // Oldest first, so the first entry is the baseline and the last is the latest.
  const attempts = rows.reverse();

  const bySubject = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const list = bySubject.get(attempt.subjectId) ?? [];
    list.push(attempt);
    bySubject.set(attempt.subjectId, list);
  }

  const subjects = [...bySubject.values()].map((list) => {
    const first = list[0];
    const latest = list[list.length - 1];
    const baselinePercent = first.scorePercent ?? 0;
    const latestPercent = latest.scorePercent ?? 0;

    const topicPoints = new Map<
      string,
      { name: string; runs: number; first: ProgressTopicPoint; latest: ProgressTopicPoint }
    >();

    for (const attempt of list) {
      const breakdown = (attempt.topicBreakdown ?? []) as TopicBreakdown[];
      for (const topic of breakdown) {
        const point = { attempted: topic.attempted, correct: topic.correct };
        const existing = topicPoints.get(topic.topicId);
        if (existing) {
          existing.runs += 1;
          existing.latest = point;
        } else {
          topicPoints.set(topic.topicId, {
            name: topic.name,
            runs: 1,
            first: point,
            latest: point,
          });
        }
      }
    }

    const topics = [...topicPoints.entries()]
      .filter(
        ([, topic]) =>
          topic.runs >= 2 &&
          topic.first.attempted >= MIN_TOPIC_COMPARE_SAMPLE &&
          topic.latest.attempted >= MIN_TOPIC_COMPARE_SAMPLE,
      )
      .map(([topicId, topic]) => {
        const baseline = percent(topic.first.correct, topic.first.attempted);
        const latestTopic = percent(topic.latest.correct, topic.latest.attempted);
        const changePoints = latestTopic - baseline;
        const change: TopicChange =
          changePoints >= TOPIC_CHANGE_POINTS
            ? 'improved'
            : changePoints <= -TOPIC_CHANGE_POINTS
              ? 'declined'
              : 'steady';
        return {
          topicId,
          name: topic.name,
          attempts: topic.runs,
          baselinePercent: baseline,
          latestPercent: latestTopic,
          changePoints,
          change,
        };
      })
      .sort((a, b) => b.changePoints - a.changePoints);

    return {
      subject: first.subject,
      attempts: list.length,
      baselinePercent,
      latestPercent,
      // Only a real comparison once there are two attempts to compare.
      changePoints: list.length >= 2 ? latestPercent - baselinePercent : null,
      trend: list.slice(-PROGRESS_TREND_POINTS).map((attempt) => ({
        attemptId: attempt.id,
        submittedAt: attempt.submittedAt,
        scorePercent: attempt.scorePercent ?? 0,
      })),
      topics,
    };
  });

  subjects.sort((a, b) => b.attempts - a.attempts);

  const comparable = subjects.filter((subject) => subject.changePoints !== null);

  return {
    totalAttempts: attempts.length,
    subjects,
    summary: {
      subjectsCompared: comparable.length,
      subjectsImproved: comparable.filter((subject) => (subject.changePoints ?? 0) > 0)
        .length,
      topicsImproved: subjects.reduce(
        (sum, subject) => sum + subject.topics.filter((t) => t.change === 'improved').length,
        0,
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Next best actions
// ---------------------------------------------------------------------------

// Plain rules, no AI: the same results always give the same advice, and the
// advice can be explained to a student, a parent or a funder.
const REASSESS_AFTER_DAYS = 7;
const MAX_NEXT_ACTIONS = 4;
const MAX_PRACTISE_ACTIONS = 2;
const MISSION_QUESTION_COUNT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

type NextActionStart = {
  subjectId: string;
  topicIds?: string[];
  count: number;
  mode: QuizMode;
};

type NextAction = {
  id: string;
  type: 'DIAGNOSTIC' | 'PRACTISE_TOPIC' | 'TUTOR' | 'REASSESS';
  title: string;
  reason: string;
  start: NextActionStart | null;
  tutoring: {
    weakTopics: Array<{ topicId: string; name: string; accuracyPercent: number }>;
    prefill: {
      studentId: string | null;
      subject: string;
      specificTopics: string;
      currentLevel: CurrentLevel;
    };
  } | null;
};

export async function getNextActions(user: QuizUser, query: ProgressQuery) {
  const [progress, weak] = await Promise.all([
    getProgress(user, query),
    getWeakTopics(user, query),
  ]);

  if (progress.totalAttempts === 0) {
    return {
      actions: [
        {
          id: 'diagnostic',
          type: 'DIAGNOSTIC',
          title: 'Take a diagnostic quiz',
          reason:
            'Pick a subject and answer a few questions. The results show which topics need work first.',
          start: null,
          tutoring: null,
        },
      ] satisfies NextAction[],
    };
  }

  const actions: NextAction[] = [];
  const now = Date.now();

  // 1. Struggle that has persisted across two or more quizzes goes to a tutor.
  for (const subject of progress.subjects) {
    const persistent = subject.topics.filter((topic) => topic.latestPercent < WEAK_TOPIC_BELOW_PERCENT);
    const suggestion = weak.tutoring.find((entry) => entry.subject.id === subject.subject.id);
    if (persistent.length === 0 || !suggestion) continue;

    actions.push({
      id: `tutor-${subject.subject.id}`,
      type: 'TUTOR',
      title: `Get a tutor for ${subject.subject.name}`,
      reason: `${persistent
        .slice(0, 3)
        .map((topic) => topic.name)
        .join(', ')} stayed below ${WEAK_TOPIC_BELOW_PERCENT}% across ${Math.max(
        ...persistent.map((topic) => topic.attempts),
      )} quizzes. Practice alone may not be enough here.`,
      start: null,
      tutoring: {
        weakTopics: persistent.slice(0, 5).map((topic) => ({
          topicId: topic.topicId,
          name: topic.name,
          accuracyPercent: topic.latestPercent,
        })),
        prefill: {
          ...suggestion.prefill,
          specificTopics: persistent
            .slice(0, 5)
            .map((topic) => topic.name)
            .join(', '),
        },
      },
    });
  }

  // 2. A short mission for the weakest topics that are not already going to a tutor.
  const tutoredTopicIds = new Set(
    actions.flatMap((action) => action.tutoring?.weakTopics.map((topic) => topic.topicId) ?? []),
  );
  weak.topics
    .filter((topic) => topic.isWeak && !tutoredTopicIds.has(topic.topicId))
    .slice(0, MAX_PRACTISE_ACTIONS)
    .forEach((topic) => {
      actions.push({
        id: `practise-${topic.topicId}`,
        type: 'PRACTISE_TOPIC',
        title: `Practise ${topic.name}`,
        reason: `${topic.subject.name}: you got ${topic.correct} of ${topic.attempted} right (${topic.accuracyPercent}%). A ${MISSION_QUESTION_COUNT}-question mission on just this topic.`,
        start: {
          subjectId: topic.subject.id,
          topicIds: [topic.topicId],
          count: MISSION_QUESTION_COUNT,
          mode: QuizMode.PRACTICE,
        },
        tutoring: null,
      });
    });

  // 3. Reassess: one quiz cannot show progress, and old results go stale.
  for (const subject of progress.subjects) {
    const last = subject.trend[subject.trend.length - 1];
    const lastAt = last?.submittedAt ? new Date(last.submittedAt).getTime() : now;
    const daysSince = Math.floor((now - lastAt) / DAY_MS);

    let reason: string | null = null;
    if (subject.attempts === 1) {
      reason = 'You have taken one quiz here. A second one shows whether you are improving.';
    } else if (daysSince >= REASSESS_AFTER_DAYS) {
      reason = `Your last ${subject.subject.name} quiz was ${daysSince} days ago. Retake it to measure progress.`;
    }
    if (!reason) continue;

    actions.push({
      id: `reassess-${subject.subject.id}`,
      type: 'REASSESS',
      title: `Reassess ${subject.subject.name}`,
      reason,
      start: {
        subjectId: subject.subject.id,
        count: 10,
        mode: QuizMode.PRACTICE,
      },
      tutoring: null,
    });
  }

  return { actions: actions.slice(0, MAX_NEXT_ACTIONS) };
}
