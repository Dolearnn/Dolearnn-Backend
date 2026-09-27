import { Router } from 'express';
import { asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { guestBaselineOnlySchema, updateLearnerProfileSchema } from './student.schemas';
import { getLearnerProfile, saveGuestBaseline, updateLearnerProfile } from './student.service';

export const studentRoutes = Router();

studentRoutes.use(requireAuth);

studentRoutes.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ profile: await getLearnerProfile(req.user!) });
  }),
);

studentRoutes.put(
  '/onboarding',
  asyncHandler(async (req, res) => {
    const input = updateLearnerProfileSchema.parse(req.body);
    res.json({ profile: await updateLearnerProfile(req.user!, input) });
  }),
);

studentRoutes.put(
  '/guest-baseline',
  asyncHandler(async (req, res) => {
    const input = guestBaselineOnlySchema.parse(req.body);
    await saveGuestBaseline(req.user!, input);
    res.status(204).send();
  }),
);
