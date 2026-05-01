import { Prisma, ProposalStatus, SessionStatus } from '@prisma/client';
import { AppError } from './http';

type DbClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

type ConflictDetails = {
  subject: string;
  startsAt: Date;
  studentName: string;
};

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function subtractMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() - minutes * 60 * 1000);
}

function rangesOverlap(
  firstStart: Date,
  firstDurationMins: number,
  secondStart: Date,
  secondDurationMins: number,
) {
  const firstEnd = addMinutes(firstStart, firstDurationMins);
  const secondEnd = addMinutes(secondStart, secondDurationMins);
  return firstStart < secondEnd && secondStart < firstEnd;
}

async function findTeacherSessionConflict(
  db: DbClient,
  teacherId: string,
  startsAt: Date,
  durationMins: number,
) {
  const windowStart = subtractMinutes(startsAt, durationMins);
  const windowEnd = addMinutes(startsAt, durationMins);

  const sessions = await db.session.findMany({
    where: {
      teacherId,
      status: { not: SessionStatus.CANCELLED },
      startsAt: {
        gt: windowStart,
        lt: windowEnd,
      },
    },
    select: {
      subject: true,
      startsAt: true,
      durationMins: true,
      student: {
        select: { fullName: true },
      },
    },
  });

  const conflict = sessions.find((session) =>
    rangesOverlap(startsAt, durationMins, session.startsAt, session.durationMins),
  );

  if (!conflict) return null;

  return {
    subject: conflict.subject,
    startsAt: conflict.startsAt,
    studentName: conflict.student.fullName,
  } satisfies ConflictDetails;
}

async function findTeacherProposalConflict(
  db: DbClient,
  teacherId: string,
  startsAt: Date,
  durationMins: number,
) {
  const windowStart = subtractMinutes(startsAt, durationMins);
  const windowEnd = addMinutes(startsAt, durationMins);

  const proposals = await db.sessionProposal.findMany({
    where: {
      teacherId,
      status: ProposalStatus.PENDING,
      startsAt: {
        gt: windowStart,
        lt: windowEnd,
      },
    },
    select: {
      subject: true,
      startsAt: true,
      durationMins: true,
      student: {
        select: { fullName: true },
      },
    },
  });

  const conflict = proposals.find((proposal) =>
    rangesOverlap(
      startsAt,
      durationMins,
      proposal.startsAt,
      proposal.durationMins,
    ),
  );

  if (!conflict) return null;

  return {
    subject: conflict.subject,
    startsAt: conflict.startsAt,
    studentName: conflict.student.fullName,
  } satisfies ConflictDetails;
}

async function findStudentSessionConflict(
  db: DbClient,
  studentId: string,
  startsAt: Date,
  durationMins: number,
) {
  const windowStart = subtractMinutes(startsAt, durationMins);
  const windowEnd = addMinutes(startsAt, durationMins);

  const sessions = await db.session.findMany({
    where: {
      studentId,
      status: { not: SessionStatus.CANCELLED },
      startsAt: {
        gt: windowStart,
        lt: windowEnd,
      },
    },
    select: {
      subject: true,
      startsAt: true,
      durationMins: true,
      student: {
        select: { fullName: true },
      },
    },
  });

  const conflict = sessions.find((session) =>
    rangesOverlap(startsAt, durationMins, session.startsAt, session.durationMins),
  );

  if (!conflict) return null;

  return {
    subject: conflict.subject,
    startsAt: conflict.startsAt,
    studentName: conflict.student.fullName,
  } satisfies ConflictDetails;
}

export async function assertTeacherHasNoSchedulingConflict(
  db: DbClient,
  teacherId: string,
  startsAt: Date,
  durationMins: number,
) {
  const sessionConflict = await findTeacherSessionConflict(
    db,
    teacherId,
    startsAt,
    durationMins,
  );

  if (sessionConflict) {
    throw new AppError(
      400,
      `Teacher already has a ${sessionConflict.subject} session with ${sessionConflict.studentName} at ${sessionConflict.startsAt.toISOString()}`,
    );
  }

  const proposalConflict = await findTeacherProposalConflict(
    db,
    teacherId,
    startsAt,
    durationMins,
  );

  if (proposalConflict) {
    throw new AppError(
      400,
      `Teacher already has a pending ${proposalConflict.subject} proposal with ${proposalConflict.studentName} at ${proposalConflict.startsAt.toISOString()}`,
    );
  }
}

export async function assertStudentHasNoSchedulingConflict(
  db: DbClient,
  studentId: string,
  startsAt: Date,
  durationMins: number,
) {
  const sessionConflict = await findStudentSessionConflict(
    db,
    studentId,
    startsAt,
    durationMins,
  );

  if (sessionConflict) {
    throw new AppError(
      400,
      `${sessionConflict.studentName} already has a ${sessionConflict.subject} session at ${sessionConflict.startsAt.toISOString()}`,
    );
  }
}
