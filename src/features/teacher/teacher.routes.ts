import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../lib/http';
import { AppError } from '../../lib/http';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  createSessionNoteSchema,
  createSessionProposalSchema,
  reportContactAttemptSchema,
  requestCancellationSchema,
  updatePayoutAccountSchema,
  updateTeacherProfileSchema,
} from './teacher.schemas';
import {
  confirmTeacherAttendance,
  createSessionProposal,
  reportTeacherContactAttempt,
  requestTeacherSessionCancellation,
  submitSessionNote,
  teacherPayouts,
  teacherProfile,
  teacherSessions,
  teacherStudents,
  updateTeacherPayoutAccount,
  updateTeacherProfile,
} from './teacher.service';

export const teacherRoutes = Router();

teacherRoutes.use(requireAuth, requireRole(Role.TEACHER));

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

teacherRoutes.get(
  '/me',
  asyncHandler(async (req, res) => {
    const profile = await teacherProfile(req.user!.id, req.user!.role);
    res.json({ profile });
  }),
);

teacherRoutes.get(
  '/students',
  asyncHandler(async (req, res) => {
    const students = await teacherStudents(req.user!.id, req.user!.role);
    res.json({ students });
  }),
);

teacherRoutes.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const sessions = await teacherSessions(req.user!.id, req.user!.role);
    res.json({ sessions });
  }),
);

teacherRoutes.get(
  '/payouts',
  asyncHandler(async (req, res) => {
    const payouts = await teacherPayouts(req.user!.id, req.user!.role);
    res.json({ payouts });
  }),
);

teacherRoutes.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const input = updateTeacherProfileSchema.parse(req.body);
    const profile = await updateTeacherProfile(
      req.user!.id,
      req.user!.role,
      input,
    );
    res.json({ profile });
  }),
);

teacherRoutes.patch(
  '/payout-account',
  asyncHandler(async (req, res) => {
    const input = updatePayoutAccountSchema.parse(req.body);
    const profile = await updateTeacherPayoutAccount(
      req.user!.id,
      req.user!.role,
      input,
    );
    res.json({ profile });
  }),
);

teacherRoutes.post(
  '/sessions/:sessionId/attendance/confirm',
  asyncHandler(async (req, res) => {
    const sessionId = getRouteParam(req.params.sessionId, 'session id');
    const result = await confirmTeacherAttendance(
      req.user!.id,
      req.user!.role,
      sessionId,
    );
    res.json(result);
  }),
);

teacherRoutes.post(
  '/sessions/:sessionId/notes',
  asyncHandler(async (req, res) => {
    const sessionId = getRouteParam(req.params.sessionId, 'session id');
    const input = createSessionNoteSchema.parse(req.body);
    const result = await submitSessionNote(
      req.user!.id,
      req.user!.role,
      sessionId,
      input,
    );
    res.status(201).json(result);
  }),
);

teacherRoutes.post(
  '/sessions/:sessionId/notes/contact-attempt',
  asyncHandler(async (req, res) => {
    const sessionId = getRouteParam(req.params.sessionId, 'session id');
    const input = reportContactAttemptSchema.parse(req.body);
    const result = await reportTeacherContactAttempt(
      req.user!.id,
      req.user!.role,
      sessionId,
      input,
    );
    res.status(201).json(result);
  }),
);

teacherRoutes.post(
  '/sessions/:sessionId/cancellations',
  asyncHandler(async (req, res) => {
    const sessionId = getRouteParam(req.params.sessionId, 'session id');
    const input = requestCancellationSchema.parse(req.body);
    const result = await requestTeacherSessionCancellation(
      req.user!.id,
      req.user!.role,
      sessionId,
      input,
    );
    res.status(201).json(result);
  }),
);

teacherRoutes.post(
  '/session-proposals',
  asyncHandler(async (req, res) => {
    const input = createSessionProposalSchema.parse(req.body);
    const proposal = await createSessionProposal(
      req.user!.id,
      req.user!.role,
      input,
    );
    res.status(201).json({ proposal });
  }),
);
