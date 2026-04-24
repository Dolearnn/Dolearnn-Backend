import { AuditAction, AuditEntityType } from '@prisma/client';
import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  entityType: z.nativeEnum(AuditEntityType).optional(),
});

export type ListAuditLogsQueryInput = z.infer<typeof listAuditLogsQuerySchema>;
