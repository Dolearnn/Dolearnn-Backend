import { LessonPackageStatus, PayoutStatus, Role } from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import {
  createNotification,
  createNotifications,
} from '../../notifications/notification.service';
import type {
  CreatePaymentInput,
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
  return prisma.payment.findMany({
    include: {
      parent: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listLessonPackages() {
  return prisma.studentLessonPackage.findMany({
    include: {
      parent: {
        include: { user: true },
      },
      student: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createPayment(input: CreatePaymentInput) {
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

export async function markPayoutPaid(input: MarkPayoutPaidInput) {
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

    return payout;
  });
}
