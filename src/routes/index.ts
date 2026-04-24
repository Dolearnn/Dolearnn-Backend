import { Router } from 'express';
import { adminRoutes } from '../features/admin/admin.routes';
import { authRoutes } from '../features/auth/auth.routes';
import { familyRoutes } from '../features/family/family.routes';
import { notificationRoutes } from '../features/notifications/notification.routes';
import { publicRoutes } from '../features/public/public.routes';
import { teacherRoutes } from '../features/teacher/teacher.routes';
import { healthRoutes } from './health.routes';

export const routes = Router();

routes.use('/admin', adminRoutes);
routes.use('/auth', authRoutes);
routes.use('/family', familyRoutes);
routes.use('/notifications', notificationRoutes);
routes.use('/public', publicRoutes);
routes.use('/teacher', teacherRoutes);
routes.use('/health', healthRoutes);
