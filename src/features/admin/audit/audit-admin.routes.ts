import { Router } from 'express';
import { asyncHandler } from '../../../lib/http';
import { listAuditLogsQuerySchema } from './audit-admin.schemas';
import { listAuditLogs } from './audit-admin.service';

export const auditAdminRoutes = Router();

auditAdminRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const input = listAuditLogsQuerySchema.parse(req.query);
    const result = await listAuditLogs(input);
    res.json(result);
  }),
);
