import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { clientIp, userAgent } from '../../middleware/activity-log';
import { rateLimit } from '../../middleware/rate-limit';
import { AuditAction, AuditCategory, AuditEntityType, recordActivity } from '../audit/audit.service';

/*
 * The frontend reports each page a signed-in user opens, so the admin activity
 * log shows where people go, not only what they change.
 */
export const activityRoutes = Router();

const pageViewSchema = z.object({
  // A path inside the app, e.g. "/student/practice". Query strings are dropped.
  path: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^\/[^\s]*$/, 'Must be an app path'),
  title: z.string().trim().max(120).optional(),
});

// The same user opening the same page again within this window is one visit
// (re-renders, tab refocus, React strict mode).
const REPEAT_WINDOW_MS = 30_000;
const lastView = new Map<string, { path: string; at: number }>();
setInterval(() => {
  const cutoff = Date.now() - REPEAT_WINDOW_MS;
  for (const [key, view] of lastView) if (view.at < cutoff) lastView.delete(key);
}, 60_000).unref();

activityRoutes.post(
  '/page-view',
  requireAuth,
  rateLimit({
    keyPrefix: 'page-view',
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many page views.',
    keyGenerator: (req) => req.user?.id ?? 'anonymous',
  }),
  asyncHandler(async (req, res) => {
    const input = pageViewSchema.parse(req.body);
    const user = req.user!;
    const path = input.path.split('?')[0].split('#')[0];

    const previous = lastView.get(user.id);
    const now = Date.now();
    if (!previous || previous.path !== path || now - previous.at > REPEAT_WINDOW_MS) {
      lastView.set(user.id, { path, at: now });
      recordActivity({
        actor: user,
        action: AuditAction.PAGE_VIEWED,
        entityType: AuditEntityType.PAGE,
        entityId: path,
        category: AuditCategory.NAVIGATION,
        summary: `Opened ${input.title ? `${input.title} (${path})` : path}`,
        metadata: { path },
        ipAddress: clientIp(req),
        userAgent: userAgent(req),
      });
    }

    res.status(204).send();
  }),
);
