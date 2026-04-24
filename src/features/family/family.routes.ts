import { Router } from 'express';
import { Role } from '@prisma/client';
import { AppError, asyncHandler } from '../../lib/http';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  createBookingRequestSchema,
  createStudentSchema,
  deactivateStudentSchema,
  declineSessionProposalSchema,
  requestCancellationSchema,
  saveGoalSchema,
  saveIntakeSchema,
} from './family.schemas';
import {
  acceptSessionProposal,
  createBookingRequest,
  deactivateStudent,
  declineSessionProposal,
  familyProfile,
  familySessionCreditSummary,
  confirmFamilyAttendance,
  listFamilyPayments,
  listSessionProposals,
  listFamilySessions,
  listBookingRequests,
  listStudents,
  reactivateStudent,
  requestFamilySessionCancellation,
  saveStudentGoal,
  saveStudentIntake,
  updateStudent,
} from './family.service';

export const familyRoutes = Router();

familyRoutes.use(requireAuth, requireRole(Role.PARENT));

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

familyRoutes.get(
  '/me',
  asyncHandler(async (req, res) => {
    const profile = await familyProfile(req.user!.id, req.user!.role);
    res.json({ profile });
  }),
);

familyRoutes.get(
  '/students',
  asyncHandler(async (req, res) => {
    const students = await listStudents(req.user!.id, req.user!.role);
    res.json({ students });
  }),
);

familyRoutes.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const payments = await listFamilyPayments(req.user!.id, req.user!.role);
    res.json({ payments });
  }),
);

familyRoutes.post(
  '/students',
  asyncHandler(async (req, res) => {
    throw new AppError(403, 'Students are created by admin');
  }),
);

familyRoutes.put(
  '/students/:studentId',
  asyncHandler(async (req, res) => {
    const input = createStudentSchema.parse(req.body);
    const studentId = getRouteParam(req.params.studentId, 'student id');
    const student = await updateStudent(
      req.user!.id,
      req.user!.role,
      studentId,
      input,
    );
    res.json({ student });
  }),
);

familyRoutes.put(
  '/students/:studentId/intake',
  asyncHandler(async (req, res) => {
    const input = saveIntakeSchema.parse(req.body);
    const studentId = getRouteParam(req.params.studentId, 'student id');
    const intake = await saveStudentIntake(
      req.user!.id,
      req.user!.role,
      studentId,
      input,
    );
    res.json({ intake });
  }),
);

familyRoutes.put(
  '/students/:studentId/goal',
  asyncHandler(async (req, res) => {
    const input = saveGoalSchema.parse(req.body);
    const studentId = getRouteParam(req.params.studentId, 'student id');
    const goal = await saveStudentGoal(
      req.user!.id,
      req.user!.role,
      studentId,
      input,
    );
    res.json({ goal });
  }),
);

familyRoutes.post(
  '/students/:studentId/deactivate',
  asyncHandler(async (req, res) => {
    const input = deactivateStudentSchema.parse(req.body);
    const studentId = getRouteParam(req.params.studentId, 'student id');
    const student = await deactivateStudent(
      req.user!.id,
      req.user!.role,
      studentId,
      input,
    );
    res.json({ student });
  }),
);

familyRoutes.post(
  '/students/:studentId/reactivate',
  asyncHandler(async (req, res) => {
    const studentId = getRouteParam(req.params.studentId, 'student id');
    const student = await reactivateStudent(
      req.user!.id,
      req.user!.role,
      studentId,
    );
    res.json({ student });
  }),
);

familyRoutes.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const sessions = await listFamilySessions(req.user!.id, req.user!.role);
    res.json({ sessions });
  }),
);

familyRoutes.get(
  '/session-credits',
  asyncHandler(async (req, res) => {
    const credits = await familySessionCreditSummary(req.user!.id, req.user!.role);
    res.json({ credits });
  }),
);

familyRoutes.get(
  '/booking-requests',
  asyncHandler(async (req, res) => {
    const requests = await listBookingRequests(req.user!.id, req.user!.role);
    res.json({ requests });
  }),
);

familyRoutes.post(
  '/booking-requests',
  asyncHandler(async (req, res) => {
    const input = createBookingRequestSchema.parse(req.body);
    const request = await createBookingRequest(
      req.user!.id,
      req.user!.role,
      input,
    );
    res.status(201).json({ request });
  }),
);

familyRoutes.post(
  '/sessions/:sessionId/attendance/confirm',
  asyncHandler(async (req, res) => {
    const sessionId = getRouteParam(req.params.sessionId, 'session id');
    const result = await confirmFamilyAttendance(
      req.user!.id,
      req.user!.role,
      sessionId,
      req.user!,
    );
    res.json(result);
  }),
);

familyRoutes.post(
  '/sessions/:sessionId/cancellations',
  asyncHandler(async (req, res) => {
    const sessionId = getRouteParam(req.params.sessionId, 'session id');
    const input = requestCancellationSchema.parse(req.body);
    const result = await requestFamilySessionCancellation(
      req.user!.id,
      req.user!.role,
      sessionId,
      input,
    );
    res.status(201).json(result);
  }),
);

familyRoutes.get(
  '/session-proposals',
  asyncHandler(async (req, res) => {
    const proposals = await listSessionProposals(req.user!.id, req.user!.role);
    res.json({ proposals });
  }),
);

familyRoutes.post(
  '/session-proposals/:proposalId/accept',
  asyncHandler(async (req, res) => {
    const proposalId = getRouteParam(req.params.proposalId, 'proposal id');
    const result = await acceptSessionProposal(
      req.user!.id,
      req.user!.role,
      proposalId,
    );
    res.json(result);
  }),
);

familyRoutes.post(
  '/session-proposals/:proposalId/decline',
  asyncHandler(async (req, res) => {
    const proposalId = getRouteParam(req.params.proposalId, 'proposal id');
    const input = declineSessionProposalSchema.parse(req.body);
    const proposal = await declineSessionProposal(
      req.user!.id,
      req.user!.role,
      proposalId,
      input,
    );
    res.json({ proposal });
  }),
);
