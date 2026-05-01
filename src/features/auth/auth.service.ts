import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { AccountStatus, AuthProvider, Role, type User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { sendEmail } from '../../lib/email';
import { createAdminNotifications } from '../notifications/notification.service';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.schemas';

const googleClient = new OAuth2Client();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function jwtSecret() {
  if (!env.JWT_SECRET) {
    throw new AppError(500, 'JWT_SECRET is not configured');
  }
  return env.JWT_SECRET;
}

function signToken(user: Pick<User, 'id' | 'email' | 'role' | 'tokenVersion'>) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    },
    jwtSecret(),
    {
      ...options,
      subject: user.id,
    },
  );
}

type ResetPasswordPayload = {
  purpose: 'reset-password';
  email: string;
  state: string;
};

function resetPasswordLink(token: string) {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

function signResetPasswordToken(user: Pick<User, 'id' | 'email' | 'updatedAt'>) {
  return jwt.sign(
    {
      purpose: 'reset-password',
      email: user.email,
      state: user.updatedAt.toISOString(),
    } satisfies ResetPasswordPayload,
    jwtSecret(),
    {
      subject: user.id,
      expiresIn: `${env.RESET_PASSWORD_EXPIRES_IN_MINUTES}m`,
    },
  );
}

function verifyResetPasswordToken(token: string) {
  let decoded: string | jwt.JwtPayload;

  try {
    decoded = jwt.verify(token, jwtSecret());
  } catch {
    throw new AppError(401, 'This reset link is invalid or has expired');
  }

  if (
    typeof decoded === 'string' ||
    decoded.purpose !== 'reset-password' ||
    !decoded.sub ||
    !decoded.email
  ) {
    throw new AppError(401, 'This reset link is invalid or has expired');
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
    state: String(decoded.state ?? ''),
  };
}

function publicUser(user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'status' | 'authProvider' | 'mustChangePassword'>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    authProvider: user.authProvider,
    mustChangePassword: user.mustChangePassword,
  };
}

function authResponse(user: User) {
  return {
    user: publicUser(user),
    token: signToken(user),
  };
}

function assertActive(user: Pick<User, 'status'>) {
  if (user.status !== AccountStatus.ACTIVE) {
    throw new AppError(403, 'This account is not active');
  }
}

export async function registerParent(input: RegisterInput) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'An account already exists for this email');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const name = input.name.trim();
  const whatsapp = input.whatsapp?.trim() || null;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        authProvider: AuthProvider.EMAIL,
        role: Role.PARENT,
        parentProfile: {
          create: {
            whatsapp,
          },
        },
      },
    });

    await createAdminNotifications(
      {
        title: 'New family registered',
        body: `${name} just signed up. Email: ${email}. WhatsApp: ${whatsapp ?? 'not provided'}.`,
      },
      tx,
    );

    return created;
  });

  return authResponse(user);
}

export async function loginWithPassword(input: LoginInput) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid email or password');
  }

  assertActive(user);

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new AppError(401, 'Invalid email or password');
  }

  return authResponse(user);
}

async function verifyGoogleIdToken(input: GoogleAuthInput) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(500, 'GOOGLE_CLIENT_ID is not configured');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: input.idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new AppError(401, 'Google account could not be verified');
  }

  return {
    googleId: payload.sub,
    email: normalizeEmail(payload.email),
    name: payload.name?.trim() || payload.email.split('@')[0],
  };
}

function nextAuthProvider(user: Pick<User, 'passwordHash'>) {
  return user.passwordHash ? AuthProvider.BOTH : AuthProvider.GOOGLE;
}

export async function loginOrRegisterWithGoogle(input: GoogleAuthInput) {
  const googleUser = await verifyGoogleIdToken(input);
  const userWithGoogleId = await prisma.user.findUnique({
    where: { googleId: googleUser.googleId },
  });

  if (userWithGoogleId) {
    assertActive(userWithGoogleId);
    return authResponse(userWithGoogleId);
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: googleUser.email },
    include: {
      teacherProfile: true,
      parentProfile: true,
    },
  });

  if (!existingByEmail) {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.googleId,
          authProvider: AuthProvider.GOOGLE,
          role: Role.PARENT,
          parentProfile: {
            create: {},
          },
        },
      });

      await createAdminNotifications(
        {
          title: 'New family registered',
          body: `${googleUser.name} just signed up with Google. Email: ${googleUser.email}.`,
        },
        tx,
      );

      return created;
    });
    return authResponse(user);
  }

  assertActive(existingByEmail);

  if (existingByEmail.role === Role.TEACHER && !existingByEmail.teacherProfile) {
    throw new AppError(403, 'Teacher account must be created by admin first');
  }

  if (existingByEmail.role === Role.STUDENT) {
    throw new AppError(403, 'Student accounts cannot use this login flow');
  }

  const updated = await prisma.user.update({
    where: { id: existingByEmail.id },
    data: {
      googleId: googleUser.googleId,
      authProvider: nextAuthProvider(existingByEmail),
      name: existingByEmail.name || googleUser.name,
    },
  });

  return authResponse(updated);
}

export async function currentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(401, 'User no longer exists');
  }
  assertActive(user);
  return publicUser(user);
}

export async function logoutUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      tokenVersion: { increment: 1 },
    },
  });
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) {
    throw new AppError(401, 'User no longer exists');
  }

  assertActive(user);

  const currentPasswordOk = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );
  if (!currentPasswordOk) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
      mustChangePassword: false,
    },
  });

  return authResponse(updated);
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== AccountStatus.ACTIVE) {
    return;
  }

  const token = signResetPasswordToken(user);
  const link = resetPasswordLink(token);

  await sendEmail({
    to: user.email,
    subject: 'Reset your DoLearn password',
    text: `We received a request to reset your DoLearn password. Open this link within ${env.RESET_PASSWORD_EXPIRES_IN_MINUTES} minutes: ${link}`,
    html: `<p>We received a request to reset your DoLearn password.</p><p><a href="${link}">Reset your password</a></p><p>This link expires in ${env.RESET_PASSWORD_EXPIRES_IN_MINUTES} minutes.</p>`,
  });
}

export async function resetPassword(input: ResetPasswordInput) {
  const payload = verifyResetPasswordToken(input.token);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user || normalizeEmail(user.email) !== normalizeEmail(payload.email)) {
    throw new AppError(401, 'This reset link is invalid or has expired');
  }

  if (user.updatedAt.toISOString() !== payload.state) {
    throw new AppError(401, 'This reset link is invalid or has expired');
  }

  assertActive(user);

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
      mustChangePassword: false,
      authProvider:
        user.authProvider === AuthProvider.GOOGLE ? AuthProvider.BOTH : user.authProvider,
    },
  });

  return authResponse(updated);
}
