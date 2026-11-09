import { Router, type Request } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { AppError, asyncHandler } from '../../lib/http';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import {
  answerDaily,
  claimGuestEntry,
  getDailyLeaderboard,
  getDailyState,
  setDailyNickname,
  startDaily,
  type DailyIdentity,
} from './daily.service';

const guestKeySchema = z.string().uuid().optional();
const answerSchema = z.object({
  guestKey: guestKeySchema,
  questionId: z.string().trim().min(1).max(64),
  // Null when the timer ran out.
  optionId: z.string().trim().min(1).max(8).nullable(),
});

export const dailyRoutes = Router();

// Open to visitors: learners are recognised by their login, guests by a key
// their browser keeps. Only learner accounts go on the leaderboard.
function identityOf(req: Request, guestKey: string | undefined): DailyIdentity {
  const user = req.user;
  if (user && (user.role === Role.STUDENT || user.role === Role.PARENT)) {
    return { userId: user.id, guestKey: null };
  }
  return { userId: null, guestKey: guestKey ?? null };
}

dailyRoutes.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const guestKey = guestKeySchema.parse(req.query.guestKey);
    res.json(await getDailyState(identityOf(req, guestKey)));
  }),
);

dailyRoutes.post(
  '/start',
  rateLimit({ keyPrefix: 'daily-start', windowMs: 15 * 60 * 1000, max: 120, message: 'Too many requests. Please try again soon.' }),
  optionalAuth,
  asyncHandler(async (req, res) => {
    const guestKey = guestKeySchema.parse(req.body?.guestKey);
    res.json(await startDaily(identityOf(req, guestKey)));
  }),
);

dailyRoutes.post(
  '/answer',
  // Generous: a whole school can share one internet connection.
  rateLimit({ keyPrefix: 'daily-answer', windowMs: 15 * 60 * 1000, max: 2000, message: 'Too many requests. Please try again soon.' }),
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { guestKey, questionId, optionId } = answerSchema.parse(req.body);
    res.json(await answerDaily(identityOf(req, guestKey), { questionId, optionId }));
  }),
);

dailyRoutes.post(
  '/claim',
  requireAuth,
  asyncHandler(async (req, res) => {
    const guestKey = z.string().uuid().parse(req.body?.guestKey);
    res.json(await claimGuestEntry(req.user!.id, guestKey));
  }),
);

dailyRoutes.get(
  '/leaderboard',
  optionalAuth,
  asyncHandler(async (req, res) => {
    res.json(await getDailyLeaderboard(identityOf(req, undefined).userId));
  }),
);

dailyRoutes.put(
  '/nickname',
  requireAuth,
  rateLimit({
    keyPrefix: 'daily-nickname',
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many tries. Please wait a few minutes.',
    keyGenerator: (req) => req.user?.id ?? 'anonymous',
  }),
  asyncHandler(async (req, res) => {
    const { userId } = identityOf(req, undefined);
    if (!userId) throw new AppError(403, 'Only learner accounts have a nickname');
    const { nickname } = z.object({ nickname: z.string().max(100) }).parse(req.body);
    res.json(await setDailyNickname(userId, nickname));
  }),
);
