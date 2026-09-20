import { Prisma, QuestionStatus, SessionStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { createTtlCache } from '../../../lib/ttl-cache';

// The impact report scans quiz attempts, so it is computed at most once a minute
// per server instance no matter how often the admin page is opened.
const IMPACT_TTL_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const impactCache = createTtlCache<ImpactReport>(IMPACT_TTL_MS, 1);

function asNumber(value: unknown) {
  return value === null || value === undefined ? 0 : Number(value);
}

function round1(value: unknown) {
  return Math.round(asNumber(value) * 10) / 10;
}

type LearnerRow = {
  learners: bigint;
  active30: bigint;
  active7: bigint;
  repeat_learners: bigint;
  attempts: bigint;
  attempts30: bigint;
  attempts7: bigint;
};

type ImprovementRow = {
  pairs: bigint;
  improved: bigint;
  avg_first: number | null;
  avg_latest: number | null;
};

type TutoringRow = {
  practised_before: bigint;
  practised_after: bigint;
  matched: bigint;
  avg_before: number | null;
  avg_after: number | null;
};

export type ImpactReport = Awaited<ReturnType<typeof buildImpactReport>>;

async function buildImpactReport() {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS);
  const since7 = new Date(now - 7 * DAY_MS);

  const [
    parents,
    students,
    activeTeachers,
    publishedQuestions,
    startedAttempts,
    completedSessions,
    bookingRequests,
    revenue,
    payoutsPaid,
    learnerRows,
    improvementRows,
    tutoringRows,
  ] = await Promise.all([
    prisma.parentProfile.count(),
    prisma.student.count(),
    prisma.teacherProfile.count({ where: { status: 'ACTIVE' } }),
    prisma.question.count({ where: { status: QuestionStatus.PUBLISHED } }),
    prisma.quizAttempt.count(),
    prisma.session.count({ where: { status: SessionStatus.COMPLETED } }),
    prisma.sessionBookingRequest.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.teacherPayout.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID' },
    }),
    // A learner is the child profile a parent quizzed for, or the account itself.
    prisma.$queryRaw<LearnerRow[]>(Prisma.sql`
      WITH s AS (
        SELECT COALESCE("studentId", "userId") AS learner, "submittedAt"
        FROM "QuizAttempt"
        WHERE "status" = 'SUBMITTED' AND "submittedAt" IS NOT NULL
      ),
      per AS (
        SELECT learner,
               COUNT(*) AS n,
               COUNT(*) FILTER (WHERE "submittedAt" >= ${since30}) AS n30,
               COUNT(*) FILTER (WHERE "submittedAt" >= ${since7}) AS n7,
               COUNT(DISTINCT DATE("submittedAt")) AS days
        FROM s
        GROUP BY learner
      )
      SELECT COUNT(*) AS learners,
             COUNT(*) FILTER (WHERE n30 > 0) AS active30,
             COUNT(*) FILTER (WHERE n7 > 0) AS active7,
             COUNT(*) FILTER (WHERE days >= 2) AS repeat_learners,
             COALESCE(SUM(n), 0) AS attempts,
             COALESCE(SUM(n30), 0) AS attempts30,
             COALESCE(SUM(n7), 0) AS attempts7
      FROM per
    `),
    // First vs latest score for every learner + subject with two or more attempts.
    prisma.$queryRaw<ImprovementRow[]>(Prisma.sql`
      WITH s AS (
        SELECT COALESCE("studentId", "userId") AS learner, "subjectId", "scorePercent", "submittedAt"
        FROM "QuizAttempt"
        WHERE "status" = 'SUBMITTED' AND "scorePercent" IS NOT NULL AND "submittedAt" IS NOT NULL
      ),
      ranked AS (
        SELECT learner, "subjectId", "scorePercent",
               ROW_NUMBER() OVER (PARTITION BY learner, "subjectId" ORDER BY "submittedAt" ASC) AS rn_first,
               ROW_NUMBER() OVER (PARTITION BY learner, "subjectId" ORDER BY "submittedAt" DESC) AS rn_last,
               COUNT(*) OVER (PARTITION BY learner, "subjectId") AS n
        FROM s
      ),
      pairs AS (
        SELECT MAX("scorePercent") FILTER (WHERE rn_first = 1) AS first_score,
               MAX("scorePercent") FILTER (WHERE rn_last = 1) AS latest_score
        FROM ranked
        WHERE n >= 2
        GROUP BY learner, "subjectId"
      )
      SELECT COUNT(*) AS pairs,
             COUNT(*) FILTER (WHERE latest_score > first_score) AS improved,
             AVG(first_score)::float8 AS avg_first,
             AVG(latest_score)::float8 AS avg_latest
      FROM pairs
    `),
    // Children who practised, and how their quiz scores moved around their first
    // completed tutoring session. Subjects are not matched, so this is indicative.
    prisma.$queryRaw<TutoringRow[]>(Prisma.sql`
      WITH first_session AS (
        SELECT "studentId", MIN("startsAt") AS first_at
        FROM "Session"
        WHERE "status" = 'COMPLETED'
        GROUP BY "studentId"
      ),
      per AS (
        SELECT q."studentId",
               AVG(q."scorePercent") FILTER (WHERE q."submittedAt" < f.first_at) AS before_avg,
               AVG(q."scorePercent") FILTER (WHERE q."submittedAt" >= f.first_at) AS after_avg
        FROM "QuizAttempt" q
        JOIN first_session f ON f."studentId" = q."studentId"
        WHERE q."status" = 'SUBMITTED' AND q."scorePercent" IS NOT NULL AND q."submittedAt" IS NOT NULL
        GROUP BY q."studentId"
      )
      SELECT COUNT(*) FILTER (WHERE before_avg IS NOT NULL) AS practised_before,
             COUNT(*) FILTER (WHERE after_avg IS NOT NULL) AS practised_after,
             COUNT(*) FILTER (WHERE before_avg IS NOT NULL AND after_avg IS NOT NULL) AS matched,
             (AVG(before_avg) FILTER (WHERE before_avg IS NOT NULL AND after_avg IS NOT NULL))::float8 AS avg_before,
             (AVG(after_avg) FILTER (WHERE before_avg IS NOT NULL AND after_avg IS NOT NULL))::float8 AS avg_after
      FROM per
    `),
  ]);

  const learner = learnerRows[0];
  const improvement = improvementRows[0];
  const tutoring = tutoringRows[0];

  const learners = asNumber(learner?.learners);
  const pairs = asNumber(improvement?.pairs);
  const improved = asNumber(improvement?.improved);
  const avgFirst = improvement?.avg_first ?? null;
  const avgLatest = improvement?.avg_latest ?? null;
  const matched = asNumber(tutoring?.matched);

  return {
    generatedAt: new Date().toISOString(),
    people: {
      families: parents,
      learnerProfiles: students,
      activeTeachers,
    },
    practice: {
      publishedQuestions,
      attemptsStarted: startedAttempts,
      attemptsSubmitted: asNumber(learner?.attempts),
      attemptsLast30Days: asNumber(learner?.attempts30),
      attemptsLast7Days: asNumber(learner?.attempts7),
      learnersWhoPractised: learners,
      activeLearners30Days: asNumber(learner?.active30),
      activeLearners7Days: asNumber(learner?.active7),
      repeatLearners: asNumber(learner?.repeat_learners),
      repeatRatePercent:
        learners === 0 ? 0 : Math.round((asNumber(learner?.repeat_learners) / learners) * 100),
    },
    learning: {
      // Learner + subject pairs with two or more submitted attempts.
      comparablePairs: pairs,
      improvedPairs: improved,
      improvedPercent: pairs === 0 ? 0 : Math.round((improved / pairs) * 100),
      averageFirstScore: avgFirst === null ? null : round1(avgFirst),
      averageLatestScore: avgLatest === null ? null : round1(avgLatest),
      averageChangePoints:
        avgFirst === null || avgLatest === null ? null : round1(avgLatest - avgFirst),
    },
    tutoring: {
      completedSessions,
      bookingRequests,
      practisedBeforeTutoring: asNumber(tutoring?.practised_before),
      practisedAfterTutoring: asNumber(tutoring?.practised_after),
      matchedLearners: matched,
      averageScoreBeforeTutoring:
        matched === 0 || tutoring?.avg_before == null ? null : round1(tutoring.avg_before),
      averageScoreAfterTutoring:
        matched === 0 || tutoring?.avg_after == null ? null : round1(tutoring.avg_after),
    },
    revenue: {
      totalRevenue: asNumber(revenue._sum.amount),
      paymentCount: revenue._count,
      teacherPayoutsPaid: asNumber(payoutsPaid._sum.amount),
    },
  };
}

export function getImpactReport() {
  return impactCache.get('impact', buildImpactReport);
}
