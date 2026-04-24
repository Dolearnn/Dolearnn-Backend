import { Router } from 'express';
import { AppError, asyncHandler } from '../../../lib/http';
import {
  listLeadsQuerySchema,
  updateLeadStatusSchema,
} from './lead-admin.schemas';
import { listLeads, updateLeadStatus } from './lead-admin.service';

export const leadAdminRoutes = Router();

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

leadAdminRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const input = listLeadsQuerySchema.parse(req.query);
    const result = await listLeads(input);
    res.json(result);
  }),
);

leadAdminRoutes.patch(
  '/:leadId/status',
  asyncHandler(async (req, res) => {
    const leadId = getRouteParam(req.params.leadId, 'lead id');
    const input = updateLeadStatusSchema.parse(req.body);
    const lead = await updateLeadStatus(leadId, input);
    res.json({ lead });
  }),
);
