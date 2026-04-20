import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth';
import { paymentAdminRoutes } from './payments/payment-admin.routes';
import { sessionAdminRoutes } from './sessions/session-admin.routes';
import { studentAdminRoutes } from './students/student-admin.routes';
import { teacherAdminRoutes } from './teachers/teacher-admin.routes';

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole(Role.ADMIN));
adminRoutes.use('/payments', paymentAdminRoutes);
adminRoutes.use('/sessions', sessionAdminRoutes);
adminRoutes.use('/students', studentAdminRoutes);
adminRoutes.use('/teachers', teacherAdminRoutes);
