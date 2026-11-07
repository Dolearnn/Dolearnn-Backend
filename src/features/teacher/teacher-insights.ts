import { prisma } from '../../lib/prisma';
import {
  percentOf,
  STRONG_TOPIC_AT_PERCENT,
  WEAK_TOPIC_BELOW_PERCENT,
} from '../quiz/quiz-diagnosis';
import { MIN_TOPIC_SAMPLE } from '../quiz/quiz.service';

/*
 * The learning summary a tutor sees before class: which topics the student
 * struggles with, which they have mastered, and their latest practice scores.
 *
 * Built only from data the platform already records (per-topic answer counts
 * and submitted quiz attempts), with the same thresholds the family sees, so
 * the tutor and the parent are looking at the same evidence.
 */

const MAX_TOPICS = 5;
const RECENT_ATTEMPTS = 3;

type SummaryTopic = {
  name: string;
  subject: string;
  accuracyPercent: number;
  answered: number;
};

export type LearningSummary = {
  weakTopics: SummaryTopic[];
  strongTopics: SummaryTopic[];
  recentAttempts: {
    subject: string;
    scorePercent: number;
    submittedAt: Date;
    isRetake: boolean;
  }[];
  practisedQuizzes: number;
};

/** Who a tutoring profile's practice data belongs to. */
export type SummaryLearner = {
  studentId: string;
  // Set when the profile belongs to a learner account: their quizzes are stored
  // on the account itself. Null for older parent-managed child profiles.
  learnerUserId: string | null;
};

async function summaryFor({ studentId, learnerUserId }: SummaryLearner): Promise<LearningSummary> {
  const attemptScope = learnerUserId
    ? { userId: learnerUserId, studentId: null }
    : { studentId };
  const learnerId = learnerUserId ?? studentId;

  const [stats, recent, practisedQuizzes] = await Promise.all([
    prisma.userTopicStat.findMany({
      where: { learnerId, attempted: { gte: MIN_TOPIC_SAMPLE } },
      select: {
        attempted: true,
        correct: true,
        topic: { select: { name: true, subject: { select: { name: true } } } },
      },
    }),
    prisma.quizAttempt.findMany({
      where: { ...attemptScope, status: 'SUBMITTED', scorePercent: { not: null } },
      orderBy: { submittedAt: 'desc' },
      take: RECENT_ATTEMPTS,
      select: {
        scorePercent: true,
        submittedAt: true,
        retakeOfAttemptId: true,
        subject: { select: { name: true } },
      },
    }),
    prisma.quizAttempt.count({ where: { ...attemptScope, status: 'SUBMITTED' } }),
  ]);

  const topics: SummaryTopic[] = stats.map((stat) => ({
    name: stat.topic.name,
    subject: stat.topic.subject.name,
    accuracyPercent: percentOf(stat.correct, stat.attempted),
    answered: stat.attempted,
  }));

  return {
    weakTopics: topics
      .filter((topic) => topic.accuracyPercent < WEAK_TOPIC_BELOW_PERCENT)
      .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
      .slice(0, MAX_TOPICS),
    strongTopics: topics
      .filter((topic) => topic.accuracyPercent >= STRONG_TOPIC_AT_PERCENT)
      .sort((a, b) => b.accuracyPercent - a.accuracyPercent)
      .slice(0, MAX_TOPICS),
    recentAttempts: recent
      .filter((attempt) => attempt.submittedAt)
      .map((attempt) => ({
        subject: attempt.subject.name,
        scorePercent: attempt.scorePercent ?? 0,
        submittedAt: attempt.submittedAt!,
        isRetake: Boolean(attempt.retakeOfAttemptId),
      })),
    practisedQuizzes,
  };
}

// A tutor has a handful of students, so a few small queries each is fine.
export async function learningSummaries(learners: SummaryLearner[]) {
  const results = await Promise.all(learners.map(summaryFor));
  return new Map(learners.map((learner, index) => [learner.studentId, results[index]]));
}
