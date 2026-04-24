import { SessionStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { listPayoutSummaries } from '../payments/payment-admin.service';
import type { GetAdminReportQueryInput } from './report-admin.schemas';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

function monthKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 7);
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

export async function getAdminReport(input: GetAdminReportQueryInput) {
  const month = input.month ?? currentMonth();
  const { start, end } = monthRange(month);

  const [
    monthlyPayments,
    monthlySessions,
    studentStatusCounts,
    paymentMonths,
    sessionMonths,
    teacherRows,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.session.findMany({
      where: {
        startsAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
        student: true,
        teacher: {
          include: { user: true },
        },
        attendance: true,
        cancellations: {
          orderBy: { requestedAt: 'desc' },
        },
      },
      orderBy: { startsAt: 'desc' },
    }),
    prisma.student.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.payment.findMany({
      select: { createdAt: true },
      distinct: ['createdAt'],
      orderBy: { createdAt: 'desc' },
    }),
    prisma.session.findMany({
      select: { startsAt: true },
      distinct: ['startsAt'],
      orderBy: { startsAt: 'desc' },
    }),
    listPayoutSummaries(month),
  ]);

  const completedSessions = monthlySessions.filter(
    (session) => session.status === SessionStatus.COMPLETED,
  );
  const verifiedSessions = completedSessions.filter(
    (session) =>
      !!session.attendance?.teacherConfirmedAt &&
      !!session.attendance?.familyConfirmedAt,
  );
  const sessionsNeedingAttendance = completedSessions
    .filter(
      (session) =>
        !session.attendance?.teacherConfirmedAt ||
        !session.attendance?.familyConfirmedAt,
    )
    .map((session) => ({
      id: session.id,
      label: `${session.subject} - ${session.student.fullName}`,
      sub: `${session.startsAt.toISOString()} - ${session.durationMins} min`,
    }));

  const cancellationActivity = monthlySessions
    .filter((session) => session.cancellations.length > 0)
    .map((session) => {
      const cancellation = session.cancellations[0];
      return {
        id: session.id,
        label: `${cancellation.requestedBy.toLowerCase()} requested cancellation`,
        sub: cancellation.reason,
        tone:
          cancellation.status === 'APPROVED'
            ? 'danger'
            : cancellation.status === 'REJECTED'
              ? 'muted'
              : 'warning',
      };
    });

  const cancellationRequests = monthlySessions.filter(
    (session) => session.cancellations.length > 0,
  ).length;
  const approvedCancellations = monthlySessions.filter(
    (session) => session.cancellations[0]?.status === 'APPROVED',
  ).length;
  const revenue = monthlyPayments.reduce(
    (sum, payment) => sum + asNumber(payment.amount),
    0,
  );
  const verifiedHours = teacherRows.reduce(
    (sum, row) => sum + row.verifiedHours,
    0,
  );
  const teacherPayoutDue = teacherRows.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const paidTeacherPayout = teacherRows.reduce(
    (sum, row) => sum + (row.status === 'PAID' ? row.amount : 0),
    0,
  );
  const confirmationRate =
    completedSessions.length > 0
      ? Math.round((verifiedSessions.length / completedSessions.length) * 100)
      : 0;

  const studentCounts = studentStatusCounts.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    },
    {},
  );

  const monthOptions = Array.from(
    new Set([
      currentMonth(),
      ...paymentMonths.map((item) => monthKey(item.createdAt)),
      ...sessionMonths.map((item) => monthKey(item.startsAt)),
    ]),
  ).sort((a, b) => b.localeCompare(a));

  return {
    month,
    monthOptions,
    summary: {
      revenue,
      paymentCount: monthlyPayments.length,
      verifiedHours,
      teacherPayoutDue,
      paidTeacherPayout,
      margin: revenue - teacherPayoutDue,
      confirmationRate,
      cancellationRequests,
      approvedCancellations,
      activeStudents: studentCounts.ACTIVE ?? 0,
      deactivatedStudents: studentCounts.DEACTIVATED ?? 0,
      totalSessions: monthlySessions.length,
      completedSessions: completedSessions.length,
      verifiedSessions: verifiedSessions.length,
    },
    teacherRows: teacherRows.map((row) => ({
      ...row,
      hourlyRate: asNumber(row.hourlyRate),
      status: row.status === 'PAID' ? 'Paid' : 'Pending',
      paidAt: row.paidAt?.toISOString() ?? null,
    })),
    sessionsNeedingAttendance,
    cancellationActivity,
  };
}
