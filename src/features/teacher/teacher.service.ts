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
  ReportContactAttemptInput,
  RequestCancellationInput,
  UpdatePayoutAccountInput,
  UpdateTeacherProfileInput,
} from './teacher.schemas';
import { containsPhoneNumber, phoneNumberMessage } from './teacher.schemas';

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

function noteFieldsWithPhoneNumber(input: CreateSessionNoteInput) {
  return [
    ['what was covered', input.covered] as const,
    ['focus next time', input.focusNext] as const,
    ['concerns', input.concerns] as const,
  ]
    .filter(([, value]) => containsPhoneNumber(value))
    .map(([field, value]) => ({ field, value: value?.trim() }));
}

const NOTE_FIELD_LABELS: Record<ReportContactAttemptInput['field'], string> = {
  covered: 'what was covered',
  focusNext: 'focus next time',
  concerns: 'concerns',
};

type TeacherWithUser = Awaited<ReturnType<typeof getTeacherProfile>>;

function serializeTeacher(teacher: TeacherWithUser) {
  return {
    id: teacher.id,
    userId: teacher.userId,
    name: teacher.user.name,
    email: teacher.user.email,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    phoneCountry: teacher.phoneCountry,
    phoneNumber: teacher.phoneNumber,
    gender: teacher.gender,
    bio: teacher.bio,
    subjects: teacher.subjects,
    qualifications: teacher.qualifications,
    bankName: teacher.bankName,
    accountName: teacher.accountName,
    accountNumber: teacher.accountNumber,
    hourlyRate: teacher.hourlyRate,
    status: teacher.status,
  };
}

export async function teacherProfile(userId: string, role: Role) {
  assertTeacher(role);
  const teacher = await getTeacherProfile(userId);
  return serializeTeacher(teacher);
}

export async function updateTeacherPayoutAccount(
  userId: string,
  role: Role,
  input: UpdatePayoutAccountInput,
) {
  assertTeacher(role);
  const teacher = await getTeacherProfile(userId);

  const updated = await prisma.teacherProfile.update({
    where: { id: teacher.id },
    data: {
      bankName: input.bankName.trim(),
      accountName: input.accountName.trim(),
      accountNumber: input.accountNumber.trim(),
    },
    include: { user: true },
  });

  return serializeTeacher(updated);
}

function trimOrNull(value: string | undefined | null) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function updateTeacherProfile(
  userId: string,
  role: Role,
  input: UpdateTeacherProfileInput,
) {
  assertTeacher(role);
  const teacher = await getTeacherProfile(userId);

  const teacherData: Record<string, unknown> = {};
  if (input.firstName !== undefined)
    teacherData.firstName = input.firstName.trim();
  if (input.lastName !== undefined)
    teacherData.lastName = input.lastName.trim();
  if (input.bio !== undefined) teacherData.bio = trimOrNull(input.bio);
  if (input.phoneCountry !== undefined)
    teacherData.phoneCountry = trimOrNull(input.phoneCountry);
  if (input.phoneNumber !== undefined)
    teacherData.phoneNumber = trimOrNull(input.phoneNumber);
  if (input.gender !== undefined) teacherData.gender = input.gender ?? null;
  if (input.subjects !== undefined)
    teacherData.subjects = input.subjects.map((subject) => subject.trim());
  if (input.qualifications !== undefined)
    teacherData.qualifications = input.qualifications.map((item) =>
      item.trim(),
    );

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTeacher = await tx.teacherProfile.update({
      where: { id: teacher.id },
      data: teacherData,
      include: { user: true },
    });

    if (input.firstName !== undefined || input.lastName !== undefined) {
      const name = `${updatedTeacher.firstName} ${updatedTeacher.lastName}`.trim();
      if (name && name !== updatedTeacher.user.name) {
        const userWithName = await tx.user.update({
          where: { id: updatedTeacher.userId },
          data: { name },
        });
        updatedTeacher.user = userWithName;
      }
    }

    return updatedTeacher;
  });

  return serializeTeacher(updated);
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
      OR: [
        { assignedTeacherId: teacher.id },
        {
          subjectAssignments: {
            some: { teacherId: teacher.id },
          },
        },
      ],
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
      subjectAssignments: {
        where: { teacherId: teacher.id },
        include: {
          teacher: {
            include: { user: true },
          },
        },
      },
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

      if (session.lessonPackageId) {
        await tx.studentLessonPackage.update({
          where: { id: session.lessonPackageId },
          data: {
            hoursCompleted: { increment: 1 },
          },
        });
      }
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

  const flaggedFields = noteFieldsWithPhoneNumber(input);
  if (flaggedFields.length > 0) {
    await createAdminNotifications({
      title: 'Teacher attempted off-platform contact',
      body: `${teacher.user.name} tried to submit a phone number in feedback for ${session.student.fullName}'s ${session.subject} class. ${flaggedFields
        .map((item) => `${item.field}: "${item.value}"`)
        .join('; ')}.`,
      studentId: session.studentId,
      teacherId: teacher.id,
    });
    throw new AppError(400, phoneNumberMessage);
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

export async function reportTeacherContactAttempt(
  userId: string,
  role: Role,
  sessionId: string,
  input: ReportContactAttemptInput,
) {
  assertTeacher(role);
  const { teacher, session } = await getOwnedSession(userId, sessionId);

  await createAdminNotifications({
    title: 'Teacher attempted off-platform contact',
    body: `${teacher.user.name} typed a phone number in feedback for ${session.student.fullName}'s ${session.subject} class. Field: ${NOTE_FIELD_LABELS[input.field]}. Value: "${input.value?.trim() || 'not captured'}". The teacher was told this has been reported to admin.`,
    studentId: session.studentId,
    teacherId: teacher.id,
  });

  return { reported: true };
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
        title: 'Teacher requested reschedule',
        body: `${teacher.user.name} needs admin help with ${session.subject} for ${session.student.fullName}. Reason: ${input.reason.trim()}`,
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
      OR: [
        { assignedTeacherId: teacher.id },
        {
          subjectAssignments: {
            some: {
              teacherId: teacher.id,
            },
          },
        },
      ],
    },
    include: {
      intake: {
        include: {
          schedule: true,
        },
      },
      subjectAssignments: true,
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found for this teacher');
  }

  const isAssignedForSubject = student.subjectAssignments.some(
    (assignment) =>
      assignment.teacherId === teacher.id &&
      assignment.subject.toLowerCase() === input.subject.trim().toLowerCase(),
  );

  if (!isAssignedForSubject && student.assignedTeacherId !== teacher.id) {
    throw new AppError(403, 'You are not assigned to this subject');
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
