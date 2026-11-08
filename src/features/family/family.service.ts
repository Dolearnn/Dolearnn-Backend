import {
  AuditAction,
  AuditEntityType,
  AccountStatus,
  BookingRequestStatus,
  CancellationRequester,
  CancellationStatus,
  LessonPackageStatus,
  DayOfWeek,
  GradeLevel,
  Prisma,
  ProposalStatus,
  Role,
  SessionStatus,
  TimeBlock,
} from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import {
  assertStudentHasNoSchedulingConflict,
  assertTeacherHasNoSchedulingConflict,
} from '../../lib/session-conflicts';
import { createAuditLog, type AuditActor } from '../audit/audit.service';
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

/*
 * One account per learner.
 *
 * Tutoring, sessions and payments are stored against a "Student" row owned by a
 * ParentProfile (the paying account). A learner account owns exactly one of
 * each, created on first use from the learner's own name and stage, so the
 * learner never sees or manages "child profiles". Older PARENT accounts keep
 * working through the same code path.
 */
function assertParent(role: Role) {
  if (role !== Role.STUDENT && role !== Role.PARENT) {
    throw new AppError(403, 'Only learner accounts can use this route');
  }
}

function assertCanManageProfiles(role: Role) {
  if (role === Role.STUDENT) {
    throw new AppError(403, 'Your account is your learner profile; there are no extra profiles to manage');
  }
}

const gradeForStage: Record<string, GradeLevel> = {
  SS2: GradeLevel.SS2,
  SS3: GradeLevel.SS3,
  RECENT_SCHOOL_LEAVER: GradeLevel.SCHOOL_LEAVER,
};

export function gradeFromLearnerStage(stage: string | null | undefined) {
  return (stage && gradeForStage[stage]) || GradeLevel.OTHER;
}

/** Creates (once) the paying account and the single tutoring profile of a learner. */
async function ensureLearnerAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { learnerProfile: true },
  });
  if (!user || user.role !== Role.STUDENT) return null;

  return prisma.$transaction(async (tx) => {
    const parent = await tx.parentProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { user: true },
    });
    const existing = await tx.student.count({ where: { parentId: parent.id } });
    if (existing === 0) {
      const grade = gradeFromLearnerStage(user.learnerProfile?.stage);
      await tx.student.create({
        data: {
          parentId: parent.id,
          fullName: user.name,
          age: null,
          grade,
          gradeOther: grade === GradeLevel.OTHER ? 'Not set yet' : null,
        },
      });
    }
    return parent;
  });
}

async function getParentProfile(userId: string) {
  const parent =
    (await prisma.parentProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    })) ?? (await ensureLearnerAccount(userId));

  if (!parent) {
    throw new AppError(404, 'Account profile not found');
  }

  // A learner whose account predates the automatic tutoring profile.
  if (parent.user.role === Role.STUDENT) {
    const hasProfile = await prisma.student.count({ where: { parentId: parent.id } });
    if (hasProfile === 0) await ensureLearnerAccount(userId);
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
  student: {
    include: {
      intake: true,
    },
  },
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
      student: {
        include: {
          intake: true,
          subjectAssignments: {
            include: {
              teacher: true,
            },
          },
        },
      },
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
  assertCanManageProfiles(role);
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
  const student = await getOwnedStudent(userId, studentId);
  const isUpdate = Boolean(student.intake);

  const intake = await prisma.intake.upsert({
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

  // Tell the admin team (in-app and by email) so they can match a tutor.
  // A failed alert must never fail the learner's request.
  await notifyAdminsOfTutorRequest(userId, student.fullName, intake, isUpdate).catch((error) => {
    console.error('Could not send the tutor request alert:', (error as Error).message);
  });

  return intake;
}

const readable = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

async function notifyAdminsOfTutorRequest(
  userId: string,
  learnerName: string,
  intake: Prisma.IntakeGetPayload<{ include: { schedule: true } }>,
  isUpdate: boolean,
) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, parentProfile: { select: { whatsapp: true } } },
  });
  const subjects = [
    ...intake.subjects.filter((subject) => subject !== 'Other'),
    ...(intake.subjectOther ? [intake.subjectOther] : []),
  ];
  const availability = intake.schedule.length
    ? intake.schedule.map((slot) => `${readable(slot.day)} ${readable(slot.time).toLowerCase()}`).join(', ')
    : 'not given';

  const body = [
    `${learnerName} ${isUpdate ? 'updated their' : 'sent a new'} tutor request.`,
    '',
    `Email: ${account?.email ?? 'unknown'}`,
    `WhatsApp: ${account?.parentProfile?.whatsapp ?? 'not provided'}`,
    `Subjects: ${subjects.join(', ') || intake.subject}`,
    `Topics to work on: ${intake.specificTopics ?? 'not given'}`,
    `Current level: ${readable(intake.currentLevel)}`,
    `Goal: ${readable(intake.learningGoal)}`,
    `Availability: ${availability} (${intake.timezone})`,
    `Sessions per week: ${intake.sessionsPerWeek}`,
    `Budget per session: ${intake.budget}`,
    `Tutor gender preference: ${readable(intake.teacherGenderPref)}`,
    ...(intake.specialNotes ? [`Notes: ${intake.specialNotes}`] : []),
    '',
    'Match a tutor on the admin Intakes page.',
  ].join('\n');

  await createAdminNotifications({
    title: isUpdate ? `Tutor request updated: ${learnerName}` : `New tutor request: ${learnerName}`,
    body,
    studentId: intake.studentId,
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
  assertCanManageProfiles(role);
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
        body: `${student.fullName}'s lessons were paused by the learner. Reason: ${input.reason.trim()}`,
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
          body: `${student.fullName} paused lessons for now.`,
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
        body: `${student.fullName} reactivated lessons.`,
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
    const [packages, pendingRequests] = await Promise.all([
      tx.studentLessonPackage.findMany({
        where: {
          parentId: parent.id,
          studentId: student.id,
          subject,
          status: LessonPackageStatus.ACTIVE,
        },
        orderBy: { createdAt: 'asc' },
      }),
      tx.sessionBookingRequest.findMany({
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

    const request = await tx.sessionBookingRequest.create({
      data: {
        parentId: student.parentId,
        studentId: student.id,
        subject,
        day: input.day,
        timeBlock: input.timeBlock,
        timezone: student.intake?.timezone ?? 'UTC',
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
        body: `${student.fullName} requested ${input.sessionsRequested} weekly ${input.subject.trim()} session(s).`,
        studentId: student.id,
      },
      tx,
    );

    return request;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
  actor: AuditActor,
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

    await createAuditLog(
      {
        actor,
        action: AuditAction.FAMILY_ATTENDANCE_CONFIRMED,
        entityType: AuditEntityType.ATTENDANCE,
        entityId: attendance.id,
        summary: `${actor.email ?? 'Family'} confirmed attendance for ${session.subject} with ${session.teacher.user.name}.`,
        studentId: session.studentId,
        teacherId: session.teacherId,
        metadata: {
          sessionId: session.id,
          statusAfterConfirmation: updatedSession.status,
          familyConfirmedAt: attendance.familyConfirmedAt?.toISOString() ?? null,
          teacherConfirmedAt: attendance.teacherConfirmedAt?.toISOString() ?? null,
        },
      },
      tx,
    );

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
        body: `${session.student.fullName} requested to cancel ${session.subject}. Reason: ${input.reason.trim()}`,
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
        body: `${session.student.fullName} requested to cancel ${session.subject}.`,
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

