import { Router } from 'express';
import { AppError, asyncHandler } from '../../../lib/http';
import {
  createAdminSessionSchema,
  listAdminSessionsQuerySchema,
  updateMeetingLinkSchema,
} from './session-admin.schemas';
import {
  approveCancellationRequest,
  createAdminSession,
  listBookingRequests,
  listAdminSessions,
  listCancellationRequests,
  rejectCancellationRequest,
  scheduleBookingRequest,
  updateSessionMeetingLink,
} from './session-admin.service';

export const sessionAdminRoutes = Router();

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

sessionAdminRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const hasQuery = Object.keys(req.query).length > 0;
    const result = hasQuery
      ? await listAdminSessions(listAdminSessionsQuerySchema.parse(req.query))
      : await listAdminSessions();
    if (Array.isArray(result)) {
      res.json({ sessions: result });
      return;
    }
    res.json(result);
  }),
);

sessionAdminRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createAdminSessionSchema.parse(req.body);
    const result = await createAdminSession(input);
    res.status(201).json(result);
  }),
);

sessionAdminRoutes.patch(
  '/:sessionId/meeting-link',
  asyncHandler(async (req, res) => {
    const sessionId = getRouteParam(req.params.sessionId, 'session id');
    const input = updateMeetingLinkSchema.parse(req.body);
    const session = await updateSessionMeetingLink(sessionId, input, req.user!);
    res.json({ session });
  }),
);

sessionAdminRoutes.get(
  '/booking-requests',
  asyncHandler(async (_req, res) => {
    const requests = await listBookingRequests();
    res.json({ requests });
  }),
);

sessionAdminRoutes.post(
  '/booking-requests/:requestId/schedule',
  asyncHandler(async (req, res) => {
    const requestId = getRouteParam(req.params.requestId, 'request id');
    const result = await scheduleBookingRequest(requestId);
    res.json(result);
  }),
);

sessionAdminRoutes.get(
  '/cancellations',
  asyncHandler(async (_req, res) => {
    const cancellations = await listCancellationRequests();
    res.json({ cancellations });
  }),
);

sessionAdminRoutes.post(
  '/cancellations/:requestId/approve',
  asyncHandler(async (req, res) => {
    const requestId = getRouteParam(req.params.requestId, 'request id');
    const result = await approveCancellationRequest(requestId, req.user!);
    res.json(result);
  }),
);

sessionAdminRoutes.post(
  '/cancellations/:requestId/reject',
  asyncHandler(async (req, res) => {
    const requestId = getRouteParam(req.params.requestId, 'request id');
    const result = await rejectCancellationRequest(requestId, req.user!);
    res.json(result);
  }),
);
