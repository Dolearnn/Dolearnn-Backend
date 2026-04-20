import {
  AccountStatus,
  CancellationRequester,
  CancellationStatus,
  ProposalStatus,
  Role,
  SessionStatus,
} from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import {
  createAdminNotifications,
  createNotification,
} from '../notifications/notification.service';
import type {
  CreateStudentInput,
  DeactivateStudentInput,
  RequestCancellationInput,
  SaveIntakeInput,
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
) {
  assertParent(role);
  const proposal = await getOwnedProposal(userId, proposalId);

  if (proposal.status !== ProposalStatus.PENDING) {
    throw new AppError(400, 'This proposal has already been resolved');
  }

  return prisma.$transaction(async (tx) => {
    const updatedProposal = await tx.sessionProposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.DECLINED,
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
        body: `${proposal.student.fullName}'s family declined your ${proposal.subject} session proposal.`,
        studentId: proposal.studentId,
        teacherId: proposal.teacherId,
      },
      tx,
    );

    return updatedProposal;
  });
}
