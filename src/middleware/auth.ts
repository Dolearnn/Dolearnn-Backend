import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../lib/http';

interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
}

function jwtSecret() {
  if (!env.JWT_SECRET) {
    throw new AppError(500, 'JWT_SECRET is not configured');
  }
  return env.JWT_SECRET;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, jwtSecret()) as AuthTokenPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as never,
    };
    return next();
  } catch {
    return next(new AppError(401, 'Invalid or expired token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to do this'));
    }

    return next();
  };
}
