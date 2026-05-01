import { Role, type Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { sendBulkEmail } from '../../lib/email';

type NotificationClient = Prisma.TransactionClient | typeof prisma;
type NotificationOptions = {
  email?: boolean;
};

export interface CreateNotificationInput {
  userId: string;
  role: Role;
  title: string;
  body: string;
  studentId?: string | null;
  teacherId?: string | null;
}

function dashboardUrlForRole(role: Role) {
  const baseUrl = env.FRONTEND_URL.replace(/\/+$/, '');

  if (role === Role.ADMIN) return `${baseUrl}/admin`;
  if (role === Role.TEACHER) return `${baseUrl}/teacher`;
  return `${baseUrl}/family`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function notificationEmailMessage(
  user: { email: string; name: string; role: Role },
  input: Pick<CreateNotificationInput, 'title' | 'body'>,
) {
  const url = dashboardUrlForRole(user.role);
  const safeTitle = escapeHtml(input.title);
  const safeBody = escapeHtml(input.body);
  const safeName = escapeHtml(user.name);

  return {
    to: user.email,
    subject: `DoLearn: ${input.title}`,
    text: `Hello ${user.name},\n\n${input.body}\n\nOpen your dashboard: ${url}`,
    html: `<p>Hello ${safeName},</p><p><strong>${safeTitle}</strong></p><p>${safeBody}</p><p><a href="${url}">Open your dashboard</a></p>`,
  };
}

async function sendNotificationEmails(
  inputs: CreateNotificationInput[],
  client: NotificationClient,
) {
  if (inputs.length === 0) return;

  const users = await client.user.findMany({
    where: {
      id: { in: inputs.map((input) => input.userId) },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  const usersById = new Map(users.map((user) => [user.id, user]));
  const emails = inputs.flatMap((input) => {
    const user = usersById.get(input.userId);
    if (!user) return [];

    return [
      notificationEmailMessage(
        {
          email: user.email,
          name: user.name,
          role: user.role,
        },
        input,
      ),
    ];
  });

  if (emails.length === 0) return;

  void sendBulkEmail(emails).catch((error) => {
    console.error('Could not send notification emails', error);
  });
}

export async function createNotification(
  input: CreateNotificationInput,
  client: NotificationClient = prisma,
  options?: NotificationOptions,
) {
  const result = await client.notification.create({
    data: {
      userId: input.userId,
      role: input.role,
      title: input.title,
      body: input.body,
      studentId: input.studentId ?? null,
      teacherId: input.teacherId ?? null,
    },
  });

  if (options?.email !== false) {
    await sendNotificationEmails([input], client);
  }

  return result;
}

export async function createNotifications(
  inputs: CreateNotificationInput[],
  client: NotificationClient = prisma,
  options?: NotificationOptions,
) {
  if (inputs.length === 0) return Promise.resolve({ count: 0 });

  const result = await client.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      role: input.role,
      title: input.title,
      body: input.body,
      studentId: input.studentId ?? null,
      teacherId: input.teacherId ?? null,
    })),
  });

  if (options?.email !== false) {
    await sendNotificationEmails(inputs, client);
  }

  return result;
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
    { email: false },
  );

  void sendBulkEmail(
    admins.map((admin) => ({
      to: admin.email,
      subject: `DoLearn admin alert: ${input.title}`,
      text: `Hello ${admin.name},\n\n${input.body}\n\nSign in to the admin dashboard for more details.`,
      html: `<p>Hello ${escapeHtml(admin.name)},</p><p>${escapeHtml(input.body)}</p><p>Sign in to the admin dashboard for more details.</p>`,
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
