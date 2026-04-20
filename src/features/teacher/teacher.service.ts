import {
  AccountStatus,
  CancellationRequester,
  CancellationStatus,
  DayOfWeek,
  Role,
  SessionStatus,
  TimeBlock,
} from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import {
  createAdminNotifications,
  createNotification,
} from '../notifications/notification.service';
import type {
  CreateSessionNoteInput,
  CreateSessionProposalInput,
  RequestCancellationInput,
} from './teacher.schemas';

const DAY_BY_INDEX: DayOfWeek[] = [
  DayOfWeek.SUN,
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
];

const TIME_BLOCK_RANGES: Record<TimeBlock, { start: number; end: number }> = {
  [TimeBlock.MORNING]: { start: 6 * 60, end: 12 * 60 },
  [TimeBlock.AFTERNOON]: { start: 12 * 60, end: 17 * 60 },
  [TimeBlock.EVENING]: { start: 17 * 60, end: 22 * 60 },
};

function assertTeacher(role: Role) {
  if (role !== Role.TEACHER) {
    throw new AppError(403, 'Only teachers can use this route');
  }
}

async function getTeacherProfile(userId: string) {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!teacher) {
    throw new AppError(404, 'Teacher profile not found');
  }

  if (
    teacher.status !== AccountStatus.ACTIVE ||
    teacher.user.status !== AccountStatus.ACTIVE
  ) {
    throw new AppError(403, 'Teacher account is not active');
  }

  return teacher;
}

function dayForDate(date: Date) {
  return DAY_BY_INDEX[date.getUTCDay()];
}

function minutesSinceMidnight(date: Date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function isInsideBlock(date: Date, block: TimeBlock) {
  const minutes = minutesSinceMidnight(date);
  const range = TIME_BLOCK_RANGES[block];
  return minutes >= range.start && minutes < range.end;
}

export async function teacherProfile(userId: string, role: Role) {
  assertTeacher(role);
  const teacher = await getTeacherProfile(userId);
  return {
    id: teacher.id,
    userId: teacher.userId,
    name: teacher.user.name,
    email: teacher.user.email,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    subjects: teacher.subjects,
    qualifications: teacher.qualifications,
    hourlyRate: teacher.hourlyRate,
    status: teacher.status,
  };
}

export async function teacherPayouts(userId: string, role: Role) {
  assertTeacher(role);
  const teacher = await getTeacherProfile(userId);

  return prisma.teacherPayout.findMany({
    where: { teacherId: teacher.id },
    orderBy: { month: 'desc' },
  });
}

export async function teacherStudents(userId: string, role: Role) {
  assertTeacher(role);
  const teacher = await getTeacherProfile(userId);
  return prisma.student.findMany({
    where: {
      assignedTeacherId: teacher.id,
    },
    include: {
      parent: {
        include: { user: true },
      },
      intake: {
        include: {
          schedule: {
            orderBy: { day: 'asc' },
          },
        },
      },
      goals: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function teacherSessions(userId: string, role: Role) {
  assertTeacher(role);
  const teacher = await getTeacherProfile(userId);
  return prisma.session.findMany({
    where: {
      teacherId: teacher.id,
    },
    include: {
      student: true,
      attendance: true,
      note: true,
      cancellations: true,
    },
    orderBy: { startsAt: 'desc' },
  });
}

async function getOwnedSession(userId: string, sessionId: string) {
  const teacher = await getTeacherProfile(userId);
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      teacherId: teacher.id,
    },
    include: {
      student: {
        include: {
          parent: {
            include: { user: true },
          },
        },
      },
      attendance: true,
      note: true,
      cancellations: true,
    },
  });

  if (!session) {
    throw new AppError(404, 'Session not found for this teacher');
  }

  return { teacher, session };
}

export async function confirmTeacherAttendance(
  userId: string,
  role: Role,
  sessionId: string,
) {
  assertTeacher(role);
  const { teacher, session } = await getOwnedSession(userId, sessionId);

  if (session.status === SessionStatus.CANCELLED) {
    throw new AppError(400, 'Cannot confirm attendance for a cancelled session');
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        teacherConfirmedAt: now,
      },
      update: {
        teacherConfirmedAt: now,
      },
    });

    const shouldComplete = !!attendance.familyConfirmedAt;
    const wasCompleted = session.status === SessionStatus.COMPLETED;

    const updatedSession = await tx.session.update({
      where: { id: session.id },
      data: shouldComplete ? { status: SessionStatus.COMPLETED } : {},
      include: {
        student: true,
        attendance: true,
        note: true,
        cancellations: true,
      },
    });

    if (shouldComplete && !wasCompleted) {
      await tx.teacherProfile.update({
        where: { id: teacher.id },
        data: {
          totalSessions: { increment: 1 },
        },
      });
    }

    if (shouldComplete) {
      await createAdminNotifications(
        {
          title: 'Class attendance verified',
          body: `${session.subject} with ${session.student.fullName} was confirmed by both family and teacher.`,
          studentId: session.studentId,
          teacherId: teacher.id,
        },
        tx,
      );
    }

    return { session: updatedSession, attendance };
  });
}

export async function submitSessionNote(
  userId: string,
  role: Role,
  sessionId: string,
  input: CreateSessionNoteInput,
) {
  assertTeacher(role);
  const { teacher, session } = await getOwnedSession(userId, sessionId);

  if (session.status === SessionStatus.CANCELLED) {
    throw new AppError(400, 'Cannot add notes to a cancelled session');
  }

  const note = await prisma.$transaction(async (tx) => {
    const updatedNote = await tx.sessionNote.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        teacherId: teacher.id,
        covered: input.covered.trim(),
        performance: input.performance,
        rating: input.rating,
        focusNext: input.focusNext.trim(),
        concerns: input.concerns?.trim() || null,
      },
      update: {
        covered: input.covered.trim(),
        performance: input.performance,
        rating: input.rating,
        focusNext: input.focusNext.trim(),
        concerns: input.concerns?.trim() || null,
      },
    });

    await createNotification(
      {
        userId: session.student.parent.userId,
        role: Role.PARENT,
        title: 'New session note',
        body: `${teacher.user.name} added feedback for ${session.student.fullName}'s ${session.subject} class.`,
        studentId: session.studentId,
        teacherId: teacher.id,
      },
      tx,
    );

    return updatedNote;
  });

  return { note };
}

export async function requestTeacherSessionCancellation(
  userId: string,
  role: Role,
  sessionId: string,
  input: RequestCancellationInput,
) {
  assertTeacher(role);
  const { teacher, session } = await getOwnedSession(userId, sessionId);

  if (session.status !== SessionStatus.UPCOMING) {
    throw new AppError(400, 'Only upcoming sessions can be cancelled');
  }

  const existingPending = session.cancellations.find(
    (request) => request.status === CancellationStatus.PENDING,
  );

  if (existingPending) {
    throw new AppError(400, 'This session already has a pending cancellation request');
  }

  const cancellation = await prisma.$transaction(async (tx) => {
    const request = await tx.cancellationRequest.create({
      data: {
        sessionId: session.id,
        requestedBy: CancellationRequester.TEACHER,
        reason: input.reason.trim(),
      },
    });

    await createAdminNotifications(
      {
        title: 'Cancellation requested',
        body: `${teacher.user.name} requested to cancel ${session.subject} with ${session.student.fullName}. Reason: ${input.reason.trim()}`,
        studentId: session.studentId,
        teacherId: teacher.id,
      },
      tx,
    );

    await createNotification(
      {
        userId: session.student.parent.userId,
        role: Role.PARENT,
        title: 'Cancellation requested',
        body: `${teacher.user.name} requested to cancel ${session.subject} with ${session.student.fullName}.`,
        studentId: session.studentId,
        teacherId: teacher.id,
      },
      tx,
    );

    return request;
  });

  return { cancellation };
}

export async function createSessionProposal(
  userId: string,
  role: Role,
  input: CreateSessionProposalInput,
) {
  assertTeacher(role);
  const teacher = await getTeacherProfile(userId);
  const student = await prisma.student.findFirst({
    where: {
      id: input.studentId,
      assignedTeacherId: teacher.id,
    },
    include: {
      intake: {
        include: {
          schedule: true,
        },
      },
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found for this teacher');
  }

  if (student.status !== AccountStatus.ACTIVE) {
    throw new AppError(400, 'Cannot propose sessions for an inactive student');
  }

  if (!student.intake || student.intake.schedule.length === 0) {
    throw new AppError(400, 'Student has no saved availability');
  }

  const proposedDay = dayForDate(input.startsAt);
  const matchingSchedule = student.intake.schedule.find(
    (entry) => entry.day === proposedDay,
  );

  if (!matchingSchedule) {
    throw new AppError(400, 'Proposed date is outside student availability');
  }

  if (matchingSchedule.time !== input.timeBlock) {
    throw new AppError(400, 'Proposed session block does not match availability');
  }

  if (!isInsideBlock(input.startsAt, input.timeBlock)) {
    throw new AppError(400, 'Proposed time is outside the selected session block');
  }

  return prisma.$transaction(async (tx) => {
    const proposal = await tx.sessionProposal.create({
      data: {
        studentId: student.id,
        teacherId: teacher.id,
        subject: input.subject.trim(),
        startsAt: input.startsAt,
        durationMins: input.durationMins,
        timeBlock: input.timeBlock,
        note: input.note?.trim() || null,
      },
      include: {
        student: true,
        teacher: {
          include: { user: true },
        },
      },
    });

    const parent = await tx.parentProfile.findUnique({
      where: { id: student.parentId },
    });

    if (parent) {
      await createNotification(
        {
          userId: parent.userId,
          role: Role.PARENT,
          title: 'New session proposal',
          body: `${teacher.user.name} proposed a ${proposal.subject} session for ${student.fullName}.`,
          studentId: student.id,
          teacherId: teacher.id,
        },
        tx,
      );
    }

    return proposal;
  });
}
