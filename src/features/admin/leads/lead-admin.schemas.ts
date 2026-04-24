import { LeadSource, LeadStatus } from '@prisma/client';
import { z } from 'zod';

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  source: z.nativeEnum(LeadSource).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});

export type ListLeadsQueryInput = z.infer<typeof listLeadsQuerySchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
