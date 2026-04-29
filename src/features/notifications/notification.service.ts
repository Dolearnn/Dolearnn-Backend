import { Role, type Prisma } from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { sendBulkEmail } from '../../lib/email';

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
    where: { role: Role.ADMIN, status: 'ACTIVE' },
    select: { id: true, role: true, email: true, name: true },
  });

  const result = await createNotifications(
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

  void sendBulkEmail(
    admins.map((admin) => ({
      to: admin.email,
      subject: `DoLearn admin alert: ${input.title}`,
      text: `Hello ${admin.name},\n\n${input.body}\n\nSign in to the admin dashboard for more details.`,
      html: `<p>Hello ${admin.name},</p><p>${input.body}</p><p>Sign in to the admin dashboard for more details.</p>`,
    })),
  ).catch((error) => {
    console.error('Could not send admin email notifications', error);
  });

  return result;
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
