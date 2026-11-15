import { Role } from '@prisma/client';
import { z } from 'zod';

const flag = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1')
  .optional();

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(40).optional(),
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional(),
  actorRole: z.nativeEnum(Role).optional(),
  actorUserId: z.string().trim().max(64).optional(),
  outcome: z.enum(['SUCCESS', 'FAILED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  hidePageViews: flag,
});

export type ListAuditLogsQueryInput = z.infer<typeof listAuditLogsQuerySchema>;
