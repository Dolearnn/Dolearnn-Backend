import { Router } from 'express';
import { AppError, asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import {
  listAttemptsQuerySchema,
  progressQuerySchema,
  startAttemptSchema,
  submitAttemptSchema,
  weakTopicsQuerySchema,
} from './quiz.schemas';
import { aiExplanationsEnabled, explainQuestion } from './quiz-ai.service';
import { getDiagnosis } from './quiz-diagnosis.service';
import {
  getAttempt,
  getCatalog,
  getNextActions,
  getProgress,
  getWeakTopics,
  listAttempts,
  startAttempt,
  submitAttempt,
} from './quiz.service';

export const quizRoutes = Router();

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

const byUser = (req: { user?: { id: string } }) => req.user?.id ?? 'anonymous';

// Public: exams, subjects and topics. Cached in memory and by browsers/CDNs,
// so browsing the quiz section costs the database nothing.
quizRoutes.get(
  '/catalog',
  asyncHandler(async (_req, res) => {
    const catalog = await getCatalog();
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ ...catalog, ai: { explanations: aiExplanationsEnabled() } });
  }),
);

quizRoutes.use(requireAuth);

quizRoutes.post(
  '/attempts',
  rateLimit({
    keyPrefix: 'quiz-start',
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: 'You are starting quizzes too quickly. Please wait a few minutes.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const input = startAttemptSchema.parse(req.body);
    const result = await startAttempt(req.user!, input);
    res.status(201).json(result);
  }),
);

quizRoutes.get(
  '/attempts',
  asyncHandler(async (req, res) => {
    const query = listAttemptsQuerySchema.parse(req.query);
    const result = await listAttempts(req.user!, query);
    res.json(result);
  }),
);

quizRoutes.get(
  '/attempts/:attemptId',
  asyncHandler(async (req, res) => {
    const attemptId = getRouteParam(req.params.attemptId, 'attempt id');
    const result = await getAttempt(req.user!, attemptId);
    res.json(result);
  }),
);

quizRoutes.post(
  '/attempts/:attemptId/submit',
  rateLimit({
    keyPrefix: 'quiz-submit',
    windowMs: 10 * 60 * 1000,
    max: 60,
    message: 'Too many submissions. Please wait a few minutes.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const attemptId = getRouteParam(req.params.attemptId, 'attempt id');
    const input = submitAttemptSchema.parse(req.body);
    const result = await submitAttempt(req.user!, attemptId, input);
    res.json(result);
  }),
);

quizRoutes.post(
  '/attempts/:attemptId/questions/:questionId/explain',
  rateLimit({
    keyPrefix: 'quiz-explain',
    windowMs: 60 * 60 * 1000,
    max: 60,
    message: 'You have asked for a lot of explanations. Please try again later.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const attemptId = getRouteParam(req.params.attemptId, 'attempt id');
    const questionId = getRouteParam(req.params.questionId, 'question id');
    res.json(await explainQuestion(req.user!.id, attemptId, questionId));
  }),
);

quizRoutes.post(
  '/attempts/:attemptId/diagnosis',
  rateLimit({
    keyPrefix: 'quiz-diagnosis',
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'You have asked for a lot of diagnoses. Please try again later.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const attemptId = getRouteParam(req.params.attemptId, 'attempt id');
    res.json(await getDiagnosis(req.user!.id, attemptId));
  }),
);

quizRoutes.get(
  '/progress',
  asyncHandler(async (req, res) => {
    const query = progressQuerySchema.parse(req.query);
    res.json(await getProgress(req.user!, query));
  }),
);

quizRoutes.get(
  '/next-actions',
  asyncHandler(async (req, res) => {
    const query = progressQuerySchema.parse(req.query);
    res.json(await getNextActions(req.user!, query));
  }),
);

quizRoutes.get(
  '/weak-topics',
  asyncHandler(async (req, res) => {
    const query = weakTopicsQuerySchema.parse(req.query);
    const result = await getWeakTopics(req.user!, query);
    res.json(result);
  }),
);
