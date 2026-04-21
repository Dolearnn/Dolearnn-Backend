import {
  BookingRequestStatus,
  CancellationRequester,
  CancellationStatus,
  LessonPackageStatus,
  Prisma,
  Role,
  SessionStatus,
} from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import {
  createAdminNotifications,
  createNotifications,
} from '../../notifications/notification.service';
import type {
  CreateAdminSessionInput,
  UpdateMeetingLinkInput,
} from './session-admin.schemas';

const sessionInclude = {
  student: {
    include: {
      parent: {
        include: { user: true },
      },
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

export async function listAdminSessions() {
  return prisma.session.findMany({
    include: sessionInclude,
    orderBy: { startsAt: 'desc' },
  });
}

export async function listBookingRequests() {
  return prisma.sessionBookingRequest.findMany({
    include: {
      student: {
        include: {
          parent: { include: { user: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

function dateWithTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(date);
  next.setUTCHours(hours, minutes, 0, 0);
  return next;
}

async function consumePaidSessions(
  parentId: string,
  studentId: string,
  subject: string,
  count: number,
  tx: Prisma.TransactionClient,
) {
  let remaining = count;
  const consumed: string[] = [];
  const packages = await tx.studentLessonPackage.findMany({
    where: {
      parentId,
      studentId,
      subject,
      status: LessonPackageStatus.ACTIVE,
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const lessonPackage of packages) {
    if (remaining <= 0) break;
    const available =
      lessonPackage.hoursPurchased - lessonPackage.hoursScheduled;
    if (available <= 0) continue;
    const used = Math.min(available, remaining);
    await tx.studentLessonPackage.update({
      where: { id: lessonPackage.id },
      data: {
        hoursScheduled: { increment: used },
        status:
          lessonPackage.hoursScheduled + used >= lessonPackage.hoursPurchased
            ? LessonPackageStatus.EXHAUSTED
            : LessonPackageStatus.ACTIVE,
      },
    });
    consumed.push(...Array.from({ length: used }, () => lessonPackage.id));
    remaining -= used;
  }

  if (remaining > 0) {
    throw new AppError(400, 'Not enough unused paid hours for this request');
  }

  return consumed;
}

export async function scheduleBookingRequest(requestId: string) {
  const request = await prisma.sessionBookingRequest.findUnique({
    where: { id: requestId },
    include: {
      parent: { include: { user: true } },
      student: true,
    },
  });

  if (!request) {
    throw new AppError(404, 'Booking request not found');
  }

  if (request.status !== BookingRequestStatus.PENDING) {
    throw new AppError(400, 'This booking request has already been resolved');
  }

  const assignment = await prisma.studentSubjectAssignment.findUnique({
    where: {
      studentId_subject: {
        studentId: request.studentId,
        subject: request.subject,
      },
    },
    include: {
      teacher: {
        include: { user: true },
      },
    },
  });

  if (!assignment) {
    throw new AppError(400, 'This subject has no assigned teacher yet');
  }

  return prisma.$transaction(async (tx) => {
    const packageIds = await consumePaidSessions(
      request.parentId,
      request.studentId,
      request.subject,
      request.sessionsRequested,
      tx,
    );

    const sessions = [];
    for (let index = 0; index < request.sessionsRequested; index += 1) {
      const date = new Date(request.startDate);
      date.setUTCDate(date.getUTCDate() + index * 7);
      sessions.push(
        await tx.session.create({
          data: {
            studentId: request.studentId,
            teacherId: assignment.teacherId,
            lessonPackageId: packageIds[index],
            subject: request.subject,
            startsAt: dateWithTime(date, request.startTime),
            durationMins: 60,
            meetLink: assignment.meetLink,
            amount: assignment.teacher.hourlyRate,
          },
          include: sessionInclude,
        }),
      );
    }

    const updatedRequest = await tx.sessionBookingRequest.update({
      where: { id: request.id },
      data: {
        status: BookingRequestStatus.SCHEDULED,
        scheduledAt: new Date(),
      },
    });

    await createNotifications(
      [
        {
          userId: request.parent.userId,
          role: Role.PARENT,
          title: 'Sessions scheduled',
          body: `Admin scheduled ${request.sessionsRequested} ${request.subject} session(s) for ${request.student.fullName}.`,
          studentId: request.studentId,
          teacherId: assignment.teacherId,
        },
        {
          userId: assignment.teacher.userId,
          role: Role.TEACHER,
          title: 'Sessions scheduled',
          body: `Admin scheduled ${request.sessionsRequested} ${request.subject} session(s) with ${request.student.fullName}.`,
          studentId: request.studentId,
          teacherId: assignment.teacherId,
        },
      ],
      tx,
    );

    if (!assignment.meetLink) {
      await createAdminNotifications(
        {
          title: 'Meeting link needed',
          body: `${request.student.fullName}'s ${request.subject} sessions were scheduled without a meeting link. Add the link to the teacher-student match.`,
          studentId: request.studentId,
          teacherId: assignment.teacherId,
        },
        tx,
      );
    }

    return { request: updatedRequest, sessions };
  });
}

export async function createAdminSession(input: CreateAdminSessionInput) {
  const subject = input.subject.trim();
  const assignment = await prisma.studentSubjectAssignment.findUnique({
    where: {
      studentId_subject: {
        studentId: input.studentId,
        subject,
      },
    },
    include: {
      teacher: { include: { user: true } },
      student: { include: { parent: { include: { user: true } } } },
    },
  });

  if (!assignment) {
    throw new AppError(
      400,
      'This student has no teacher assigned for this subject',
    );
  }

  return prisma.$transaction(async (tx) => {
    const packageIds = await consumePaidSessions(
      assignment.student.parentId,
      assignment.studentId,
      subject,
      1,
      tx,
    );

    const session = await tx.session.create({
      data: {
        studentId: assignment.studentId,
        teacherId: assignment.teacherId,
        lessonPackageId: packageIds[0],
        subject,
        startsAt: new Date(input.startsAt),
        durationMins: input.durationMins,
        meetLink: input.meetLink ?? assignment.meetLink,
        amount: assignment.teacher.hourlyRate,
      },
      include: sessionInclude,
    });

    await createNotifications(
      [
        {
          userId: assignment.student.parent.userId,
          role: Role.PARENT,
          title: 'Session scheduled',
          body: `Admin scheduled a ${subject} session for ${assignment.student.fullName}.`,
          studentId: assignment.studentId,
          teacherId: assignment.teacherId,
        },
        {
          userId: assignment.teacher.userId,
          role: Role.TEACHER,
          title: 'Session scheduled',
          body: `Admin scheduled a ${subject} session with ${assignment.student.fullName}.`,
          studentId: assignment.studentId,
          teacherId: assignment.teacherId,
        },
      ],
      tx,
    );

    if (!session.meetLink) {
      await createAdminNotifications(
        {
          title: 'Meeting link needed',
          body: `The ${subject} session for ${assignment.student.fullName} needs a meeting link.`,
          studentId: assignment.studentId,
          teacherId: assignment.teacherId,
        },
        tx,
      );
    }

    return { session };
  });
}

export async function updateSessionMeetingLink(
  sessionId: string,
  input: UpdateMeetingLinkInput,
) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  if (session.status === SessionStatus.CANCELLED) {
    throw new AppError(400, 'Cannot update meeting link for a cancelled session');
  }

  return prisma.$transaction(async (tx) => {
    const updatedSession = await tx.session.update({
      where: { id: sessionId },
      data: {
        meetLink: input.meetLink.trim(),
      },
      include: sessionInclude,
    });

    await createNotifications(
      [
        {
          userId: updatedSession.student.parent.userId,
          role: Role.PARENT,
          title: 'Class link added',
          body: `Admin added the meeting link for ${updatedSession.student.fullName}'s ${updatedSession.subject} class.`,
          studentId: updatedSession.studentId,
          teacherId: updatedSession.teacherId,
        },
        {
          userId: updatedSession.teacher.userId,
          role: Role.TEACHER,
          title: 'Class link added',
          body: `Admin added the meeting link for ${updatedSession.subject} with ${updatedSession.student.fullName}.`,
          studentId: updatedSession.studentId,
          teacherId: updatedSession.teacherId,
        },
      ],
      tx,
    );

    return updatedSession;
  });
}

export async function listCancellationRequests() {
  return prisma.cancellationRequest.findMany({
    include: {
      session: {
        include: sessionInclude,
      },
    },
    orderBy: { requestedAt: 'desc' },
  });
}

async function getCancellationRequest(requestId: string) {
  const request = await prisma.cancellationRequest.findUnique({
    where: { id: requestId },
    include: {
      session: {
        include: {
          student: {
            include: {
              parent: true,
            },
          },
          teacher: true,
          lessonPackage: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError(404, 'Cancellation request not found');
  }

  if (request.status !== CancellationStatus.PENDING) {
    throw new AppError(400, 'This cancellation request has already been resolved');
  }

  return request;
}

export async function approveCancellationRequest(requestId: string) {
  const request = await getCancellationRequest(requestId);

  return prisma.$transaction(async (tx) => {
    const cancellation = await tx.cancellationRequest.update({
      where: { id: request.id },
      data: {
        status: CancellationStatus.APPROVED,
        resolvedAt: new Date(),
      },
    });

    const session = await tx.session.update({
      where: { id: request.sessionId },
      data: {
        status: SessionStatus.CANCELLED,
      },
      include: sessionInclude,
    });

    if (request.session.lessonPackageId) {
      await tx.studentLessonPackage.update({
        where: { id: request.session.lessonPackageId },
        data: {
          hoursScheduled: { decrement: 1 },
          status: LessonPackageStatus.ACTIVE,
        },
      });
    }

    await createNotifications(
      [
        {
          userId: request.session.student.parent.userId,
          role: Role.PARENT,
          title: 'Cancellation approved',
          body: `${request.session.subject} for ${request.session.student.fullName} has been cancelled.`,
          studentId: request.session.studentId,
          teacherId: request.session.teacherId,
        },
        {
          userId: request.session.teacher.userId,
          role: Role.TEACHER,
          title: 'Cancellation approved',
          body: `${request.session.subject} with ${request.session.student.fullName} has been cancelled.`,
          studentId: request.session.studentId,
          teacherId: request.session.teacherId,
        },
      ],
      tx,
    );

    await createAdminNotifications(
      {
        title: 'Session request approved',
        body: `Admin approved a ${request.requestedBy === CancellationRequester.FAMILY ? 'family cancellation' : 'teacher reschedule'} request for ${request.session.subject} with ${request.session.student.fullName}.`,
        studentId: request.session.studentId,
        teacherId: request.session.teacherId,
      },
      tx,
    );

    return { cancellation, session };
  });
}

export async function rejectCancellationRequest(requestId: string) {
  const request = await getCancellationRequest(requestId);

  const cancellation = await prisma.$transaction(async (tx) => {
    const updatedCancellation = await tx.cancellationRequest.update({
      where: { id: request.id },
      data: {
        status: CancellationStatus.REJECTED,
        resolvedAt: new Date(),
      },
    });

    const recipient =
      request.requestedBy === CancellationRequester.FAMILY
        ? {
            userId: request.session.student.parent.userId,
            role: Role.PARENT,
            title: 'Cancellation rejected',
            body: `Your cancellation request for ${request.session.student.fullName}'s ${request.session.subject} class was rejected.`,
          }
        : {
            userId: request.session.teacher.userId,
            role: Role.TEACHER,
            title: 'Reschedule request rejected',
            body: `Your request to change ${request.session.subject} with ${request.session.student.fullName} was rejected. The session is still scheduled.`,
          };

    const otherParty =
      request.requestedBy === CancellationRequester.FAMILY
        ? {
            userId: request.session.teacher.userId,
            role: Role.TEACHER,
            title: 'Cancellation request rejected',
            body: `${request.session.student.fullName}'s family cancellation request was rejected. The session is still scheduled.`,
          }
        : null;

    await createNotifications(
      [
        {
          ...recipient,
          studentId: request.session.studentId,
          teacherId: request.session.teacherId,
        },
        ...(otherParty
          ? [
              {
                ...otherParty,
                studentId: request.session.studentId,
                teacherId: request.session.teacherId,
              },
            ]
          : []),
      ],
      tx,
    );

    await createAdminNotifications(
      {
        title: 'Session request rejected',
        body: `Admin rejected a ${request.requestedBy === CancellationRequester.FAMILY ? 'family cancellation' : 'teacher reschedule'} request for ${request.session.subject} with ${request.session.student.fullName}.`,
        studentId: request.session.studentId,
        teacherId: request.session.teacherId,
      },
      tx,
    );

    return updatedCancellation;
  });

  return { cancellation };
}
