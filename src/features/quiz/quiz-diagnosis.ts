// Pure logic for the results diagnosis: turning a quiz result into facts, writing
// the rules-based summary, and checking that an AI-written summary only uses
// numbers that really came from those facts. No database or network here.

export const STRONG_TOPIC_AT_PERCENT = 75;
export const WEAK_TOPIC_BELOW_PERCENT = 60;
// A topic answered this many times overall, and still weak, has stopped being a
// one-off bad quiz.
export const PERSISTENT_MIN_ANSWERED = 6;

export type DiagnosisTopic = {
  name: string;
  correct: number;
  attempted: number;
  // Everything the learner has ever answered on this topic, this quiz included.
  overallCorrect: number;
  overallAttempted: number;
};

export type DiagnosisFacts = {
  subjectName: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  previousScorePercent: number | null;
  topics: DiagnosisTopic[];
};

export type DiagnosisSections = {
  strengths: string;
  needsWork: string;
  nextStep: string;
};

export function percentOf(correct: number, total: number) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function topicPercent(topic: DiagnosisTopic) {
  return percentOf(topic.correct, topic.attempted);
}

function overallPercent(topic: DiagnosisTopic) {
  return percentOf(topic.overallCorrect, topic.overallAttempted);
}

function join(names: string[]) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// Rules decide the recommendation. The AI only puts it into words.
export function platformNextStep(facts: DiagnosisFacts) {
  const weak = facts.topics
    .filter((topic) => topic.attempted >= 2 && topicPercent(topic) < WEAK_TOPIC_BELOW_PERCENT)
    .sort((a, b) => topicPercent(a) - topicPercent(b));

  const persistent = weak.filter(
    (topic) =>
      topic.overallAttempted >= PERSISTENT_MIN_ANSWERED &&
      overallPercent(topic) < WEAK_TOPIC_BELOW_PERCENT,
  );

  if (persistent.length > 0) {
    const shown = persistent.slice(0, 3);
    return `Book a tutor session on ${join(shown.map((topic) => topic.name))}. ${
      shown.length === 1 ? 'This topic has' : 'These topics have'
    } stayed weak across several quizzes, so practice alone may not be enough.`;
  }

  if (weak.length > 0) {
    return `Practise ${join(
      weak.slice(0, 2).map((topic) => topic.name),
    )} with a 10-question mission, then retake this quiz to check your progress.`;
  }

  return 'Retake this subject in about a week to check that your score holds, or try a timed mock.';
}

function comparisonSentence(facts: DiagnosisFacts) {
  if (facts.previousScorePercent === null) return '';
  const change = facts.scorePercent - facts.previousScorePercent;
  if (change === 0) {
    return `Your score is the same as last time (${facts.previousScorePercent}%).`;
  }
  return `Your score moved ${change > 0 ? 'up' : 'down'} ${Math.abs(change)} ${
    Math.abs(change) === 1 ? 'point' : 'points'
  } since last time (${facts.previousScorePercent}%).`;
}

export function rulesSections(facts: DiagnosisFacts): DiagnosisSections {
  const strong = facts.topics
    .filter((topic) => topic.attempted >= 2 && topicPercent(topic) >= STRONG_TOPIC_AT_PERCENT)
    .sort((a, b) => topicPercent(b) - topicPercent(a));
  const weak = facts.topics
    .filter((topic) => topic.attempted >= 2 && topicPercent(topic) < WEAK_TOPIC_BELOW_PERCENT)
    .sort((a, b) => topicPercent(a) - topicPercent(b));

  const strengthLines = [
    strong.length > 0
      ? `You are strong in ${join(
          strong.slice(0, 3).map((topic) => `${topic.name} (${topicPercent(topic)}%)`),
        )}.`
      : `No topic reached ${STRONG_TOPIC_AT_PERCENT}% yet. This quiz gives you a starting point to build on.`,
    comparisonSentence(facts),
  ].filter(Boolean);

  return {
    strengths: strengthLines.join(' '),
    needsWork:
      weak.length > 0
        ? `${join(
            weak
              .slice(0, 3)
              .map((topic) => `${topic.name} (${topic.correct} of ${topic.attempted}, ${topicPercent(topic)}%)`),
          )} need more work.`
        : `No topic fell below ${WEAK_TOPIC_BELOW_PERCENT}% with enough questions to judge.`,
    nextStep: platformNextStep(facts),
  };
}

export function formatSections(sections: DiagnosisSections) {
  return [
    `Strengths: ${sections.strengths}`,
    `Needs work: ${sections.needsWork}`,
    `Next step: ${sections.nextStep}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// The AI prompt and the check on its answer
// ---------------------------------------------------------------------------

// Kept identical on every call so it is a stable prompt prefix.
export const DIAGNOSIS_SYSTEM_PROMPT = `You write a short results summary for a Nigerian secondary-school student who just finished a practice quiz for exams such as JAMB UTME. A parent may read it too.

You are given the quiz facts. Use only those facts. Never invent a score, percentage, count or topic, and never mention individual questions or answers.

Write in plain text (no markdown symbols, no bullet characters, no bold). Use exactly these three parts, each starting on its own line:
Strengths: one or two sentences on what went well, naming topics from the facts. If a previous score is given, say how the score changed. If nothing went well, say so kindly and name one small positive.
Needs work: one or two sentences on the topics that need attention and why, using the numbers given.
Next step: restate the recommended next step you are given, in your own words. Do not add other actions and do not change the recommendation.

Be honest, specific and encouraging. Address the student as "you". Keep the whole reply under 120 words. Use simple English. Do not greet the student or add closing remarks.`;

export function buildDiagnosisPrompt(facts: DiagnosisFacts) {
  const topicLines = facts.topics.map((topic) => {
    const overall =
      topic.overallAttempted > topic.attempted
        ? `; over all quizzes ${topic.overallCorrect} of ${topic.overallAttempted} (${overallPercent(topic)}%)`
        : '';
    return `- ${topic.name}: ${topic.correct} of ${topic.attempted} (${topicPercent(topic)}%)${overall}`;
  });

  return [
    `Subject: ${facts.subjectName}`,
    `Score: ${facts.scorePercent}% (${facts.correctCount} of ${facts.totalQuestions})`,
    facts.previousScorePercent === null
      ? 'Previous quiz in this subject: none'
      : `Previous quiz in this subject: ${facts.previousScorePercent}% (change: ${
          facts.scorePercent - facts.previousScorePercent
        } points)`,
    `A topic counts as strong at ${STRONG_TOPIC_AT_PERCENT}% or more and weak below ${WEAK_TOPIC_BELOW_PERCENT}%.`,
    'Topics in this quiz:',
    ...(topicLines.length > 0 ? topicLines : ['- none']),
    '',
    `Recommended next step (decided by DoLearnn): ${platformNextStep(facts)}`,
  ].join('\n');
}

function allowedNumbers(facts: DiagnosisFacts) {
  const percents = new Set<number>([0, 100, facts.scorePercent]);
  const pairs = new Set<string>([`${facts.correctCount} of ${facts.totalQuestions}`]);
  const changes = new Set<number>();

  if (facts.previousScorePercent !== null) {
    percents.add(facts.previousScorePercent);
    changes.add(Math.abs(facts.scorePercent - facts.previousScorePercent));
  }
  for (const topic of facts.topics) {
    percents.add(topicPercent(topic));
    percents.add(overallPercent(topic));
    pairs.add(`${topic.correct} of ${topic.attempted}`);
    pairs.add(`${topic.overallCorrect} of ${topic.overallAttempted}`);
  }
  percents.add(STRONG_TOPIC_AT_PERCENT);
  percents.add(WEAK_TOPIC_BELOW_PERCENT);

  return { percents, pairs, changes };
}

// The platform verifies what the AI wrote: the three parts must be present and
// every percentage, "X of Y" and "N points" figure must come from the facts.
// Returns the reason it was rejected, or null when it is fine.
export function verifyAiSummary(text: string, facts: DiagnosisFacts): string | null {
  for (const heading of ['Strengths:', 'Needs work:', 'Next step:']) {
    if (!new RegExp(`^${heading}`, 'm').test(text)) return `missing "${heading}"`;
  }

  const allowed = allowedNumbers(facts);

  for (const match of text.matchAll(/(\d+)\s?%/g)) {
    if (!allowed.percents.has(Number(match[1]))) return `unexpected percentage ${match[0]}`;
  }
  for (const match of text.matchAll(/(\d+)\s+of\s+(\d+)/gi)) {
    if (!allowed.pairs.has(`${match[1]} of ${match[2]}`)) return `unexpected count ${match[0]}`;
  }
  for (const match of text.matchAll(/(\d+)\s+points?\b/gi)) {
    if (!allowed.changes.has(Number(match[1]))) return `unexpected change ${match[0]}`;
  }

  return null;
}
