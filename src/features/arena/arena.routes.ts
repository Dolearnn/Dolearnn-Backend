import { Router } from 'express';
import { AppError, asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { createChallengeSchema, joinChallengeSchema } from './arena.schemas';
import { createChallenge, getBattle, joinChallenge, listMyBattles } from './arena.service';

export const arenaRoutes = Router();

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

const byUser = (req: { user?: { id: string } }) => req.user?.id ?? 'anonymous';

arenaRoutes.use(requireAuth);

arenaRoutes.post(
  '/challenges',
  rateLimit({
    keyPrefix: 'arena-create',
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: 'You are creating battles too quickly. Please wait a few minutes.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const input = createChallengeSchema.parse(req.body);
    res.status(201).json(await createChallenge(req.user!, input));
  }),
);

arenaRoutes.get(
  '/challenges',
  asyncHandler(async (req, res) => {
    res.json(await listMyBattles(req.user!));
  }),
);

arenaRoutes.get(
  '/challenges/:code',
  // Codes are short, so guessing is slowed down.
  rateLimit({
    keyPrefix: 'arena-lookup',
    windowMs: 10 * 60 * 1000,
    max: 60,
    message: 'Too many lookups. Please wait a few minutes.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const code = getRouteParam(req.params.code, 'code');
    res.json(await getBattle(req.user!, code));
  }),
);

arenaRoutes.post(
  '/challenges/:code/join',
  rateLimit({
    keyPrefix: 'arena-join',
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: 'You are joining battles too quickly. Please wait a few minutes.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const code = getRouteParam(req.params.code, 'code');
    const input = joinChallengeSchema.parse(req.body ?? {});
    res.status(201).json(await joinChallenge(req.user!, code, input));
  }),
);
