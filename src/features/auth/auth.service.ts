import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { AccountStatus, AuthProvider, Role, type User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import type {
  ChangePasswordInput,
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
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

function signToken(user: Pick<User, 'id' | 'email' | 'role'>) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    jwtSecret(),
    {
      ...options,
      subject: user.id,
    },
  );
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
  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash,
      authProvider: AuthProvider.EMAIL,
      role: Role.PARENT,
      parentProfile: {
        create: {
          whatsapp: input.whatsapp?.trim() || null,
        },
      },
    },
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
    const user = await prisma.user.create({
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
      mustChangePassword: false,
    },
  });

  return authResponse(updated);
}
