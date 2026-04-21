import { Router } from 'express';
import { AppError, asyncHandler } from '../../../lib/http';
import { assignTeacherSchema, createAdminStudentSchema } from './student-admin.schemas';
import {
  assignTeacherToStudent,
  createAdminStudent,
  listPendingIntakes,
  listStudents,
  unassignTeacherFromStudent,
} from './student-admin.service';

export const studentAdminRoutes = Router();

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

studentAdminRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const students = await listStudents();
    res.json({ students });
  }),
);

studentAdminRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createAdminStudentSchema.parse(req.body);
    const student = await createAdminStudent(input);
    res.status(201).json({ student });
  }),
);

studentAdminRoutes.get(
  '/pending-intakes',
  asyncHandler(async (_req, res) => {
    const students = await listPendingIntakes();
    res.json({ students });
  }),
);

studentAdminRoutes.post(
  '/:studentId/assign-teacher',
  asyncHandler(async (req, res) => {
    const studentId = getRouteParam(req.params.studentId, 'student id');
    const input = assignTeacherSchema.parse(req.body);
    const student = await assignTeacherToStudent(studentId, input);
    res.json({ student });
  }),
);

studentAdminRoutes.post(
  '/:studentId/unassign-teacher',
  asyncHandler(async (req, res) => {
    const studentId = getRouteParam(req.params.studentId, 'student id');
    const input = assignTeacherSchema.pick({ subject: true }).parse(req.body ?? {});
    const student = await unassignTeacherFromStudent(studentId, input.subject);
    res.json({ student });
  }),
);
