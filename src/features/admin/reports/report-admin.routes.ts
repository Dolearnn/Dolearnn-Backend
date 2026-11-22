import { Router } from 'express';
import { asyncHandler } from '../../../lib/http';
import { getAdminReportQuerySchema } from './report-admin.schemas';
import { getImpactReport } from './impact-admin.service';
import { funnelQuerySchema, getFunnelReport } from './funnel-admin.service';
import { getAdminReport } from './report-admin.service';

export const reportAdminRoutes = Router();

reportAdminRoutes.get(
  '/impact',
  asyncHandler(async (_req, res) => {
    res.json({ impact: await getImpactReport() });
  }),
);

// Sign-up funnel: how learners who joined in the last 7, 30 or 90 days got on.
reportAdminRoutes.get(
  '/funnel',
  asyncHandler(async (req, res) => {
    const { days } = funnelQuerySchema.parse(req.query);
    res.json({ funnel: await getFunnelReport(days) });
  }),
);

reportAdminRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const input = getAdminReportQuerySchema.parse(req.query);
    const report = await getAdminReport(input);
    res.json({ report });
  }),
);
