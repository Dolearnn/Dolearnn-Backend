import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { matchActivityRoute, type ActivityContext } from '../features/audit/activity-catalog';
import { AuditCategory, recordActivity, type AuditActor } from '../features/audit/audit.service';

/*
 * Records everything users do through the API in the admin activity log.
 * Every finished POST/PUT/PATCH/DELETE under /api is matched against the
 * activity catalog (features/audit/activity-catalog.ts) and written once the
 * response has gone out, so it never slows a request down. Failed requests are
 * logged too, with the error message the user saw. Page views come from the
 * frontend through /api/activity/page-view, which writes its own entries.
 */

const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIPPED_PREFIXES = ['/activity/', '/health'];

export function clientIp(req: Request) {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.ip || null;
}

export function userAgent(req: Request) {
  return req.header('user-agent')?.slice(0, 300) ?? null;
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (Object.values(Role) as string[]).includes(value);
}

async function resolveActor(
  req: Request,
  response: unknown,
  byEmail: boolean,
): Promise<AuditActor | null> {
  if (req.user) return { id: req.user.id, role: req.user.role, email: req.user.email };

  const user = (response as { user?: { id?: unknown; role?: unknown; email?: unknown } } | undefined)?.user;
  if (user && typeof user.id === 'string' && isRole(user.role)) {
    return { id: user.id, role: user.role, email: typeof user.email === 'string' ? user.email : undefined };
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (byEmail && email && email.length <= 200) {
    const found = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, role: true, email: true },
    });
    if (found) return found;
  }

  return null;
}

function errorMessage(body: unknown) {
  const message = (body as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' ? message.slice(0, 200) : undefined;
}

export function activityLog(req: Request, res: Response, next: NextFunction) {
  if (!LOGGED_METHODS.has(req.method)) return next();

  const path = (req.originalUrl.split('?')[0] ?? '').replace(/^\/api(?=\/|$)/, '') || '/';
  if (SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix))) return next();

  let responseBody: unknown;
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as Response['json'];

  res.on('finish', () => {
    void writeEntry(req, res.statusCode, path, responseBody).catch((error) => {
      console.warn('[activity] could not log', req.method, path, error instanceof Error ? error.message : error);
    });
  });

  next();
}

async function writeEntry(req: Request, status: number, path: string, responseBody: unknown) {
  const ok = status < 400;
  const matched = matchActivityRoute(req.method, path);
  const route = matched?.route;

  // A service already wrote a fuller entry for this success.
  if (ok && route?.explicit) return;

  const actor = await resolveActor(req, ok ? responseBody : undefined, Boolean(route?.actorFromEmail));
  // Anonymous traffic (bots, expired tokens, guests playing the daily quiz) is
  // only kept for the few public actions worth seeing.
  if (!actor && !route?.guests) return;
  // Unknown routes that 404 are noise, not user actions.
  if (!route && status === 404) return;

  const ctx: ActivityContext = {
    params: matched?.params ?? {},
    body: req.body ?? {},
    response: ok ? responseBody : undefined,
  };

  let summary: string;
  if (route) {
    let detail: string | undefined;
    if (ok && route.detail) {
      try {
        detail = route.detail(ctx) || undefined;
      } catch {
        detail = undefined;
      }
    }
    summary = ok
      ? detail
        ? `${route.title}: ${detail}`
        : route.title
      : `Tried to ${route.verb} but it failed${errorMessage(responseBody) ? `: ${errorMessage(responseBody)}` : ''}`;
  } else {
    summary = ok
      ? `${req.method} ${path}`
      : `${req.method} ${path} failed${errorMessage(responseBody) ? `: ${errorMessage(responseBody)}` : ''}`;
  }

  let entityId: string | undefined;
  try {
    entityId = route?.entity?.(ctx) ?? undefined;
  } catch {
    entityId = undefined;
  }
  entityId = entityId ?? Object.values(ctx.params)[0] ?? actor?.id ?? path;

  const params = ctx.params;
  recordActivity({
    actor,
    action: route?.action ?? 'API_REQUEST',
    entityType: route?.entityType ?? 'OTHER',
    entityId,
    category: (route?.category as AuditCategory | undefined) ?? AuditCategory.OTHER,
    outcome: ok ? 'SUCCESS' : 'FAILED',
    summary,
    metadata: {
      method: req.method,
      path,
      status,
      ...(ok ? {} : { error: errorMessage(responseBody) ?? null }),
      ...(actor ? {} : route?.actorFromEmail && typeof req.body?.email === 'string'
        ? { attemptedEmail: req.body.email.slice(0, 200) }
        : {}),
    },
    ipAddress: clientIp(req),
    userAgent: userAgent(req),
    // Only link records the request proved exist; a failed request may carry a bad id.
    studentId: ok ? params.studentId ?? null : null,
    teacherId: ok ? params.teacherId ?? null : null,
  });
}
