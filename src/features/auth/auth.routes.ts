import { Router } from 'express';
import { asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import {
  changePasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
} from './auth.schemas';
import {
  changePassword,
  currentUser,
  loginOrRegisterWithGoogle,
  loginWithPassword,
  registerParent,
} from './auth.service';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await registerParent(input);
    res.status(201).json(result);
  }),
);

authRoutes.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await loginWithPassword(input);
    res.json(result);
  }),
);

authRoutes.post(
  '/google',
  asyncHandler(async (req, res) => {
    const input = googleAuthSchema.parse(req.body);
    const result = await loginOrRegisterWithGoogle(input);
    res.json(result);
  }),
);

authRoutes.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await currentUser(req.user!.id);
    res.json({ user });
  }),
);

authRoutes.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const result = await changePassword(req.user!.id, input);
    res.json(result);
  }),
);

authRoutes.post('/logout', (_req, res) => {
  res.status(204).send();
});
