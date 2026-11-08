import { prisma } from '../../lib/prisma';
import {
  percentOf,
  PERSISTENT_MIN_ANSWERED,
  STRONG_TOPIC_AT_PERCENT,
  WEAK_TOPIC_BELOW_PERCENT,
} from './quiz-diagnosis';
import {
  LAGOS_OFFSET_MS,
  lagosToday,
  lagosWeekStart,
  learnerKey,
  streaksFor,
  type RewardsUser,
} from './quiz-rewards.service';
import { MIN_TOPIC_SAMPLE } from './quiz.service';

/*
 * Badges and weekly missions.
 *
 * Like XP, everything is derived from data the platform already records
 * (submitted attempts, per-topic stats, reassessments, Arena entries), so there
 * is nothing extra to keep in sync. Both reward learning, not clicking:
 * badges mark skill milestones and consistency; missions point at the learner's
 * own weakest topic and at reassessment, the loop that proves improvement.
 */

// A reassessment counts as proven improvement at +10 points or more.
const IMPROVEMENT_POINTS = 10;
const FOCUS_MISSION_QUESTIONS = 10;
const ACTIVE_DAYS_MISSION = 3;

type TopicBreakdownEntry = { topicId: string; name?: string; attempted: number; correct: number };

export type Badge = {
  id: string;
  name: string;
  description: string;
  current: number;
  target: number;
  earned: boolean;
};

export type MissionAction = 'practice' | 'reassess' | 'arena';

export type Mission = {
  id: string;
  title: string;
  detail: string;
  current: number;
  target: number;
  done: boolean;
  action: MissionAction;
};

function lagosDay(date: Date) {
  return new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

function breakdownOf(value: unknown): TopicBreakdownEntry[] {
  return Array.isArray(value) ? (value as TopicBreakdownEntry[]) : [];
}

function badge(
  id: string,
  name: string,
  description: string,
  current: number,
  target: number,
): Badge {
  return { id, name, description, current: Math.min(current, target), target, earned: current >= target };
}

function mission(
  id: string,
  title: string,
  detail: string,
  current: number,
  target: number,
  action: MissionAction,
): Mission {
  return { id, title, detail, current: Math.min(current, target), target, done: current >= target, action };
}

export async function getAchievements(user: RewardsUser, query: { studentId?: string }) {
  const studentId = await learnerKey(user, query.studentId);

  const [attempts, stats] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId: user.id, studentId, status: 'SUBMITTED', submittedAt: { not: null } },
      orderBy: { submittedAt: 'asc' },
      select: {
        submittedAt: true,
        scorePercent: true,
        subjectId: true,
        subjectIds: true,
        topicBreakdown: true,
        retakeOf: { select: { scorePercent: true } },
        arenaEntry: { select: { id: true } },
      },
    }),
    prisma.userTopicStat.findMany({
      where: { learnerId: studentId ?? user.id, userId: user.id, attempted: { gte: MIN_TOPIC_SAMPLE } },
      select: {
        topicId: true,
        attempted: true,
        correct: true,
        topic: { select: { name: true, subject: { select: { name: true } } } },
      },
    }),
  ]);

  const today = lagosToday();
  const weekStart = lagosWeekStart();
  const days = attempts.map((attempt) => lagosDay(attempt.submittedAt!));
  const thisWeek = attempts.filter((_, index) => days[index] >= weekStart);

  // ---- badges -------------------------------------------------------------
  const mastered = stats.filter(
    (stat) =>
      stat.attempted >= PERSISTENT_MIN_ANSWERED &&
      percentOf(stat.correct, stat.attempted) >= STRONG_TOPIC_AT_PERCENT,
  ).length;
  const improvements = attempts.filter(
    (attempt) =>
      attempt.retakeOf?.scorePercent != null &&
      attempt.scorePercent != null &&
      attempt.scorePercent - attempt.retakeOf.scorePercent >= IMPROVEMENT_POINTS,
  ).length;
  const subjects = new Set(
    attempts.flatMap((attempt) => [attempt.subjectId, ...attempt.subjectIds]),
  ).size;
  const battles = attempts.filter((attempt) => attempt.arenaEntry).length;
  const bestStreak = streaksFor(days, today).best;

  const badges: Badge[] = [
    badge('first-diagnosis', 'First diagnosis', 'Finish your first quiz and get a topic map.', attempts.length, 1),
    badge('topic-mastered', 'Topic mastered', `Reach ${STRONG_TOPIC_AT_PERCENT}% on a topic over ${PERSISTENT_MIN_ANSWERED}+ questions.`, mastered, 1),
    badge('proven-improvement', 'Proven improvement', `Improve by ${IMPROVEMENT_POINTS}+ points when you reassess.`, improvements, 1),
    badge('consistent', 'Consistent', 'Practise on 5 days in a row (one missed day is forgiven).', bestStreak, 5),
    badge('all-rounder', 'All-rounder', 'Practise in 3 different subjects.', subjects, 3),
    badge('arena-debut', 'Arena debut', 'Finish your first Arena battle.', battles, 1),
    badge('dedicated', 'Dedicated', 'Finish 10 quizzes.', attempts.length, 10),
    badge('five-mastered', 'Five topics mastered', 'Master 5 different topics.', mastered, 5),
  ];

  // ---- weekly missions ------------------------------------------------------
  const weakest = stats
    .map((stat) => ({ ...stat, accuracy: percentOf(stat.correct, stat.attempted) }))
    .filter((stat) => stat.accuracy < WEAK_TOPIC_BELOW_PERCENT)
    .sort((a, b) => a.accuracy - b.accuracy)[0];

  const missions: Mission[] = [];
  if (weakest) {
    const answeredThisWeek = thisWeek
      .flatMap((attempt) => breakdownOf(attempt.topicBreakdown))
      .filter((entry) => entry.topicId === weakest.topicId)
      .reduce((sum, entry) => sum + (entry.attempted ?? 0), 0);
    missions.push(
      mission(
        'focus-topic',
        `Work on ${weakest.topic.name}`,
        `Your weakest topic (${weakest.topic.subject.name}, ${weakest.accuracy}%). Answer ${FOCUS_MISSION_QUESTIONS} questions on it this week.`,
        answeredThisWeek,
        FOCUS_MISSION_QUESTIONS,
        'practice',
      ),
      mission(
        'reassess',
        'Test a weak topic again',
        'Retake a quiz on your weak topics to see if you have improved.',
        thisWeek.filter((attempt) => attempt.retakeOf).length,
        1,
        'reassess',
      ),
    );
  } else {
    missions.push(
      mission(
        'diagnose',
        'Take a quiz',
        'Finish a quiz so we can find the topics to work on.',
        thisWeek.length,
        1,
        'practice',
      ),
    );
  }
  missions.push(
    mission(
      'active-days',
      `Practise on ${ACTIVE_DAYS_MISSION} days`,
      'Short, regular practice beats one long session.',
      new Set(days.filter((day) => day >= weekStart)).size,
      ACTIVE_DAYS_MISSION,
      'practice',
    ),
    mission(
      'arena',
      'Play an Arena battle',
      'Challenge a friend to a 1v1 battle.',
      thisWeek.filter((attempt) => attempt.arenaEntry).length,
      1,
      'arena',
    ),
  );

  return { weekStart, badges, missions };
}
