import { Role, type Prisma } from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';

type NotificationClient = Prisma.TransactionClient | typeof prisma;

export interface CreateNotificationInput {
  userId: string;
  role: Role;
  title: string;
  body: string;
  studentId?: string | null;
  teacherId?: string | null;
}

export function createNotification(
  input: CreateNotificationInput,
  client: NotificationClient = prisma,
) {
  return client.notification.create({
    data: {
      userId: input.userId,
      role: input.role,
      title: input.title,
      body: input.body,
      studentId: input.studentId ?? null,
      teacherId: input.teacherId ?? null,
    },
  });
}

export function createNotifications(
  inputs: CreateNotificationInput[],
  client: NotificationClient = prisma,
) {
  if (inputs.length === 0) return Promise.resolve({ count: 0 });

  return client.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      role: input.role,
      title: input.title,
      body: input.body,
      studentId: input.studentId ?? null,
      teacherId: input.teacherId ?? null,
    })),
  });
}

export async function createAdminNotifications(
  input: Omit<CreateNotificationInput, 'userId' | 'role'>,
  client: NotificationClient = prisma,
) {
  const admins = await client.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, role: true },
  });

  return createNotifications(
    admins.map((admin) => ({
      userId: admin.id,
      role: admin.role,
      title: input.title,
      body: input.body,
      studentId: input.studentId,
      teacherId: input.teacherId,
    })),
    client,
  );
}

export function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function setNotificationRead(
  userId: string,
  notificationId: string,
  read: boolean,
) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  return prisma.notification.update({
    where: { id: notification.id },
    data: { read },
  });
}

export function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
}
