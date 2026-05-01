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
