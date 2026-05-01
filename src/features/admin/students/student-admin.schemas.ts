import { z } from 'zod';
import { GradeLevel } from '@prisma/client';
import { saveIntakeSchema } from '../../family/family.schemas';
import { safeMeetingLinkSchema } from '../../../lib/urls';

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  hasIntake: z.coerce.boolean().optional(),
  assignmentStatus: z.enum(['ALL', 'PENDING', 'MATCHED']).default('ALL'),
});

export const createAdminStudentSchema = z
  .object({
    parentId: z.string().min(1, 'Parent is required'),
    fullName: z.string().trim().min(2, 'Student name is required'),
    age: z.coerce.number().int().min(3).max(25),
    grade: z.nativeEnum(GradeLevel),
    gradeOther: z.string().trim().optional(),
    school: z.string().trim().optional(),
    intake: saveIntakeSchema.optional(),
  })
  .refine((data) => data.grade !== GradeLevel.OTHER || !!data.gradeOther, {
    path: ['gradeOther'],
    message: 'Please enter the grade',
  });

export const assignTeacherSchema = z.object({
  teacherId: z.string().min(1, 'Teacher is required'),
  subject: z.string().trim().min(1, 'Subject is required').optional(),
  meetLink: safeMeetingLinkSchema.optional(),
});

export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
export type CreateAdminStudentInput = z.infer<typeof createAdminStudentSchema>;
export type ListStudentsQueryInput = z.infer<typeof listStudentsQuerySchema>;
