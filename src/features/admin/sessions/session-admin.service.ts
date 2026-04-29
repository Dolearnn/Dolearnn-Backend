import {
  AuditAction,
  AuditEntityType,
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
import { zonedLocalDateTimeToUtc } from '../../../lib/timezones';
import { createAuditLog, type AuditActor } from '../../audit/audit.service';
import {
  createAdminNotifications,
  createNotifications,
} from '../../notifications/notification.service';
import type {
  CreateAdminSessionInput,
  ListAdminSessionsQueryInput,
  UpdateMeetingLinkInput,
} from './session-admin.schemas';

const sessionInclude = {
  student: {
    include: {
      intake: true,
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

export async function listAdminSessions(input?: ListAdminSessionsQueryInput) {
  if (!input) {
    return prisma.session.findMany({
      include: sessionInclude,
      orderBy: { startsAt: 'desc' },
    });
  }

  const search = input.search?.trim();
  const where: Prisma.SessionWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: 'insensitive' } },
            {
              student: {
                fullName: { contains: search, mode: 'insensitive' },
              },
            },
            {
              teacher: {
                user: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (input.page - 1) * input.pageSize;
  const [sessions, total, grouped] = await Promise.all([
    prisma.session.findMany({
      where,
      include: sessionInclude,
      orderBy: { startsAt: 'desc' },
      skip,
      take: input.pageSize,
    }),
    prisma.session.count({ where }),
    prisma.session.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const counts = grouped.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});

  return {
    sessions,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    summary: {
      total:
        (counts.UPCOMING ?? 0) +
        (counts.COMPLETED ?? 0) +
        (counts.CANCELLED ?? 0),
      upcoming: counts.UPCOMING ?? 0,
      completed: counts.COMPLETED ?? 0,
      cancelled: counts.CANCELLED ?? 0,
    },
  };
}

export async function listBookingRequests() {
  return prisma.sessionBookingRequest.findMany({
    include: {
      student: {
        include: {
          intake: true,
          parent: { include: { user: true } },
          subjectAssignments: {
            include: {
              teacher: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

function dateWithTime(date: Date, time: string, timeZone: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return zonedLocalDateTimeToUtc(
    {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: hours,
      minute: minutes,
    },
    timeZone,
  );
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
      student: {
        include: {
          intake: true,
        },
      },
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
            startsAt: dateWithTime(date, request.startTime, request.timezone),
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
    const meetLink = input.meetLink?.trim() || assignment.meetLink;
    if (input.meetLink?.trim()) {
      await tx.studentSubjectAssignment.update({
        where: {
          studentId_subject: {
            studentId: assignment.studentId,
            subject,
          },
        },
        data: { meetLink },
      });
    }

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
        meetLink,
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
  actor: AuditActor,
) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  if (session.status === SessionStatus.CANCELLED) {
    throw new AppError(400, 'Cannot update meeting link for a cancelled session');
  }

  return prisma.$transaction(async (tx) => {
    const meetLink = input.meetLink.trim();

    await tx.studentSubjectAssignment.updateMany({
      where: {
        studentId: session.studentId,
        teacherId: session.teacherId,
        subject: session.subject,
      },
      data: { meetLink },
    });

    await tx.session.updateMany({
      where: {
        studentId: session.studentId,
        teacherId: session.teacherId,
        subject: session.subject,
        status: { not: SessionStatus.CANCELLED },
      },
      data: {
        meetLink,
      },
    });

    const updatedSession = await tx.session.findUniqueOrThrow({
      where: { id: sessionId },
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

    await createAuditLog(
      {
        actor,
        action: AuditAction.MEETING_LINK_UPDATED,
        entityType: AuditEntityType.SESSION,
        entityId: updatedSession.id,
        summary: `${actor.email ?? 'Admin'} updated the meeting link for ${updatedSession.subject} with ${updatedSession.student.fullName}.`,
        studentId: updatedSession.studentId,
        teacherId: updatedSession.teacherId,
        metadata: {
          sessionId: updatedSession.id,
          subject: updatedSession.subject,
          meetLink,
        },
      },
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

export async function approveCancellationRequest(
  requestId: string,
  actor: AuditActor,
) {
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

    await createAuditLog(
      {
        actor,
        action: AuditAction.CANCELLATION_APPROVED,
        entityType: AuditEntityType.CANCELLATION,
        entityId: cancellation.id,
        summary: `${actor.email ?? 'Admin'} approved a ${request.requestedBy === CancellationRequester.FAMILY ? 'family cancellation' : 'teacher reschedule'} request for ${request.session.subject} with ${request.session.student.fullName}.`,
        studentId: request.session.studentId,
        teacherId: request.session.teacherId,
        metadata: {
          sessionId: request.sessionId,
          requestedBy: request.requestedBy,
          reason: request.reason,
        },
      },
      tx,
    );

    return { cancellation, session };
  });
}

export async function rejectCancellationRequest(
  requestId: string,
  actor: AuditActor,
) {
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

    await createAuditLog(
      {
        actor,
        action: AuditAction.CANCELLATION_REJECTED,
        entityType: AuditEntityType.CANCELLATION,
        entityId: updatedCancellation.id,
        summary: `${actor.email ?? 'Admin'} rejected a ${request.requestedBy === CancellationRequester.FAMILY ? 'family cancellation' : 'teacher reschedule'} request for ${request.session.subject} with ${request.session.student.fullName}.`,
        studentId: request.session.studentId,
        teacherId: request.session.teacherId,
        metadata: {
          sessionId: request.sessionId,
          requestedBy: request.requestedBy,
          reason: request.reason,
        },
      },
      tx,
    );

    return updatedCancellation;
  });

  return { cancellation };
}
