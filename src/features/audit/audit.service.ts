import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/*
 * The audit log records everything users do on the platform: sign-ins, practice,
 * Arena, tutoring, payments, admin work and the pages they open. Most entries
 * are written by the activity-log middleware (src/middleware/activity-log.ts);
 * a few services also write a richer entry themselves with createAuditLog().
 */

/** Areas of the platform, used to group and filter the admin activity log. */
export const AuditCategory = {
  AUTH: 'AUTH',
  ACCOUNT: 'ACCOUNT',
  PRACTICE: 'PRACTICE',
  ARENA: 'ARENA',
  DAILY: 'DAILY',
  TUTORING: 'TUTORING',
  PAYMENTS: 'PAYMENTS',
  NOTIFICATIONS: 'NOTIFICATIONS',
  CONTENT: 'CONTENT',
  ADMIN: 'ADMIN',
  PUBLIC: 'PUBLIC',
  NAVIGATION: 'NAVIGATION',
  OTHER: 'OTHER',
} as const;
export type AuditCategory = (typeof AuditCategory)[keyof typeof AuditCategory];

/** Actions written directly by services (the middleware adds many more). */
export const AuditAction = {
  STUDENT_CREATED: 'STUDENT_CREATED',
  PAYMENT_RECORDED: 'PAYMENT_RECORDED',
  PAYOUT_MARKED_PAID: 'PAYOUT_MARKED_PAID',
  MEETING_LINK_UPDATED: 'MEETING_LINK_UPDATED',
  CANCELLATION_APPROVED: 'CANCELLATION_APPROVED',
  CANCELLATION_REJECTED: 'CANCELLATION_REJECTED',
  TEACHER_RATE_UPDATED: 'TEACHER_RATE_UPDATED',
  TEACHER_TERMINATED: 'TEACHER_TERMINATED',
  FAMILY_ATTENDANCE_CONFIRMED: 'FAMILY_ATTENDANCE_CONFIRMED',
  TEACHER_ATTENDANCE_CONFIRMED: 'TEACHER_ATTENDANCE_CONFIRMED',
  PAGE_VIEWED: 'PAGE_VIEWED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AuditEntityType = {
  USER: 'USER',
  STUDENT: 'STUDENT',
  PAYMENT: 'PAYMENT',
  PAYOUT: 'PAYOUT',
  SESSION: 'SESSION',
  CANCELLATION: 'CANCELLATION',
  TEACHER: 'TEACHER',
  ATTENDANCE: 'ATTENDANCE',
  PAGE: 'PAGE',
} as const;
export type AuditEntityType = (typeof AuditEntityType)[keyof typeof AuditEntityType];

const DEFAULT_CATEGORY: Record<string, AuditCategory> = {
  FAMILY_ATTENDANCE_CONFIRMED: AuditCategory.TUTORING,
  TEACHER_ATTENDANCE_CONFIRMED: AuditCategory.TUTORING,
  PAGE_VIEWED: AuditCategory.NAVIGATION,
};

export interface AuditActor {
  id: string;
  role: Role;
  email?: string;
}

export interface CreateAuditLogInput {
  actor: AuditActor | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  category?: AuditCategory;
  outcome?: 'SUCCESS' | 'FAILED';
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
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
      actorUserId: input.actor?.id ?? null,
      actorRole: input.actor?.role ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId.slice(0, 300),
      category: input.category ?? DEFAULT_CATEGORY[input.action] ?? AuditCategory.ADMIN,
      outcome: input.outcome ?? 'SUCCESS',
      summary: input.summary.slice(0, 500),
      metadata: input.metadata,
      ipAddress: input.ipAddress?.slice(0, 100) ?? null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
      studentId: input.studentId ?? null,
      teacherId: input.teacherId ?? null,
    },
  });
}

/** Writes a log entry without making the caller wait; failures are only reported. */
export function recordActivity(input: CreateAuditLogInput) {
  createAuditLog(input)
    .catch((error) => {
      // A learner or tutor id that no longer exists: keep the entry, drop the link.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003' &&
        (input.studentId || input.teacherId)
      ) {
        return createAuditLog({ ...input, studentId: null, teacherId: null });
      }
      throw error;
    })
    .catch((error) => {
      console.warn('[activity] could not record', input.action, error instanceof Error ? error.message : error);
    });
}
