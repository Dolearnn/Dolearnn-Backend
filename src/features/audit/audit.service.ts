import {
  AuditAction,
  AuditEntityType,
  Prisma,
  Role,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface AuditActor {
  id: string;
  role: Role;
  email?: string;
}

export interface CreateAuditLogInput {
  actor: AuditActor;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
  studentId?: string | null;
  teacherId?: string | null;
}

type AuditClient = Prisma.TransactionClient | typeof prisma;

export async function createAuditLog(
  input: CreateAuditLogInput,
  client: AuditClient = prisma,
) {
  return client.auditLog.create({
    data: {
      actorUserId: input.actor.id,
      actorRole: input.actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      metadata: input.metadata,
      studentId: input.studentId ?? null,
      teacherId: input.teacherId ?? null,
    },
  });
}
