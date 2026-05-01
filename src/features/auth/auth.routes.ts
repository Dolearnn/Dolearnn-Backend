import { Router } from 'express';
import { asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  resetPasswordSchema,
  registerSchema,
} from './auth.schemas';
import {
  changePassword,
  currentUser,
  forgotPassword,
  loginOrRegisterWithGoogle,
  loginWithPassword,
  logoutUser,
  registerParent,
  resetPassword,
} from './auth.service';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  rateLimit({
    keyPrefix: 'auth-register',
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many registration attempts. Please try again later.',
  }),
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await registerParent(input);
    res.status(201).json(result);
  }),
);

authRoutes.post(
  '/login',
  rateLimit({
    keyPrefix: 'auth-login',
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts. Please try again later.',
  }),
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await loginWithPassword(input);
    res.json(result);
  }),
);

authRoutes.post(
  '/google',
  rateLimit({
    keyPrefix: 'auth-google',
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many sign-in attempts. Please try again later.',
  }),
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

authRoutes.post(
  '/forgot-password',
  rateLimit({
    keyPrefix: 'auth-forgot-password',
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many reset requests. Please try again later.',
  }),
  asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    await forgotPassword(input);
    res.status(204).send();
  }),
);

authRoutes.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(input);
    res.json(result);
  }),
);

authRoutes.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await logoutUser(req.user!.id);
    res.status(204).send();
  }),
);
