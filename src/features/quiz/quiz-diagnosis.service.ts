import Anthropic from '@anthropic-ai/sdk';
import { Prisma, QuizAttemptStatus } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { aiExplanationsEnabled } from './quiz-ai.service';
import {
  DIAGNOSIS_SYSTEM_PROMPT,
  buildDiagnosisPrompt,
  formatSections,
  rulesSections,
  verifyAiSummary,
  type DiagnosisFacts,
} from './quiz-diagnosis';

type TopicBreakdown = {
  topicId: string;
  name: string;
  attempted: number;
  correct: number;
};

export type DiagnosisResult = {
  diagnosis: string;
  // AI when the model wrote (and passed verification); RULES for the built-in wording.
  source: 'AI' | 'RULES';
  cached: boolean;
};

let client: Anthropic | null = null;

function getClient() {
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

// A missing table means the SQL has not been applied yet; treat it as "nothing
// cached" instead of failing the learner's results page.
function isMissingTable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
}

async function loadFacts(userId: string, attemptId: string): Promise<DiagnosisFacts> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      status: true,
      studentId: true,
      subjectId: true,
      submittedAt: true,
      scorePercent: true,
      correctCount: true,
      totalQuestions: true,
      topicBreakdown: true,
      subject: { select: { name: true } },
    },
  });

  if (!attempt) throw new AppError(404, 'Quiz attempt not found');
  if (attempt.status !== QuizAttemptStatus.SUBMITTED || !attempt.submittedAt) {
    throw new AppError(409, 'Submit the quiz to see your diagnosis.');
  }

  const breakdown = (attempt.topicBreakdown ?? []) as TopicBreakdown[];
  const learnerId = attempt.studentId ?? userId;

  const [previous, stats] = await Promise.all([
    prisma.quizAttempt.findFirst({
      where: {
        userId,
        studentId: attempt.studentId,
        subjectId: attempt.subjectId,
        status: QuizAttemptStatus.SUBMITTED,
        scorePercent: { not: null },
        submittedAt: { lt: attempt.submittedAt },
      },
      orderBy: { submittedAt: 'desc' },
      select: { scorePercent: true },
    }),
    prisma.userTopicStat.findMany({
      where: { learnerId, topicId: { in: breakdown.map((topic) => topic.topicId) } },
      select: { topicId: true, attempted: true, correct: true },
    }),
  ]);

  const overall = new Map(stats.map((stat) => [stat.topicId, stat]));

  return {
    subjectName: attempt.subject.name,
    scorePercent: attempt.scorePercent ?? 0,
    correctCount: attempt.correctCount ?? 0,
    totalQuestions: attempt.totalQuestions,
    previousScorePercent: previous?.scorePercent ?? null,
    topics: breakdown.map((topic) => {
      const total = overall.get(topic.topicId);
      return {
        name: topic.name,
        correct: topic.correct,
        attempted: topic.attempted,
        // The stats row already includes this quiz, but never report less than
        // this quiz alone.
        overallCorrect: Math.max(total?.correct ?? 0, topic.correct),
        overallAttempted: Math.max(total?.attempted ?? 0, topic.attempted),
      };
    }),
  };
}

// Asks the model to word the summary. Returns null (never throws) when the model
// is unavailable or its answer fails verification, so the learner still gets the
// rules-based summary.
async function writeWithAi(facts: DiagnosisFacts, attemptId: string): Promise<string | null> {
  try {
    const response = await getClient().messages.create({
      model: env.AI_MODEL,
      max_tokens: 2048,
      // A short summary of facts we hand over: no need for deep reasoning.
      output_config: { effort: 'low' },
      system: DIAGNOSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildDiagnosisPrompt(facts) }],
    });

    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      console.error(`Diagnosis for ${attemptId} stopped: ${response.stop_reason}`);
      return null;
    }

    const text = response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('\n')
      .trim();

    const problem = text ? verifyAiSummary(text, facts) : 'empty answer';
    if (problem) {
      console.warn(`Diagnosis for ${attemptId} rejected: ${problem}`);
      return null;
    }

    return text;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic rejected the API key', error.message);
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status} while writing a diagnosis`, error.message);
    } else {
      console.error('Diagnosis failed', error);
    }
    return null;
  }
}

// Two requests for the same attempt at once share one model call.
const inflight = new Map<string, Promise<DiagnosisResult>>();

export async function getDiagnosis(userId: string, attemptId: string): Promise<DiagnosisResult> {
  // Checks ownership and that the quiz was submitted before anything else.
  const facts = await loadFacts(userId, attemptId);

  if (aiExplanationsEnabled()) {
    try {
      const stored = await prisma.attemptDiagnosis.findUnique({
        where: { attemptId },
        select: { body: true },
      });
      if (stored) return { diagnosis: stored.body, source: 'AI', cached: true };
    } catch (error) {
      if (!isMissingTable(error)) throw error;
    }

    const pending = inflight.get(attemptId);
    if (pending) return pending;

    const generation = (async (): Promise<DiagnosisResult> => {
      const text = await writeWithAi(facts, attemptId);
      if (!text) {
        return { diagnosis: formatSections(rulesSections(facts)), source: 'RULES', cached: false };
      }

      try {
        // If another server instance saved one first, the stored one stays.
        await prisma.attemptDiagnosis.createMany({
          data: [{ attemptId, body: text, model: env.AI_MODEL }],
          skipDuplicates: true,
        });
      } catch (error) {
        if (!isMissingTable(error)) throw error;
      }

      return { diagnosis: text, source: 'AI', cached: false };
    })();

    inflight.set(attemptId, generation);
    try {
      return await generation;
    } finally {
      inflight.delete(attemptId);
    }
  }

  return { diagnosis: formatSections(rulesSections(facts)), source: 'RULES', cached: false };
}
