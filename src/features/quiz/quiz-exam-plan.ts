import { STRONG_TOPIC_AT_PERCENT } from './quiz-diagnosis';

/*
 * The exam countdown plan: how much of the learner's syllabus they have really
 * covered, and the weekly pace that finishes it in time. Worked out only from
 * their own answers and exam date, so every number can be explained.
 */

// The final two weeks are kept free for revision and full mock exams.
export const REVISION_DAYS = 14;

export type ExamPlanTopic = {
  topicId: string;
  name: string;
  subjectId: string;
  subjectName: string;
  examId: string;
};

export function buildExamPlan(input: {
  // Every topic in the learner's plan that has questions, in syllabus order.
  topics: ExamPlanTopic[];
  stats: Map<string, { attempted: number; correct: number }>;
  // Whole days until the exam; null when there is no future exam date.
  daysLeft: number | null;
  // Questions answered before a topic counts as covered.
  coveredAfter: number;
}) {
  const { topics, stats, daysLeft, coveredAfter } = input;
  const isCovered = (topicId: string) => (stats.get(topicId)?.attempted ?? 0) >= coveredAfter;

  const covered = topics.filter((topic) => isCovered(topic.topicId));
  const strong = covered.filter((topic) => {
    const stat = stats.get(topic.topicId)!;
    return (stat.correct / stat.attempted) * 100 >= STRONG_TOPIC_AT_PERCENT;
  });
  const remaining = topics.length - covered.length;

  // Next: the subject furthest behind, so no subject gets left until last.
  const shareCovered = (subjectId: string) => {
    const inSubject = topics.filter((topic) => topic.subjectId === subjectId);
    return inSubject.filter((topic) => isCovered(topic.topicId)).length / inSubject.length;
  };
  const nextTopic =
    topics
      .filter((topic) => !isCovered(topic.topicId))
      .map((topic, order) => ({ topic, order, share: shareCovered(topic.subjectId) }))
      .sort((a, b) => a.share - b.share || a.order - b.order)[0]?.topic ?? null;

  const weeks = daysLeft === null ? null : Math.max(1, Math.ceil((daysLeft - REVISION_DAYS) / 7));

  return {
    totalTopics: topics.length,
    coveredTopics: covered.length,
    strongTopics: strong.length,
    daysLeft,
    topicsPerWeek: weeks === null ? null : Math.ceil(remaining / weeks),
    nextTopic,
  };
}
