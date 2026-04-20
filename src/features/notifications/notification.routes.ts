import { Router } from 'express';
import { AppError, asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { updateNotificationReadSchema } from './notification.schemas';
import {
  listNotifications,
  markAllNotificationsRead,
  setNotificationRead,
} from './notification.service';

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

notificationRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const notifications = await listNotifications(req.user!.id);
    res.json({ notifications });
  }),
);

notificationRoutes.patch(
  '/:notificationId/read',
  asyncHandler(async (req, res) => {
    const notificationId = getRouteParam(
      req.params.notificationId,
      'notification id',
    );
    const input = updateNotificationReadSchema.parse(req.body);
    const notification = await setNotificationRead(
      req.user!.id,
      notificationId,
      input.read,
    );
    res.json({ notification });
  }),
);

notificationRoutes.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await markAllNotificationsRead(req.user!.id);
    res.json(result);
  }),
);
