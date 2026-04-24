import { Router } from 'express';
import { AppError, asyncHandler } from '../../../lib/http';
import {
  createTeacherSchema,
  listTeachersQuerySchema,
  terminateTeacherSchema,
  updateTeacherRateSchema,
} from './teacher-admin.schemas';
import {
  createTeacher,
  listTeachers,
  listTeachersPage,
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
  asyncHandler(async (req, res) => {
    const hasQuery = Object.keys(req.query).length > 0;
    const result = hasQuery
      ? await listTeachersPage(listTeachersQuerySchema.parse(req.query))
      : await listTeachers();
    if (Array.isArray(result)) {
      res.json({ teachers: result });
      return;
    }
    res.json(result);
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
    const teacher = await updateTeacherRate(teacherId, input, req.user!);
    res.json({ teacher });
  }),
);

teacherAdminRoutes.post(
  '/:teacherId/terminate',
  asyncHandler(async (req, res) => {
    const input = terminateTeacherSchema.parse(req.body);
    const teacherId = getRouteParam(req.params.teacherId, 'teacher id');
    const teacher = await terminateTeacher(teacherId, input, req.user!);
    res.json({ teacher });
  }),
);
