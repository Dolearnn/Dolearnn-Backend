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
import {
  subjectList,
  type ListAttemptsQuery,
  type ProgressQuery,
  type StartAttemptInput,
  type SubmitAttemptInput,
  type WeakTopicsQuery,
} from './quiz.schemas';

type QuizUser = { id: string; role: Role };

type QuestionOption = { id: string; text: string };

type TopicBreakdown = {
  topicId: string;
  // Stored since mixed-subject exams; older attempts are looked up in the catalog.
  subjectId?: string;
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
// How many recent attempts "Fix my mistakes" looks through.
const MISTAKE_ATTEMPTS_LOOKED_AT = 30;
// A topic needs this many answered questions before we call it weak.
export const MIN_TOPIC_SAMPLE = 3;
const WEAK_TOPIC_BELOW_PERCENT = 60;
// A retake asks about as many questions as the original did on the same topics.
const RETAKE_MIN_QUESTIONS = 5;
const RETAKE_MAX_QUESTIONS = 20;
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

export type AttemptSubject = { id: string; name: string };

/** The subjects an attempt covers, in order. One entry unless it is a mixed exam. */
export async function attemptSubjects(attempt: {
  subject: AttemptSubject;
  subjectIds: string[];
}): Promise<AttemptSubject[]> {
  if (attempt.subjectIds.length <= 1) return [attempt.subject];
  const index = await getCatalogIndex();
  return attempt.subjectIds.map((id) => ({
    id,
    name: index.subjectsById.get(id)?.name ?? 'Subject',
  }));
}

/** "Mathematics", or "English + Physics + Chemistry" for a mixed exam. */
export function subjectLabel(subjects: AttemptSubject[]) {
  return subjects.map((subject) => subject.name).join(' + ');
}

/** Earlier attempts comparable with this one: same subject, or the same mix of subjects. */
export function sameSubjectsWhere(attempt: { subjectId: string; subjectIds: string[] }) {
  return attempt.subjectIds.length > 1
    ? { subjectIds: { equals: attempt.subjectIds }, isReview: false }
    : { subjectId: attempt.subjectId, subjectIds: { isEmpty: true }, isReview: false };
}

function topicSubjectId(topic: TopicBreakdown, subjectIdByTopicId: Map<string, string>) {
  return topic.subjectId ?? subjectIdByTopicId.get(topic.topicId) ?? null;
}

export function attemptSummary(attempt: AttemptRow, subjects: AttemptSubject[] = [attempt.subject]) {
  const mixed = subjects.length > 1;
  return {
    id: attempt.id,
    mode: attempt.mode,
    status: attempt.status,
    // For a mixed exam the name lists every subject, so headings read naturally.
    subject: mixed ? { id: attempt.subject.id, name: subjectLabel(subjects) } : attempt.subject,
    subjects,
    examId: attempt.examId,
    studentId: attempt.studentId,
    totalQuestions: attempt.totalQuestions,
    timeLimitSecs: attempt.timeLimitSecs,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    retakeOfAttemptId: attempt.retakeOfAttemptId,
  };
}

function tutoringSuggestion(
  attempt: Pick<AttemptRow, 'subject' | 'studentId'>,
  breakdown: TopicBreakdown[],
  scorePercent: number,
  subjects: AttemptSubject[],
) {
  const weakTopics = breakdown
    .filter((topic) => topic.attempted >= 2)
    .map((topic) => ({
      topicId: topic.topicId,
      subjectId: topic.subjectId ?? attempt.subject.id,
      name: topic.name,
      accuracyPercent: percent(topic.correct, topic.attempted),
    }))
    .filter((topic) => topic.accuracyPercent < WEAK_TOPIC_BELOW_PERCENT)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
    .slice(0, 5);

  if (weakTopics.length === 0 || scorePercent >= SUGGEST_TUTORING_BELOW_PERCENT) {
    return null;
  }

  // A tutor request is for one subject: in a mixed exam, the one with the weakest topic.
  const focusSubject =
    subjects.find((subject) => subject.id === weakTopics[0].subjectId) ?? attempt.subject;
  const focusTopics = weakTopics.filter((topic) => topic.subjectId === focusSubject.id);

  // Shaped like the intake form so the UI can pre-fill a tutoring request.
  return {
    weakTopics: weakTopics.map((topic) => ({
      topicId: topic.topicId,
      name: topic.name,
      accuracyPercent: topic.accuracyPercent,
    })),
    prefill: {
      studentId: attempt.studentId,
      subject: focusSubject.name,
      specificTopics: (focusTopics.length ? focusTopics : weakTopics).map((topic) => topic.name).join(', '),
      currentLevel: levelForScore(scorePercent),
    },
  };
}

// The learner's previous submitted attempt in the same subject, so a retake can
// show whether they improved. Served by the (userId, subjectId, startedAt) index.
async function previousAttemptComparison(attempt: AttemptRow, scorePercent: number) {
  if (!attempt.submittedAt || attempt.isReview) return null;

  const previous = await prisma.quizAttempt.findFirst({
    where: {
      userId: attempt.userId,
      studentId: attempt.studentId,
      ...sameSubjectsWhere(attempt),
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

// Before vs after for a retake: each topic the retake covered, scored in the
// original attempt and in the retake. Totals use only those topics, so the
// comparison is like for like.
async function retakeComparison(attempt: AttemptRow, breakdown: TopicBreakdown[]) {
  if (!attempt.retakeOfAttemptId) return null;

  const original = await prisma.quizAttempt.findFirst({
    where: { id: attempt.retakeOfAttemptId, userId: attempt.userId },
    select: { id: true, submittedAt: true, topicBreakdown: true },
  });
  if (!original) return null;

  const before = new Map(
    ((original.topicBreakdown ?? []) as TopicBreakdown[]).map((topic) => [topic.topicId, topic]),
  );
  const topics = breakdown
    .filter((topic) => before.has(topic.topicId))
    .map((topic) => {
      const was = before.get(topic.topicId)!;
      return {
        topicId: topic.topicId,
        name: topic.name,
        beforePercent: percent(was.correct, was.attempted),
        afterPercent: percent(topic.correct, topic.attempted),
      };
    });
  if (topics.length === 0) return null;

  const sum = (list: TopicBreakdown[], key: 'correct' | 'attempted') =>
    list.reduce((total, topic) => total + topic[key], 0);
  const covered = new Set(topics.map((topic) => topic.topicId));
  const beforeTopics = [...before.values()].filter((topic) => covered.has(topic.topicId));
  const afterTopics = breakdown.filter((topic) => covered.has(topic.topicId));
  const beforePercent = percent(sum(beforeTopics, 'correct'), sum(beforeTopics, 'attempted'));
  const afterPercent = percent(sum(afterTopics, 'correct'), sum(afterTopics, 'attempted'));

  return {
    originalAttemptId: original.id,
    originalSubmittedAt: original.submittedAt,
    beforePercent,
    afterPercent,
    changePoints: afterPercent - beforePercent,
    topics,
  };
}

async function submittedAttemptView(attempt: AttemptRow) {
  const answers = (attempt.answers ?? {}) as Record<string, string>;
  const index = await getCatalogIndex();
  const breakdown = ((attempt.topicBreakdown ?? []) as TopicBreakdown[]).map((topic) => ({
    ...topic,
    subjectId: topicSubjectId(topic, index.subjectIdByTopicId) ?? attempt.subjectId,
  }));
  const scorePercent = attempt.scorePercent ?? 0;
  const [questions, comparison, retake, subjects] = await Promise.all([
    loadQuestionsInOrder(attempt.questionIds, false),
    previousAttemptComparison(attempt, scorePercent),
    retakeComparison(attempt, breakdown),
    attemptSubjects(attempt),
  ]);

  return {
    attempt: attemptSummary(attempt, subjects),
    result: {
      scorePercent,
      correctCount: attempt.correctCount ?? 0,
      totalQuestions: attempt.totalQuestions,
      timedOut: attempt.timedOut,
      topics: breakdown.map((topic) => ({
        ...topic,
        accuracyPercent: percent(topic.correct, topic.attempted),
      })),
      tutoring: tutoringSuggestion(attempt, breakdown, scorePercent, subjects),
      // Score per subject, for a mixed exam.
      subjects:
        subjects.length > 1
          ? subjects.map((subject) => {
              const topics = breakdown.filter((topic) => topic.subjectId === subject.id);
              const attempted = topics.reduce((sum, topic) => sum + topic.attempted, 0);
              const correct = topics.reduce((sum, topic) => sum + topic.correct, 0);
              return { ...subject, attempted, correct, scorePercent: percent(correct, attempted) };
            })
          : null,
      comparison,
      retake,
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

// Turns a retake request into a normal start request: same learner, subject and
// exam as the original, limited to the topics it found weak (all of its topics
// when none were weak), with about as many questions as the original asked on
// them. Questions from the original are avoided when the pool allows.
async function retakePlan(user: QuizUser, input: StartAttemptInput) {
  const original = await findOwnAttempt(user.id, input.retakeOfAttemptId!);
  if (original.status !== QuizAttemptStatus.SUBMITTED) {
    throw new AppError(409, 'Finish this quiz before retaking it');
  }

  const breakdown = (original.topicBreakdown ?? []) as TopicBreakdown[];
  const weak = breakdown.filter(
    (topic) => percent(topic.correct, topic.attempted) < WEAK_TOPIC_BELOW_PERCENT,
  );
  const targets = weak.length > 0 ? weak : breakdown;
  if (targets.length === 0) {
    throw new AppError(409, 'This quiz has no topics to retake');
  }
  const asked = targets.reduce((sum, topic) => sum + topic.attempted, 0);

  return {
    input: {
      ...input,
      subjectId: original.subjectId,
      subjectIds: original.subjectIds.length > 1 ? original.subjectIds : undefined,
      examId: original.examId ?? undefined,
      studentId: original.studentId ?? undefined,
      topicIds: targets.map((topic) => topic.topicId),
      count: Math.min(Math.max(asked, RETAKE_MIN_QUESTIONS), RETAKE_MAX_QUESTIONS),
      mode: QuizMode.PRACTICE,
    },
    originalId: original.id,
    avoid: original.questionIds,
  };
}

// ---------------------------------------------------------------------------
// Fix my mistakes
// ---------------------------------------------------------------------------

// Nigeria is UTC+1 all year.
function lagosDay(date: Date) {
  return new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Questions whose latest answer was wrong. They come back from the next day
 * (a gap helps the right answer stick, and gives a reason to return):
 * `due` can be retried now, oldest first; `tomorrow` were missed today.
 */
async function collectMistakes(userId: string, studentId: string | null) {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      studentId,
      status: QuizAttemptStatus.SUBMITTED,
      submittedAt: { not: null },
    },
    orderBy: { submittedAt: 'desc' },
    take: MISTAKE_ATTEMPTS_LOOKED_AT,
    select: { questionIds: true, answers: true, submittedAt: true },
  });

  // Newest first, so the first answer seen for a question is its latest.
  const latest = new Map<string, { chosen: string; at: Date }>();
  for (const attempt of attempts) {
    const answers = (attempt.answers ?? {}) as Record<string, string>;
    for (const questionId of attempt.questionIds) {
      const chosen = answers[questionId];
      if (chosen !== undefined && !latest.has(questionId)) {
        latest.set(questionId, { chosen, at: attempt.submittedAt! });
      }
    }
  }
  if (latest.size === 0) return { due: [], tomorrow: 0 };

  const questions = await prisma.question.findMany({
    where: { id: { in: [...latest.keys()] }, status: QuestionStatus.PUBLISHED },
    select: { id: true, subjectId: true, correctOptionId: true },
  });

  const today = lagosDay(new Date());
  const missed = questions
    .filter((question) => latest.get(question.id)!.chosen !== question.correctOptionId)
    .map((question) => ({
      id: question.id,
      subjectId: question.subjectId,
      at: latest.get(question.id)!.at,
    }));
  const due = missed
    .filter((question) => lagosDay(question.at) < today)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  return { due, tomorrow: missed.length - due.length };
}

async function startMistakesReview(user: QuizUser, input: StartAttemptInput) {
  const studentId = input.studentId ? await assertOwnsStudent(user, input.studentId) : null;
  const { due } = await collectMistakes(user.id, studentId);
  if (due.length === 0) {
    throw new AppError(404, 'You have no mistakes to fix right now. Well done.');
  }

  const chosen = due.slice(0, input.count);
  const subjectIds = [...new Set(chosen.map((question) => question.subjectId))];
  // Grouped by subject, so the quiz has the same subject sections as a mixed exam.
  const questions = await loadQuestionsInOrder(
    subjectIds.flatMap((subjectId) =>
      chosen.filter((question) => question.subjectId === subjectId).map((question) => question.id),
    ),
    true,
  );
  if (questions.length === 0) {
    throw new AppError(404, 'You have no mistakes to fix right now. Well done.');
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      studentId,
      subjectId: subjectIds[0],
      subjectIds: subjectIds.length > 1 ? subjectIds : [],
      isReview: true,
      mode: QuizMode.PRACTICE,
      questionIds: questions.map((question) => question.id),
      totalQuestions: questions.length,
    },
    include: { subject: { select: { id: true, name: true } } },
  });

  return {
    attempt: attemptSummary(attempt, await attemptSubjects(attempt)),
    questions: questions.map(playableQuestion),
  };
}

export async function startAttempt(user: QuizUser, requested: StartAttemptInput) {
  if (requested.reviewMistakes) return startMistakesReview(user, requested);

  const retake = requested.retakeOfAttemptId ? await retakePlan(user, requested) : null;
  const input = retake?.input ?? requested;
  const index = await getCatalogIndex();
  const subjectIds = subjectList(input);
  const subjects = subjectIds.map((id) => index.subjectsById.get(id));

  if (subjectIds.length === 0 || subjects.some((subject) => !subject)) {
    throw new AppError(404, 'Subject not found');
  }

  if (input.examId && !index.examIds.has(input.examId)) {
    throw new AppError(404, 'Exam not found');
  }

  // Topics may come from any chosen subject. A subject with none picked keeps
  // all of its topics.
  const topicIds = new Set(input.topicIds ?? []);
  const subjectsWithPickedTopics = new Set<string>();
  for (const topicId of topicIds) {
    const owner = index.subjectIdByTopicId.get(topicId);
    if (!owner || !subjectIds.includes(owner)) {
      throw new AppError(400, 'One or more topics do not belong to the chosen subjects');
    }
    subjectsWithPickedTopics.add(owner);
  }

  const studentId = input.studentId
    ? await assertOwnsStudent(user, input.studentId)
    : null;

  const pools = await Promise.all(
    subjectIds.map(async (subjectId) => {
      const pool = await getQuestionPool(input.examId ?? null, subjectId);
      return subjectsWithPickedTopics.has(subjectId)
        ? pool.filter((question) => topicIds.has(question.topicId))
        : pool;
    }),
  );

  const emptyAt = pools.findIndex((pool) => pool.length === 0);
  if (emptyAt !== -1) {
    throw new AppError(
      404,
      subjectIds.length > 1
        ? `No questions are available for ${subjects[emptyAt]!.name} in this selection yet`
        : 'No questions are available for this selection yet',
    );
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
      where: { userId: user.id, subjectId: { in: subjectIds }, studentId },
      orderBy: { startedAt: 'desc' },
      take: RECENT_ATTEMPTS_FOR_VARIETY,
      select: { questionIds: true },
    }),
  ]);

  const seen = new Set([
    ...recentAttempts.flatMap((attempt) => attempt.questionIds),
    ...(retake?.avoid ?? []),
  ]);
  // Share the questions evenly between subjects (a subject short of questions
  // passes its share on), then keep each subject together, like a real paper.
  const quotas = shareQuestions(input.count, pools.map((pool) => pool.length));
  const questions = await loadQuestionsInOrder(
    pools.flatMap((pool, i) => pickQuestionIds(pool, quotas[i], seen)),
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
      subjectId: subjectIds[0],
      subjectIds: subjectIds.length > 1 ? subjectIds : [],
      mode: input.mode,
      questionIds: questions.map((question) => question.id),
      totalQuestions: questions.length,
      timeLimitSecs,
      startedAt,
      expiresAt: timeLimitSecs ? new Date(startedAt.getTime() + timeLimitSecs * 1000) : null,
      retakeOfAttemptId: retake?.originalId ?? null,
    },
    include: { subject: { select: { id: true, name: true } } },
  });

  return {
    attempt: attemptSummary(attempt, await attemptSubjects(attempt)),
    questions: questions.map(playableQuestion),
  };
}

/** Splits `total` questions between subjects as evenly as their pool sizes allow. */
export function shareQuestions(total: number, available: number[]) {
  const quotas = available.map(() => 0);
  let left = Math.min(total, available.reduce((sum, n) => sum + n, 0));
  while (left > 0) {
    const open = available.flatMap((n, i) => (quotas[i] < n ? [i] : []));
    const each = Math.max(1, Math.floor(left / open.length));
    for (const i of open) {
      if (left === 0) break;
      const add = Math.min(each, available[i] - quotas[i], left);
      quotas[i] += add;
      left -= add;
    }
  }
  return quotas;
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
    attempt: attemptSummary(attempt, await attemptSubjects(attempt)),
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
      topic: { select: { id: true, name: true, subjectId: true } },
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
      subjectId: question.topic.subjectId,
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
      subjectIds: true,
      subject: { select: { id: true, name: true } },
    },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const attempts = await Promise.all(
    page.map(async ({ subjectIds, ...attempt }) => {
      const subjects = await attemptSubjects({ subject: attempt.subject, subjectIds });
      return {
        ...attempt,
        subject:
          subjects.length > 1
            ? { id: attempt.subject.id, name: subjectLabel(subjects) }
            : attempt.subject,
        subjects,
      };
    }),
  );

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
      isReview: false,
    },
    orderBy: { startedAt: 'desc' },
    take: PROGRESS_ATTEMPT_LIMIT,
    select: {
      id: true,
      subjectId: true,
      scorePercent: true,
      submittedAt: true,
      topicBreakdown: true,
      subjectIds: true,
      subject: { select: { id: true, name: true } },
    },
  });

  // Oldest first, so the first entry is the baseline and the last is the latest.
  // A mixed exam counts once per subject, scored on that subject's questions.
  const index = await getCatalogIndex();
  const attempts = rows.reverse().flatMap((attempt) => {
    if (attempt.subjectIds.length <= 1) return [attempt];
    const breakdown = (attempt.topicBreakdown ?? []) as TopicBreakdown[];
    return attempt.subjectIds.flatMap((subjectId) => {
      const topics = breakdown.filter(
        (topic) => topicSubjectId(topic, index.subjectIdByTopicId) === subjectId,
      );
      if (topics.length === 0) return [];
      const attempted = topics.reduce((sum, topic) => sum + topic.attempted, 0);
      const correct = topics.reduce((sum, topic) => sum + topic.correct, 0);
      return [
        {
          ...attempt,
          subjectId,
          subject: { id: subjectId, name: index.subjectsById.get(subjectId)?.name ?? 'Subject' },
          scorePercent: percent(correct, attempted),
          topicBreakdown: topics as unknown as Prisma.JsonValue,
        },
      ];
    });
  });

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
    totalAttempts: rows.length,
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
  subjectId?: string;
  reviewMistakes?: boolean;
  topicIds?: string[];
  count: number;
  mode: QuizMode;
};

type NextAction = {
  id: string;
  type: 'DIAGNOSTIC' | 'FIX_MISTAKES' | 'PRACTISE_TOPIC' | 'TUTOR' | 'REASSESS';
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

type ProgressResult = Awaited<ReturnType<typeof getProgress>>;
type WeakTopicsResult = Awaited<ReturnType<typeof getWeakTopics>>;

function buildNextActions(progress: ProgressResult, weak: WeakTopicsResult, mistakesDue: number) {
  if (progress.totalAttempts === 0) {
    return {
      actions: [
        {
          id: 'diagnostic',
          type: 'DIAGNOSTIC',
          title: 'Take your first quiz',
          reason:
            'Pick a subject and answer a few questions. The results show which topics need work first.',
          start: null,
          tutoring: null,
        },
      ] satisfies NextAction[],
    };
  }

  const reviewActions: NextAction[] = [];
  if (mistakesDue > 0) {
    const count = Math.min(mistakesDue, MISSION_QUESTION_COUNT);
    reviewActions.push({
      id: 'fix-mistakes',
      type: 'FIX_MISTAKES',
      title: `Fix ${count} ${count === 1 ? 'question' : 'questions'} you got wrong`,
      reason: 'From your earlier quizzes. Trying them again a day later helps the right answer stick.',
      start: { reviewMistakes: true, count: MISSION_QUESTION_COUNT, mode: QuizMode.PRACTICE },
      tutoring: null,
    });
  }

  const practiceActions: NextAction[] = [];
  const reassessmentActions: NextAction[] = [];
  const supportActions: NextAction[] = [];
  const now = Date.now();

  // Work out where human support may be useful, but keep it behind the
  // learning actions. A teacher is an intervention after repeated evidence,
  // not the first destination after a low score.
  for (const subject of progress.subjects) {
    const persistent = subject.topics.filter((topic) => topic.latestPercent < WEAK_TOPIC_BELOW_PERCENT);
    const suggestion = weak.tutoring.find((entry) => entry.subject.id === subject.subject.id);
    if (persistent.length === 0 || !suggestion) continue;

    supportActions.push({
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

  // 1. Give every weak topic a short, focused mission, including topics that
  // may also need a teacher. Practice remains the student's next action.
  weak.topics
    .filter((topic) => topic.isWeak)
    .slice(0, MAX_PRACTISE_ACTIONS)
    .forEach((topic) => {
      practiceActions.push({
        id: `practise-${topic.topicId}`,
        type: 'PRACTISE_TOPIC',
        title: `Practise ${topic.name}`,
        reason: `${topic.subject.name}: you got ${topic.correct} of ${topic.attempted} right (${topic.accuracyPercent}%). ${MISSION_QUESTION_COUNT} questions on just this topic.`,
        start: {
          subjectId: topic.subject.id,
          topicIds: [topic.topicId],
          count: MISSION_QUESTION_COUNT,
          mode: QuizMode.PRACTICE,
        },
        tutoring: null,
      });
    });

  // 2. Reassess: one quiz cannot show progress, and old results go stale.
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

    reassessmentActions.push({
      id: `reassess-${subject.subject.id}`,
      type: 'REASSESS',
      title: `Test yourself again in ${subject.subject.name}`,
      reason,
      start: {
        subjectId: subject.subject.id,
        count: 10,
        mode: QuizMode.PRACTICE,
      },
      tutoring: null,
    });
  }

  // Preserve room for one support recommendation without allowing it to take
  // over the learning plan. The API order is also the visual priority in the
  // student experience: practise, reassess, then get human support if needed.
  const learningActions = [...reviewActions, ...practiceActions, ...reassessmentActions];
  const actions = [
    ...learningActions.slice(0, supportActions.length > 0 ? MAX_NEXT_ACTIONS - 1 : MAX_NEXT_ACTIONS),
    ...supportActions.slice(0, 1),
  ];

  return { actions };
}

export async function getNextActions(user: QuizUser, query: ProgressQuery) {
  const [progress, weak, mistakes] = await Promise.all([
    getProgress(user, query),
    getWeakTopics(user, query),
    collectMistakes(user.id, query.studentId ?? null),
  ]);
  return buildNextActions(progress, weak, mistakes.due.length);
}

// One round trip for the practice home. The independent database reads run in
// parallel, and next actions reuse the same progress and weak-topic results
// instead of querying them a second time.
export async function getPracticeOverview(user: QuizUser, query: ProgressQuery) {
  const [rawCatalog, history, progress, weak, learnerProfile, mistakes] = await Promise.all([
    getCatalog(),
    listAttempts(user, { limit: 6 }),
    getProgress(user, query),
    getWeakTopics(user, query),
    user.role === Role.STUDENT
      ? prisma.learnerProfile.findUnique({
          where: { userId: user.id },
          select: { externalExams: true, subjectIds: true },
        })
      : null,
    collectMistakes(user.id, query.studentId ?? null),
  ]);

  const selectedExamNames = new Set(
    (learnerProfile?.externalExams ?? []).map((name) => name.trim().toLowerCase()),
  );
  const matchedExams = rawCatalog.exams.filter((exam) =>
    selectedExamNames.has(exam.name.trim().toLowerCase()),
  );
  const selectedSubjectIds = new Set(learnerProfile?.subjectIds ?? []);
  const visibleSubjects = selectedSubjectIds.size
    ? rawCatalog.subjects.filter((subject) => selectedSubjectIds.has(subject.id))
    : rawCatalog.subjects;
  // A custom examination can be saved before its content is configured. Keep
  // available content visible in that case and tell the client which goals are
  // still unavailable instead of presenting an empty product.
  const visibleExams = matchedExams.length > 0 ? matchedExams : rawCatalog.exams;
  const visibleExamIds = new Set(visibleExams.map((exam) => exam.id));
  const visibleSubjectIds = new Set(visibleSubjects.map((subject) => subject.id));
  const catalog = {
    exams: visibleExams,
    subjects: visibleSubjects,
    availability: rawCatalog.availability.filter(
      (row) =>
        visibleSubjectIds.has(row.subjectId) &&
        (row.examId === null || visibleExamIds.has(row.examId)),
    ),
  };
  const matchedExamNames = new Set(matchedExams.map((exam) => exam.name.trim().toLowerCase()));

  return {
    catalog,
    history,
    progress,
    weak,
    learningPlan: learnerProfile
      ? {
          externalExams: learnerProfile.externalExams,
          unavailableExams: learnerProfile.externalExams.filter(
            (name) => !matchedExamNames.has(name.trim().toLowerCase()),
          ),
          subjectIds: learnerProfile.subjectIds,
        }
      : null,
    mistakes: { due: mistakes.due.length, tomorrow: mistakes.tomorrow },
    ...buildNextActions(progress, weak, mistakes.due.length),
  };
}
