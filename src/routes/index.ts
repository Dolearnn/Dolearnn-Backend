import { Router } from 'express';
import { adminRoutes } from '../features/admin/admin.routes';
import { arenaRoutes } from '../features/arena/arena.routes';
import { authRoutes } from '../features/auth/auth.routes';
import { familyRoutes } from '../features/family/family.routes';
import { notificationRoutes } from '../features/notifications/notification.routes';
import { publicRoutes } from '../features/public/public.routes';
import { quizRoutes } from '../features/quiz/quiz.routes';
import { teacherRoutes } from '../features/teacher/teacher.routes';
import { healthRoutes } from './health.routes';

export const routes = Router();

routes.use('/admin', adminRoutes);
routes.use('/arena', arenaRoutes);
routes.use('/auth', authRoutes);
routes.use('/family', familyRoutes);
routes.use('/notifications', notificationRoutes);
routes.use('/public', publicRoutes);
routes.use('/quiz', quizRoutes);
routes.use('/teacher', teacherRoutes);
routes.use('/health', healthRoutes);
