import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { KNOWN_ACTIONS } from '../../audit/activity-catalog';
import { AuditAction, AuditCategory } from '../../audit/audit.service';
import type { ListAuditLogsQueryInput } from './audit-admin.schemas';

const DAY_MS = 24 * 60 * 60 * 1000;

const ALL_ACTIONS = Array.from(
  new Set([...KNOWN_ACTIONS, ...Object.values(AuditAction), 'API_REQUEST']),
).sort();

const actorSelect = { id: true, name: true, email: true, role: true } as const;

export async function listAuditLogs(input: ListAuditLogsQueryInput) {
  const search = input.search?.trim();
  const createdAt: Prisma.DateTimeFilter = {};
  if (input.from) createdAt.gte = input.from;
  if (input.to) createdAt.lte = input.to;

  const and: Prisma.AuditLogWhereInput[] = [];
  if (input.hidePageViews) and.push({ action: { not: AuditAction.PAGE_VIEWED } });
  if (search) {
    and.push({
      OR: [
        { summary: { contains: search, mode: 'insensitive' } },
        { action: { contains: search.replace(/\s+/g, '_'), mode: 'insensitive' } },
        { actor: { name: { contains: search, mode: 'insensitive' } } },
        { actor: { email: { contains: search, mode: 'insensitive' } } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search } },
      ],
    });
  }

  const where: Prisma.AuditLogWhereInput = {
    ...(input.category ? { category: input.category } : {}),
    ...(input.action ? { action: input.action } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.actorRole ? { actorRole: input.actorRole } : {}),
    ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
    ...(input.outcome ? { outcome: input.outcome } : {}),
    ...(input.from || input.to ? { createdAt } : {}),
    ...(and.length ? { AND: and } : {}),
  };

  const since = new Date(Date.now() - DAY_MS);
  const skip = (input.page - 1) * input.pageSize;

  const [logs, total, eventsToday, failedToday, activeActors, categoriesToday, actor] =
    await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: actorSelect },
          student: { select: { id: true, fullName: true } },
          teacher: { select: { id: true, user: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: input.pageSize,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: since }, outcome: 'FAILED' } }),
      prisma.auditLog.groupBy({
        by: ['actorUserId'],
        where: { createdAt: { gte: since }, actorUserId: { not: null } },
      }),
      prisma.auditLog.groupBy({
        by: ['category'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      input.actorUserId
        ? prisma.user.findUnique({
            where: { id: input.actorUserId },
            select: { ...actorSelect, createdAt: true, status: true },
          })
        : Promise.resolve(null),
    ]);

  return {
    logs,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    stats: {
      eventsToday,
      failedToday,
      activeUsersToday: activeActors.length,
      categoriesToday: Object.fromEntries(
        categoriesToday.map((row) => [row.category, row._count._all]),
      ),
    },
    actor,
    filters: {
      categories: Object.values(AuditCategory),
      actions: ALL_ACTIONS,
      roles: Object.values(Role),
    },
  };
}
