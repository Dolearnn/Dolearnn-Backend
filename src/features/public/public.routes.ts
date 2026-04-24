import { Router } from 'express';
import { asyncHandler } from '../../lib/http';
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
  asyncHandler(async (req, res) => {
    const input = createWaitlistEntrySchema.parse(req.body);
    const result = await createWaitlistEntry(input);
    res.status(201).json(result);
  }),
);

publicRoutes.post(
  '/newsletter',
  asyncHandler(async (req, res) => {
    const input = createNewsletterLeadSchema.parse(req.body);
    const result = await createNewsletterLead(input);
    res.status(201).json(result);
  }),
);
