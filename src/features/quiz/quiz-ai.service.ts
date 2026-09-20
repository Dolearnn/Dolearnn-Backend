import Anthropic from '@anthropic-ai/sdk';
import { QuizAttemptStatus } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';

type QuestionOption = { id: string; text: string };

// Kept identical on every call so it is a stable prompt prefix.
const SYSTEM_PROMPT = `You are a patient, encouraging tutor helping Nigerian secondary-school students prepare for exams such as JAMB UTME.

You will be given a multiple-choice question together with its official answer key. The answer key is authoritative: explain why that option is correct. If you believe the key is wrong, still explain the keyed answer, then add a final line that starts with "Note:" saying what looks off.

Write in plain text (no markdown symbols, no bullet characters, no bold). Use exactly these three short parts, each starting on its own line:
Answer: one sentence naming the correct option and its value.
Steps: the working or reasoning as short numbered lines (1. 2. 3.), using formulas and numbers where relevant.
Watch out: one or two sentences on the mistake that makes a wrong option tempting.

Keep the whole reply under 170 words. Use simple English. Do not greet the student or add closing remarks.`;

let client: Anthropic | null = null;

export function aiExplanationsEnabled() {
  return Boolean(env.ANTHROPIC_API_KEY);
}

function getClient() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError(503, 'AI explanations are not switched on yet.');
  }
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

// Two learners asking about the same new question at once share one model call.
const inflight = new Map<string, Promise<string>>();

async function generateExplanation(question: {
  id: string;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string | null;
  subjectName: string;
  topicName: string;
}): Promise<string> {
  const optionLines = question.options
    .map((option) => `${option.id}. ${option.text}`)
    .join('\n');
  const correct = question.options.find(
    (option) => option.id === question.correctOptionId,
  );

  const prompt = [
    `Subject: ${question.subjectName} (${question.topicName})`,
    '',
    `Question: ${question.text}`,
    optionLines,
    '',
    `Official answer key: ${question.correctOptionId}. ${correct?.text ?? ''}`,
    question.explanation ? `Answer key note: ${question.explanation}` : '',
  ]
    .filter((line, index, all) => line !== '' || all[index - 1] !== '')
    .join('\n');

  let response: Anthropic.Message;
  try {
    response = await getClient().messages.create({
      model: env.AI_MODEL,
      max_tokens: 4096,
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic rejected the API key', error.message);
      throw new AppError(503, 'AI explanations are not available right now.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AppError(503, 'The AI tutor is busy. Please try again in a minute.');
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}`, error.message);
      throw new AppError(502, 'Could not get an explanation. Please try again.');
    }
    throw error;
  }

  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
    console.error(`Explanation for ${question.id} stopped: ${response.stop_reason}`);
    throw new AppError(502, 'Could not get an explanation for this question.');
  }

  const text = response.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n')
    .trim();

  if (!text) {
    throw new AppError(502, 'Could not get an explanation for this question.');
  }

  // The model was told to flag answer keys that look wrong; surface those for review.
  if (/^Note:/m.test(text)) {
    console.warn(`AI flagged a possible answer-key problem on question ${question.id}`);
  }

  return text;
}

export async function explainQuestion(
  userId: string,
  attemptId: string,
  questionId: string,
) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    select: { status: true, questionIds: true },
  });

  if (!attempt) {
    throw new AppError(404, 'Quiz attempt not found');
  }

  // Explanations reveal the answer, so they only open after the quiz is submitted.
  if (attempt.status !== QuizAttemptStatus.SUBMITTED) {
    throw new AppError(409, 'Submit the quiz to see explanations.');
  }

  if (!attempt.questionIds.includes(questionId)) {
    throw new AppError(404, 'Question not found in this quiz');
  }

  const stored = await prisma.questionExplanation.findUnique({
    where: { questionId },
    select: { body: true },
  });
  if (stored) {
    return { explanation: stored.body, cached: true };
  }

  const pending = inflight.get(questionId);
  if (pending) {
    return { explanation: await pending, cached: false };
  }

  const generation = (async () => {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        text: true,
        options: true,
        correctOptionId: true,
        explanation: true,
        subject: { select: { name: true } },
        topic: { select: { name: true } },
      },
    });
    if (!question) throw new AppError(404, 'Question not found');

    const body = await generateExplanation({
      id: question.id,
      text: question.text,
      options: question.options as QuestionOption[],
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      subjectName: question.subject.name,
      topicName: question.topic.name,
    });

    // If another server instance saved one first, the stored one stays.
    await prisma.questionExplanation.createMany({
      data: [{ questionId, body, model: env.AI_MODEL }],
      skipDuplicates: true,
    });
    return body;
  })();

  inflight.set(questionId, generation);
  try {
    return { explanation: await generation, cached: false };
  } finally {
    inflight.delete(questionId);
  }
}
