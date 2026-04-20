import { Router } from 'express';
import { AppError, asyncHandler } from '../../../lib/http';
import { updateMeetingLinkSchema } from './session-admin.schemas';
import {
  approveCancellationRequest,
  listAdminSessions,
  listCancellationRequests,
  rejectCancellationRequest,
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
  asyncHandler(async (_req, res) => {
    const sessions = await listAdminSessions();
    res.json({ sessions });
  }),
);

sessionAdminRoutes.patch(
  '/:sessionId/meeting-link',
  asyncHandler(async (req, res) => {
    const sessionId = getRouteParam(req.params.sessionId, 'session id');
    const input = updateMeetingLinkSchema.parse(req.body);
    const session = await updateSessionMeetingLink(sessionId, input);
    res.json({ session });
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
    const result = await approveCancellationRequest(requestId);
    res.json(result);
  }),
);

sessionAdminRoutes.post(
  '/cancellations/:requestId/reject',
  asyncHandler(async (req, res) => {
    const requestId = getRouteParam(req.params.requestId, 'request id');
    const result = await rejectCancellationRequest(requestId);
    res.json(result);
  }),
);
