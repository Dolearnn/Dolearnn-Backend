import {
  AccountStatus,
  BookingRequestStatus,
  CancellationRequester,
  CancellationStatus,
  LessonPackageStatus,
  DayOfWeek,
  ProposalStatus,
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
  CreateStudentInput,
  CreateBookingRequestInput,
  DeactivateStudentInput,
  DeclineSessionProposalInput,
  RequestCancellationInput,
  SaveGoalInput,
  SaveIntakeInput,
  UpdateStudentInput,
} from './family.schemas';

function assertParent(role: Role) {
  if (role !== Role.PARENT) {
    throw new AppError(403, 'Only family accounts can use this route');
  }
}

async function getParentProfile(userId: string) {
  const parent = await prisma.parentProfile.findUnique({
    where: { userId },
    include: {
      user: true,
    },
  });

  if (!parent) {
    throw new AppError(404, 'Parent profile not found');
  }

  return parent;
}

async function getOwnedStudent(userId: string, studentId: string) {
  const parent = await getParentProfile(userId);
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      parentId: parent.id,
    },
    include: studentInclude,
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  return student;
}

const studentInclude = {
  intake: {
    include: {
      schedule: {
        orderBy: { day: 'asc' as const },
      },
    },
  },
  goals: true,
  assignedTeacher: {
    include: {
      user: true,
    },
  },
  subjectAssignments: {
    include: {
      teacher: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

const sessionInclude = {
  student: true,
  teacher: {
    include: { user: true },
  },
  attendance: true,
  note: true,
  cancellations: {
    orderBy: { requestedAt: 'desc' as const },
  },
};

const dayLabel: Record<DayOfWeek, string> = {
  [DayOfWeek.MON]: 'Monday',
  [DayOfWeek.TUE]: 'Tuesday',
  [DayOfWeek.WED]: 'Wednesday',
  [DayOfWeek.THU]: 'Thursday',
  [DayOfWeek.FRI]: 'Friday',
  [DayOfWeek.SAT]: 'Saturday',
  [DayOfWeek.SUN]: 'Sunday',
};

const timeLabel: Record<TimeBlock, string> = {
  [TimeBlock.MORNING]: 'Morning',
  [TimeBlock.AFTERNOON]: 'Afternoon',
  [TimeBlock.EVENING]: 'Evening',
};

const timeBlockRanges: Record<TimeBlock, { start: number; end: number }> = {
  [TimeBlock.MORNING]: { start: 6 * 60, end: 12 * 60 },
  [TimeBlock.AFTERNOON]: { start: 12 * 60, end: 17 * 60 },
  [TimeBlock.EVENING]: { start: 17 * 60, end: 22 * 60 },
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const dayIndex: Record<DayOfWeek, number> = {
  [DayOfWeek.SUN]: 0,
  [DayOfWeek.MON]: 1,
  [DayOfWeek.TUE]: 2,
  [DayOfWeek.WED]: 3,
  [DayOfWeek.THU]: 4,
  [DayOfWeek.FRI]: 5,
  [DayOfWeek.SAT]: 6,
};

function exactTimeIsInsideBlock(time: string, block: TimeBlock) {
  const minutes = timeToMinutes(time);
  const range = timeBlockRanges[block];
  return minutes >= range.start && minutes < range.end;
}

export async function familyProfile(userId: string, role: Role) {
  assertParent(role);
  const parent = await getParentProfile(userId);
  return {
    id: parent.id,
    userId: parent.userId,
    name: parent.user.name,
    email: parent.user.email,
    whatsapp: parent.whatsapp,
    createdAt: parent.createdAt,
  };
}

export async function listFamilyPayments(userId: string, role: Role) {
  assertParent(role);
  const parent = await getParentProfile(userId);

  return prisma.payment.findMany({
    where: { parentId: parent.id },
    orderBy: { createdAt: 'desc' },
  });
}

export async function familySessionCreditSummary(userId: string, role: Role) {
  assertParent(role);
  const parent = await getParentProfile(userId);
  const [packages, pendingRequests] = await Promise.all([
    prisma.studentLessonPackage.findMany({ where: { parentId: parent.id } }),
    prisma.sessionBookingRequest.findMany({
      where: {
        parentId: parent.id,
        status: BookingRequestStatus.PENDING,
      },
    }),
  ]);

  const paidSessions = packages.reduce(
    (sum, lessonPackage) => sum + lessonPackage.hoursPurchased,
    0,
  );
  const usedSessions = packages.reduce(
    (sum, lessonPackage) => sum + lessonPackage.hoursScheduled,
    0,
  );
  const pendingSessions = pendingRequests.reduce(
    (sum, request) => sum + request.sessionsRequested,
    0,
  );

  return {
    paidSessions,
    usedSessions,
    pendingSessions,
    availableSessions: Math.max(0, paidSessions - usedSessions - pendingSessions),
    packages: packages.map((lessonPackage) => ({
      id: lessonPackage.id,
      childId: lessonPackage.studentId,
      subject: lessonPackage.subject,
      paidSessions: lessonPackage.hoursPurchased,
      usedSessions: lessonPackage.hoursScheduled,
      completedSessions: lessonPackage.hoursCompleted,
      availableSessions: Math.max(
        0,
        lessonPackage.hoursPurchased - lessonPackage.hoursScheduled,
      ),
      status: lessonPackage.status,
    })),
  };
}

export async function listBookingRequests(userId: string, role: Role) {
  assertParent(role);
  const parent = await getParentProfile(userId);
  return prisma.sessionBookingRequest.findMany({
    where: { parentId: parent.id },
    include: {
      student: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listStudents(userId: string, role: Role) {
  assertParent(role);
  const parent = await getParentProfile(userId);
  return prisma.student.findMany({
    where: { parentId: parent.id },
    include: studentInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createStudent(
  userId: string,
  role: Role,
  input: CreateStudentInput,
) {
  assertParent(role);
  const parent = await getParentProfile(userId);

  return prisma.student.create({
    data: {
      parentId: parent.id,
      fullName: input.fullName.trim(),
      age: input.age,
      grade: input.grade,
      gradeOther: input.gradeOther?.trim() || null,
      school: input.school?.trim() || null,
    },
    include: studentInclude,
  });
}

export async function updateStudent(
  userId: string,
  role: Role,
  studentId: string,
  input: UpdateStudentInput,
) {
  assertParent(role);
  await getOwnedStudent(userId, studentId);

  return prisma.student.update({
    where: { id: studentId },
    data: {
      fullName: input.fullName.trim(),
      age: input.age,
      grade: input.grade,
      gradeOther: input.grade === 'OTHER' ? input.gradeOther?.trim() || null : null,
      school: input.school?.trim() || null,
    },
    include: studentInclude,
  });
}

export async function saveStudentIntake(
  userId: string,
  role: Role,
  studentId: string,
  input: SaveIntakeInput,
) {
  assertParent(role);
  await getOwnedStudent(userId, studentId);

  return prisma.intake.upsert({
    where: { studentId },
    create: {
      studentId,
      subject: input.subject.trim(),
      subjects: input.subjects.map((subject) => subject.trim()),
      subjectOther: input.subjectOther?.trim() || null,
      learningGoal: input.learningGoal,
      currentLevel: input.currentLevel,
      specificTopics: input.specificTopics?.trim() || null,
      teacherGenderPref: input.teacherGenderPref,
      specialNotes: input.specialNotes?.trim() || null,
      timezone: input.timezone,
      sessionsPerWeek: input.sessionsPerWeek,
      budget: input.budget,
      schedule: {
        create: input.schedule,
      },
    },
    update: {
      subject: input.subject.trim(),
      subjects: input.subjects.map((subject) => subject.trim()),
      subjectOther: input.subjectOther?.trim() || null,
      learningGoal: input.learningGoal,
      currentLevel: input.currentLevel,
      specificTopics: input.specificTopics?.trim() || null,
      teacherGenderPref: input.teacherGenderPref,
      specialNotes: input.specialNotes?.trim() || null,
      timezone: input.timezone,
      sessionsPerWeek: input.sessionsPerWeek,
      budget: input.budget,
      schedule: {
        deleteMany: {},
        create: input.schedule,
      },
    },
    include: {
      schedule: {
        orderBy: { day: 'asc' },
      },
    },
  });
}

export async function saveStudentGoal(
  userId: string,
  role: Role,
  studentId: string,
  input: SaveGoalInput,
) {
  assertParent(role);
  await getOwnedStudent(userId, studentId);

  const existingGoal = await prisma.goal.findFirst({
    where: { studentId },
    orderBy: { createdAt: 'asc' },
  });
  const targetDate = input.targetDate ? new Date(input.targetDate) : null;

  if (existingGoal) {
    return prisma.goal.update({
      where: { id: existingGoal.id },
      data: {
        title: input.title.trim(),
        targetDate,
        progress: input.progress ?? existingGoal.progress,
      },
    });
  }

  return prisma.goal.create({
    data: {
      studentId,
      title: input.title.trim(),
      targetDate,
      progress: input.progress ?? 0,
    },
  });
}

export async function deactivateStudent(
  userId: string,
  role: Role,
  studentId: string,
  input: DeactivateStudentInput,
) {
  assertParent(role);
  const student = await getOwnedStudent(userId, studentId);

  return prisma.$transaction(async (tx) => {
    const updatedStudent = await tx.student.update({
      where: { id: studentId },
      data: {
        status: AccountStatus.DEACTIVATED,
        deactivationReason: input.reason.trim(),
        deactivatedAt: new Date(),
      },
      include: studentInclude,
    });

    await createAdminNotifications(
      {
        title: 'Student paused',
        body: `${student.fullName}'s lessons were paused by the family. Reason: ${input.reason.trim()}`,
        studentId: student.id,
        teacherId: student.assignedTeacherId,
      },
      tx,
    );

    if (student.assignedTeacher) {
      await createNotification(
        {
          userId: student.assignedTeacher.userId,
          role: Role.TEACHER,
          title: 'Student paused lessons',
          body: `${student.fullName}'s family paused lessons for now.`,
          studentId: student.id,
          teacherId: student.assignedTeacher.id,
        },
        tx,
      );
    }

    return updatedStudent;
  });
}

export async function reactivateStudent(
  userId: string,
  role: Role,
  studentId: string,
) {
  assertParent(role);
  const student = await getOwnedStudent(userId, studentId);

  return prisma.$transaction(async (tx) => {
    const updatedStudent = await tx.student.update({
      where: { id: studentId },
      data: {
        status: AccountStatus.ACTIVE,
        deactivationReason: null,
        deactivatedAt: null,
      },
      include: studentInclude,
    });

    await createAdminNotifications(
      {
        title: 'Student reactivated',
        body: `${student.fullName}'s family reactivated lessons.`,
        studentId: student.id,
        teacherId: student.assignedTeacherId,
      },
      tx,
    );

    if (student.assignedTeacher) {
      await createNotification(
        {
          userId: student.assignedTeacher.userId,
          role: Role.TEACHER,
          title: 'Student reactivated',
          body: `${student.fullName}'s lessons are active again.`,
          studentId: student.id,
          teacherId: student.assignedTeacher.id,
        },
        tx,
      );
    }

    return updatedStudent;
  });
}

export async function listSessionProposals(userId: string, role: Role) {
  assertParent(role);
  const parent = await getParentProfile(userId);

  return prisma.sessionProposal.findMany({
    where: {
      student: {
        parentId: parent.id,
      },
    },
    include: {
      student: true,
      teacher: {
        include: { user: true },
      },
      session: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listFamilySessions(userId: string, role: Role) {
  assertParent(role);
  const parent = await getParentProfile(userId);

  return prisma.session.findMany({
    where: {
      student: {
        parentId: parent.id,
      },
    },
    include: sessionInclude,
    orderBy: { startsAt: 'desc' },
  });
}

export async function createBookingRequest(
  userId: string,
  role: Role,
  input: CreateBookingRequestInput,
) {
  assertParent(role);
  const student = await getOwnedStudent(userId, input.studentId);
  const parent = await getParentProfile(userId);
  const subject = input.subject.trim();
  const [packages, pendingRequests] = await Promise.all([
    prisma.studentLessonPackage.findMany({
      where: {
        parentId: parent.id,
        studentId: student.id,
        subject,
        status: LessonPackageStatus.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.sessionBookingRequest.findMany({
      where: {
        parentId: parent.id,
        studentId: student.id,
        subject,
        status: BookingRequestStatus.PENDING,
      },
    }),
  ]);
  const availableSessions =
    packages.reduce(
      (sum, lessonPackage) =>
        sum + (lessonPackage.hoursPurchased - lessonPackage.hoursScheduled),
      0,
    ) -
    pendingRequests.reduce(
      (sum, request) => sum + request.sessionsRequested,
      0,
    );

  if (input.sessionsRequested > availableSessions) {
    throw new AppError(
      400,
      'Requested sessions exceed available paid hours for this student and subject',
    );
  }

  const subjectAssigned = student.subjectAssignments.some(
    (assignment) =>
      assignment.subject.toLowerCase() === input.subject.trim().toLowerCase(),
  );

  if (!subjectAssigned) {
    throw new AppError(400, 'This subject has not been matched with a teacher yet');
  }

  const savedAvailability = student.intake?.schedule.find(
    (entry) => entry.day === input.day && entry.time === input.timeBlock,
  );

  if (!savedAvailability) {
    throw new AppError(400, 'Selected calendar slot must match saved availability');
  }

  if (!exactTimeIsInsideBlock(input.startTime, input.timeBlock)) {
    throw new AppError(400, 'Start time must be inside the selected session block');
  }

  const startDate = input.startDate;
  if (startDate.getUTCDay() !== dayIndex[input.day]) {
    throw new AppError(400, 'Start date must match the selected day');
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.sessionBookingRequest.create({
      data: {
        parentId: student.parentId,
        studentId: student.id,
        subject,
        day: input.day,
        timeBlock: input.timeBlock,
        startTime: input.startTime,
        startDate,
        sessionsRequested: input.sessionsRequested,
      },
      include: {
        student: true,
      },
    });

    await createAdminNotifications(
      {
        title: 'Calendar sessions requested',
        body: `${student.fullName}'s family requested ${input.sessionsRequested} weekly ${input.subject.trim()} session(s).`,
        studentId: student.id,
      },
      tx,
    );

    return request;
  });
}

async function getOwnedSession(userId: string, sessionId: string) {
  const parent = await getParentProfile(userId);
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      student: {
        parentId: parent.id,
      },
    },
    include: sessionInclude,
  });

  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  return session;
}

export async function confirmFamilyAttendance(
  userId: string,
  role: Role,
  sessionId: string,
) {
  assertParent(role);
  const session = await getOwnedSession(userId, sessionId);

  if (session.status === SessionStatus.CANCELLED) {
    throw new AppError(400, 'Cannot confirm attendance for a cancelled session');
  }

  const now = new Date();
  const wasCompleted = session.status === SessionStatus.COMPLETED;

  return prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        familyConfirmedAt: now,
      },
      update: {
        familyConfirmedAt: now,
      },
    });

    const shouldComplete = !!attendance.teacherConfirmedAt;
    const updatedSession = await tx.session.update({
      where: { id: session.id },
      data: shouldComplete ? { status: SessionStatus.COMPLETED } : {},
      include: sessionInclude,
    });

    if (shouldComplete && !wasCompleted && session.lessonPackageId) {
      await tx.studentLessonPackage.update({
        where: { id: session.lessonPackageId },
        data: {
          hoursCompleted: { increment: 1 },
        },
      });
    }

    return { session: updatedSession, attendance };
  });
}

export async function requestFamilySessionCancellation(
  userId: string,
  role: Role,
  sessionId: string,
  input: RequestCancellationInput,
) {
  assertParent(role);
  const session = await getOwnedSession(userId, sessionId);

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
        requestedBy: CancellationRequester.FAMILY,
        reason: input.reason.trim(),
      },
    });

    await createAdminNotifications(
      {
        title: 'Cancellation requested',
        body: `${session.student.fullName}'s family requested to cancel ${session.subject}. Reason: ${input.reason.trim()}`,
        studentId: session.studentId,
        teacherId: session.teacherId,
      },
      tx,
    );

    await createNotification(
      {
        userId: session.teacher.userId,
        role: Role.TEACHER,
        title: 'Cancellation requested',
        body: `${session.student.fullName}'s family requested to cancel ${session.subject}.`,
        studentId: session.studentId,
        teacherId: session.teacherId,
      },
      tx,
    );

    return request;
  });

  return { cancellation };
}

async function getOwnedProposal(userId: string, proposalId: string) {
  const parent = await getParentProfile(userId);
  const proposal = await prisma.sessionProposal.findFirst({
    where: {
      id: proposalId,
      student: {
        parentId: parent.id,
      },
    },
    include: {
      student: true,
      teacher: {
        include: { user: true },
      },
      session: true,
    },
  });

  if (!proposal) {
    throw new AppError(404, 'Session proposal not found');
  }

  return proposal;
}

async function assertPreferredAlternativeIsSavedAvailability(
  studentId: string,
  preferredAlternative?: DeclineSessionProposalInput['preferredAlternative'],
) {
  if (!preferredAlternative) return;

  const saved = await prisma.intakeSchedule.findFirst({
    where: {
      day: preferredAlternative.day,
      time: preferredAlternative.time,
      intake: {
        studentId,
      },
    },
  });

  if (!saved) {
    throw new AppError(
      400,
      'Preferred alternative must be inside the saved student availability',
    );
  }
}

export async function acceptSessionProposal(
  userId: string,
  role: Role,
  proposalId: string,
) {
  assertParent(role);
  const proposal = await getOwnedProposal(userId, proposalId);

  if (proposal.status !== ProposalStatus.PENDING) {
    throw new AppError(400, 'This proposal has already been resolved');
  }

  if (proposal.student.status !== AccountStatus.ACTIVE) {
    throw new AppError(400, 'Cannot accept proposals for an inactive student');
  }

  return prisma.$transaction(async (tx) => {
    const updatedProposal = await tx.sessionProposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.ACCEPTED,
        resolvedAt: new Date(),
      },
    });

    const session = await tx.session.create({
      data: {
        proposalId: proposal.id,
        studentId: proposal.studentId,
        teacherId: proposal.teacherId,
        subject: proposal.subject,
        startsAt: proposal.startsAt,
        durationMins: proposal.durationMins,
      },
    });

    await createAdminNotifications(
      {
        title: 'Meeting link needed',
        body: `${proposal.student.fullName}'s ${proposal.subject} session was accepted. Add the class meeting link for ${proposal.teacher.user.name}.`,
        studentId: proposal.studentId,
        teacherId: proposal.teacherId,
      },
      tx,
    );

    await createNotification(
      {
        userId: proposal.teacher.userId,
        role: Role.TEACHER,
        title: 'Session proposal accepted',
        body: `${proposal.student.fullName}'s family accepted your ${proposal.subject} session proposal.`,
        studentId: proposal.studentId,
        teacherId: proposal.teacherId,
      },
      tx,
    );

    return {
      proposal: updatedProposal,
      session,
    };
  });
}

export async function declineSessionProposal(
  userId: string,
  role: Role,
  proposalId: string,
  input: DeclineSessionProposalInput,
) {
  assertParent(role);
  const proposal = await getOwnedProposal(userId, proposalId);

  if (proposal.status !== ProposalStatus.PENDING) {
    throw new AppError(400, 'This proposal has already been resolved');
  }

  await assertPreferredAlternativeIsSavedAvailability(
    proposal.studentId,
    input.preferredAlternative,
  );

  if (
    input.preferredAlternativeExactTime &&
    input.preferredAlternative &&
    !exactTimeIsInsideBlock(
      input.preferredAlternativeExactTime,
      input.preferredAlternative.time,
    )
  ) {
    throw new AppError(
      400,
      'Preferred exact time must be inside the selected session block',
    );
  }

  return prisma.$transaction(async (tx) => {
    const alternativeText = input.preferredAlternative
      ? ` Preferred alternative: ${dayLabel[input.preferredAlternative.day]} ${timeLabel[input.preferredAlternative.time]}${
          input.preferredAlternativeExactTime
            ? ` around ${input.preferredAlternativeExactTime}`
            : ''
        }.`
      : '';
    const updatedProposal = await tx.sessionProposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.DECLINED,
        declineReason: input.reason.trim(),
        preferredAlternativeDay: input.preferredAlternative?.day,
        preferredAlternativeTime: input.preferredAlternative?.time,
        preferredAlternativeExactTime:
          input.preferredAlternativeExactTime ?? null,
        resolvedAt: new Date(),
      },
      include: {
        student: true,
        teacher: {
          include: { user: true },
        },
      },
    });

    await createNotification(
      {
        userId: proposal.teacher.userId,
        role: Role.TEACHER,
        title: 'Session proposal declined',
        body: `${proposal.student.fullName}'s family declined your ${proposal.subject} session proposal. Reason: ${input.reason.trim()}.${alternativeText}`,
        studentId: proposal.studentId,
        teacherId: proposal.teacherId,
      },
      tx,
    );

    await createAdminNotifications(
      {
        title: 'Session proposal declined',
        body: `${proposal.student.fullName}'s family declined ${proposal.subject} with ${proposal.teacher.user.name}. Reason: ${input.reason.trim()}.${alternativeText}`,
        studentId: proposal.studentId,
        teacherId: proposal.teacherId,
      },
      tx,
    );

    return updatedProposal;
  });
}
