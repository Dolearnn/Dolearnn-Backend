import { Router } from 'express';
import { asyncHandler } from '../../../lib/http';
import { getAdminReportQuerySchema } from './report-admin.schemas';
import { getAdminReport } from './report-admin.service';

export const reportAdminRoutes = Router();

reportAdminRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const input = getAdminReportQuerySchema.parse(req.query);
    const report = await getAdminReport(input);
    res.json({ report });
  }),
);
