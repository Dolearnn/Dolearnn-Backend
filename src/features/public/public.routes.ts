import { z } from 'zod';
import { turnOffRemindersWithLink } from '../reminders/reminders.service';
import { Router } from 'express';
import { asyncHandler } from '../../lib/http';
import { rateLimit } from '../../middleware/rate-limit';
import {
  createNewsletterLeadSchema,
  createWaitlistEntrySchema,
} from './public.schemas';
import {
  createNewsletterLead,
  createWaitlistEntry,
} from './public.service';

const turnOffRemindersSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  code: z.string().trim().min(1).max(128),
});

export const publicRoutes = Router();

publicRoutes.post(
  '/waitlist',
  rateLimit({
    keyPrefix: 'public-waitlist',
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many waitlist submissions. Please try again later.',
  }),
  asyncHandler(async (req, res) => {
    const input = createWaitlistEntrySchema.parse(req.body);
    const result = await createWaitlistEntry(input);
    res.status(201).json(result);
  }),
);

publicRoutes.post(
  '/reminders/off',
  rateLimit({
    keyPrefix: 'public-reminders-off',
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many requests. Please try again later.',
  }),
  asyncHandler(async (req, res) => {
    const { userId, code } = turnOffRemindersSchema.parse(req.body);
    await turnOffRemindersWithLink(userId, code);
    res.json({ ok: true });
  }),
);

publicRoutes.post(
  '/newsletter',
  rateLimit({
    keyPrefix: 'public-newsletter',
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many newsletter submissions. Please try again later.',
  }),
  asyncHandler(async (req, res) => {
    const input = createNewsletterLeadSchema.parse(req.body);
    const result = await createNewsletterLead(input);
    res.status(201).json(result);
  }),
);
