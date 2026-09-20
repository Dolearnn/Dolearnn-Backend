import { Router } from 'express';
import { asyncHandler } from '../../../lib/http';
import { getAdminReportQuerySchema } from './report-admin.schemas';
import { getImpactReport } from './impact-admin.service';
import { getAdminReport } from './report-admin.service';

export const reportAdminRoutes = Router();

reportAdminRoutes.get(
  '/impact',
  asyncHandler(async (_req, res) => {
    res.json({ impact: await getImpactReport() });
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
