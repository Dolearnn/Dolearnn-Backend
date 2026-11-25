import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { createTtlCache } from '../../../lib/ttl-cache';

// Each step scans the period's sign-ups and their attempts, so a report is
// computed at most once a minute per period.
const FUNNEL_TTL_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const FUNNEL_PERIODS = [7, 30, 90] as const;

export const funnelQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((value) => (FUNNEL_PERIODS as readonly number[]).includes(value), 'Choose 7, 30 or 90 days')
    .default(30),
});

type FunnelRow = {
  signed_up: bigint;
  onboarded: bigint;
  first_quiz: bigint;
  came_back: bigint;
  tutor_requested: bigint;
  paid: bigint;
};

const funnelCache = createTtlCache<FunnelReport>(FUNNEL_TTL_MS, FUNNEL_PERIODS.length);

export type FunnelReport = Awaited<ReturnType<typeof buildFunnelReport>>;

/**
 * How learners who signed up in the last `days` moved through the product:
 * sign-up, study plan set up, first quiz finished, came back on another day,
 * paid for Pro, asked for a tutor. Each step counts people from the same sign-up
 * group, so the steps can be read as a funnel. Guest Daily players are reported beside it, as they
 * have no account to follow.
 */
async function buildFunnelReport(days: number) {
  const since = new Date(Date.now() - days * DAY_MS);

  const [rows, guestDaily] = await Promise.all([
    prisma.$queryRaw<FunnelRow[]>(Prisma.sql`
      WITH cohort AS (
        SELECT u."id" FROM "User" u
        WHERE u."role" IN ('STUDENT', 'PARENT') AND u."createdAt" >= ${since}
      ),
      practice AS (
        SELECT a."userId", COUNT(DISTINCT DATE(a."submittedAt")) AS days
        FROM "QuizAttempt" a
        JOIN cohort c ON c."id" = a."userId"
        WHERE a."status" = 'SUBMITTED' AND a."submittedAt" IS NOT NULL
        GROUP BY a."userId"
      ),
      tutor AS (
        SELECT DISTINCT p."userId"
        FROM "Intake" i
        JOIN "Student" s ON s."id" = i."studentId"
        JOIN "ParentProfile" p ON p."id" = s."parentId"
        JOIN cohort c ON c."id" = p."userId"
      )
      SELECT
        (SELECT COUNT(*) FROM cohort) AS signed_up,
        (SELECT COUNT(*) FROM "LearnerProfile" lp JOIN cohort c ON c."id" = lp."userId" WHERE lp."onboardingCompleted") AS onboarded,
        (SELECT COUNT(*) FROM practice) AS first_quiz,
        (SELECT COUNT(*) FROM practice WHERE days >= 2) AS came_back,
        (SELECT COUNT(*) FROM tutor) AS tutor_requested,
        (SELECT COUNT(DISTINCT pp."userId") FROM "PlanPurchase" pp JOIN cohort c ON c."id" = pp."userId" WHERE pp."status" = 'PAID') AS paid
    `),
    // A guest's entry moves onto their account when they sign up, so these are
    // guests who have not (yet) signed up.
    prisma.dailyEntry.findMany({
      where: { userId: null, guestKey: { not: null }, startedAt: { gte: since } },
      distinct: ['guestKey'],
      select: { guestKey: true },
    }),
  ]);

  const row = rows[0];
  const count = (value: bigint | undefined) => Number(value ?? 0);
  const signedUp = count(row?.signed_up);
  const steps = [
    { key: 'signedUp', label: 'Signed up', count: signedUp },
    { key: 'onboarded', label: 'Set up their study plan', count: count(row?.onboarded) },
    { key: 'firstQuiz', label: 'Finished a first quiz', count: count(row?.first_quiz) },
    { key: 'cameBack', label: 'Practised on 2 or more days', count: count(row?.came_back) },
    { key: 'paid', label: 'Paid for Pro', count: count(row?.paid) },
    { key: 'tutorRequested', label: 'Asked for a tutor', count: count(row?.tutor_requested) },
  ];

  return {
    days,
    since: since.toISOString(),
    steps: steps.map((step) => ({
      ...step,
      percentOfSignups: signedUp === 0 ? 0 : Math.round((step.count / signedUp) * 100),
    })),
    guestDailyPlayers: guestDaily.length,
  };
}

export function getFunnelReport(days: number) {
  return funnelCache.get(`funnel:${days}`, () => buildFunnelReport(days));
}
