import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import type { ListAuditLogsQueryInput } from './audit-admin.schemas';

export async function listAuditLogs(input: ListAuditLogsQueryInput) {
  const search = input.search?.trim();
  const where: Prisma.AuditLogWhereInput = {
    ...(input.action ? { action: input.action } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(search
      ? {
          OR: [
            { summary: { contains: search, mode: 'insensitive' } },
            {
              actor: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
            {
              actor: {
                email: { contains: search, mode: 'insensitive' },
              },
            },
            { entityId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const skip = (input.page - 1) * input.pageSize;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: true,
        student: true,
        teacher: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: input.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    filters: {
      actions: Object.values(AuditAction),
      entityTypes: Object.values(AuditEntityType),
    },
  };
}
