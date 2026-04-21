import { CancellationRequester, CancellationStatus, Role, SessionStatus } from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import {
  createAdminNotifications,
  createNotifications,
} from '../../notifications/notification.service';
import type { UpdateMeetingLinkInput } from './session-admin.schemas';

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
