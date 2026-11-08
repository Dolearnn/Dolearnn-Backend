import { Router } from 'express';
import { asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { guestBaselineOnlySchema, reminderSettingSchema, updateLearnerProfileSchema } from './student.schemas';
import { getLearnerProfile, saveGuestBaseline, updateLearnerProfile } from './student.service';
import { getReminderSetting, setReminderSetting } from '../reminders/reminders.service';

export const studentRoutes = Router();

studentRoutes.use(requireAuth);

studentRoutes.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ profile: await getLearnerProfile(req.user!) });
  }),
);

studentRoutes.get(
  '/reminders',
  asyncHandler(async (req, res) => {
    res.json(await getReminderSetting(req.user!.id));
  }),
);

studentRoutes.put(
  '/reminders',
  asyncHandler(async (req, res) => {
    const { enabled } = reminderSettingSchema.parse(req.body);
    res.json(await setReminderSetting(req.user!.id, enabled));
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
