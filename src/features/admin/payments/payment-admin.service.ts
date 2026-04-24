import {
  AuditAction,
  AuditEntityType,
  LessonPackageStatus,
  Prisma,
  PayoutStatus,
  Role,
} from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import { createAuditLog, type AuditActor } from '../../audit/audit.service';
import {
  createNotification,
  createNotifications,
} from '../../notifications/notification.service';
import type {
  CreatePaymentInput,
  ListLessonPackagesQueryInput,
  ListPaymentsQueryInput,
  MarkPayoutPaidInput,
} from './payment-admin.schemas';

function monthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value);
}

export async function listParentsForPayments() {
  return prisma.parentProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listPayments() {
  const [payments, total, aggregates] = await Promise.all([
    prisma.payment.findMany({
      include: {
        parent: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count(),
    prisma.payment.aggregate({
      _sum: {
        amount: true,
        sessionsIncluded: true,
        sessionsUsed: true,
      },
    }),
  ]);

  return {
    payments,
    pagination: {
      page: 1,
      pageSize: payments.length || 1,
      total,
      totalPages: 1,
    },
    summary: {
      total,
      amount: asNumber(aggregates._sum.amount),
      sessionsIncluded: aggregates._sum.sessionsIncluded ?? 0,
      sessionsUsed: aggregates._sum.sessionsUsed ?? 0,
    },
  };
}

export async function listPaymentsPage(input: ListPaymentsQueryInput) {
  const search = input.search?.trim();
  const where: Prisma.PaymentWhereInput = search
    ? {
        OR: [
          {
            parent: {
              user: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
          {
            parent: {
              user: {
                email: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ],
      }
    : {};

  const skip = (input.page - 1) * input.pageSize;
  const [payments, total, aggregates] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        parent: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: input.pageSize,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
        sessionsIncluded: true,
        sessionsUsed: true,
      },
    }),
  ]);

  return {
    payments,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    summary: {
      total,
      amount: asNumber(aggregates._sum.amount),
      sessionsIncluded: aggregates._sum.sessionsIncluded ?? 0,
      sessionsUsed: aggregates._sum.sessionsUsed ?? 0,
    },
  };
}

export async function listLessonPackages() {
  const [packages, total, grouped] = await Promise.all([
    prisma.studentLessonPackage.findMany({
      include: {
        parent: {
          include: { user: true },
        },
        student: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studentLessonPackage.count(),
    prisma.studentLessonPackage.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const counts = grouped.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});

  return {
    packages,
    pagination: {
      page: 1,
      pageSize: packages.length || 1,
      total,
      totalPages: 1,
    },
    summary: {
      total,
      active: counts.ACTIVE ?? 0,
      exhausted: counts.EXHAUSTED ?? 0,
      cancelled: counts.CANCELLED ?? 0,
    },
  };
}

export async function listLessonPackagesPage(
  input: ListLessonPackagesQueryInput,
) {
  const search = input.search?.trim();
  const where: Prisma.StudentLessonPackageWhereInput = {
    ...(input.status !== 'ALL'
      ? { status: input.status as LessonPackageStatus }
      : {}),
    ...(search
      ? {
          OR: [
            {
              parent: {
                user: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
            {
              parent: {
                user: {
                  email: { contains: search, mode: 'insensitive' },
                },
              },
            },
            {
              student: {
                fullName: { contains: search, mode: 'insensitive' },
              },
            },
            { subject: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const skip = (input.page - 1) * input.pageSize;
  const [packages, total, grouped] = await Promise.all([
    prisma.studentLessonPackage.findMany({
      where,
      include: {
        parent: {
          include: { user: true },
        },
        student: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: input.pageSize,
    }),
    prisma.studentLessonPackage.count({ where }),
    prisma.studentLessonPackage.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
  ]);

  const counts = grouped.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});

  return {
    packages,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    summary: {
      total,
      active: counts.ACTIVE ?? 0,
      exhausted: counts.EXHAUSTED ?? 0,
      cancelled: counts.CANCELLED ?? 0,
    },
  };
}

export async function createPayment(input: CreatePaymentInput, actor: AuditActor) {
  const [parent, student] = await Promise.all([
    prisma.parentProfile.findUnique({
      where: { id: input.parentId },
      include: { user: true },
    }),
    prisma.student.findFirst({
      where: {
        id: input.studentId,
        parentId: input.parentId,
      },
    }),
  ]);

  if (!parent) {
    throw new AppError(404, 'Parent not found');
  }

  if (!student) {
    throw new AppError(404, 'Student not found for this parent');
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        parentId: parent.id,
        plan: input.plan,
        amount: input.amount,
        gateway: input.gateway,
        sessionsIncluded: input.sessionsIncluded,
      },
      include: {
        parent: {
          include: { user: true },
        },
      },
    });

    const lessonPackage = await tx.studentLessonPackage.create({
      data: {
        parentId: parent.id,
        studentId: student.id,
        subject: input.subject.trim(),
        hoursPurchased: input.sessionsIncluded,
        amountPaid: input.amount,
        gateway: input.gateway,
        status: LessonPackageStatus.ACTIVE,
      },
      include: {
        parent: {
          include: { user: true },
        },
        student: true,
      },
    });

    await createNotification(
      {
        userId: parent.userId,
        role: Role.PARENT,
        title: 'Payment recorded',
        body: `Admin recorded ${input.sessionsIncluded} paid ${input.subject.trim()} hour(s) for ${student.fullName}.`,
        studentId: student.id,
      },
      tx,
    );

    await createAuditLog(
      {
        actor,
        action: AuditAction.PAYMENT_RECORDED,
        entityType: AuditEntityType.PAYMENT,
        entityId: payment.id,
        summary: `${actor.email ?? 'Admin'} recorded a payment for ${student.fullName}.`,
        studentId: student.id,
        metadata: {
          parentId: parent.id,
          amount: input.amount,
          subject: input.subject.trim(),
          sessionsIncluded: input.sessionsIncluded,
          gateway: input.gateway,
          plan: input.plan,
        },
      },
      tx,
    );

    return { payment, lessonPackage };
  });
}

export async function listPayoutSummaries(month = currentMonth()) {
  const { start, end } = monthRange(month);
  const [teachers, sessions, payouts] = await Promise.all([
    prisma.teacherProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.session.findMany({
      where: {
        startsAt: {
          gte: start,
          lt: end,
        },
        status: 'COMPLETED',
        attendance: {
          teacherConfirmedAt: { not: null },
          familyConfirmedAt: { not: null },
        },
      },
      include: {
        attendance: true,
      },
    }),
    prisma.teacherPayout.findMany({
      where: { month },
    }),
  ]);

  return teachers.map((teacher) => {
    const teacherSessions = sessions.filter(
      (session) => session.teacherId === teacher.id,
    );
    const verifiedMinutes = teacherSessions.reduce(
      (sum, session) => sum + session.durationMins,
      0,
    );
    const verifiedHours = verifiedMinutes / 60;
    const amount = verifiedHours * asNumber(teacher.hourlyRate);
    const payout = payouts.find((item) => item.teacherId === teacher.id);

    return {
      teacherId: teacher.id,
      teacherName: teacher.user.name,
      subjects: teacher.subjects,
      hourlyRate: teacher.hourlyRate,
      month,
      sessionCount: teacherSessions.length,
      verifiedHours,
      amount,
      status: payout?.status ?? PayoutStatus.PENDING,
      paidAt: payout?.paidAt ?? null,
      payoutId: payout?.id ?? null,
    };
  });
}

export async function markPayoutPaid(input: MarkPayoutPaidInput, actor: AuditActor) {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: input.teacherId },
    include: { user: true },
  });

  if (!teacher) {
    throw new AppError(404, 'Teacher not found');
  }

  const summaries = await listPayoutSummaries(input.month);
  const summary = summaries.find((item) => item.teacherId === input.teacherId);
  const amount = summary?.amount ?? 0;

  return prisma.$transaction(async (tx) => {
    const payout = await tx.teacherPayout.upsert({
      where: {
        teacherId_month: {
          teacherId: input.teacherId,
          month: input.month,
        },
      },
      create: {
        teacherId: input.teacherId,
        month: input.month,
        amount,
        status: PayoutStatus.PAID,
        paidAt: new Date(),
      },
      update: {
        amount,
        status: PayoutStatus.PAID,
        paidAt: new Date(),
      },
    });

    await createNotifications(
      [
        {
          userId: teacher.userId,
          role: Role.TEACHER,
          title: 'Payout marked paid',
          body: `Admin marked your ${input.month} payout of $${Math.round(amount)} as paid.`,
          teacherId: teacher.id,
        },
      ],
      tx,
    );

    await createAuditLog(
      {
        actor,
        action: AuditAction.PAYOUT_MARKED_PAID,
        entityType: AuditEntityType.PAYOUT,
        entityId: payout.id,
        summary: `${actor.email ?? 'Admin'} marked ${teacher.user.name}'s ${input.month} payout as paid.`,
        teacherId: teacher.id,
        metadata: {
          teacherId: teacher.id,
          month: input.month,
          amount,
        },
      },
      tx,
    );

    return payout;
  });
}
