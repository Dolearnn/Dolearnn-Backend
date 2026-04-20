import { Router } from 'express';
import { AppError, asyncHandler } from '../../../lib/http';
import {
  createTeacherSchema,
  terminateTeacherSchema,
  updateTeacherRateSchema,
} from './teacher-admin.schemas';
import {
  createTeacher,
  listTeachers,
  terminateTeacher,
  updateTeacherRate,
} from './teacher-admin.service';

export const teacherAdminRoutes = Router();

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

teacherAdminRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const teachers = await listTeachers();
    res.json({ teachers });
  }),
);

teacherAdminRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createTeacherSchema.parse(req.body);
    const teacher = await createTeacher(input);
    res.status(201).json({ teacher });
  }),
);

teacherAdminRoutes.patch(
  '/:teacherId/rate',
  asyncHandler(async (req, res) => {
    const input = updateTeacherRateSchema.parse(req.body);
    const teacherId = getRouteParam(req.params.teacherId, 'teacher id');
    const teacher = await updateTeacherRate(teacherId, input);
    res.json({ teacher });
  }),
);

teacherAdminRoutes.post(
  '/:teacherId/terminate',
  asyncHandler(async (req, res) => {
    const input = terminateTeacherSchema.parse(req.body);
    const teacherId = getRouteParam(req.params.teacherId, 'teacher id');
    const teacher = await terminateTeacher(teacherId, input);
    res.json({ teacher });
  }),
);
