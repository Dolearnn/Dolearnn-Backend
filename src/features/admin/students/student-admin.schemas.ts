import { z } from 'zod';
import { GradeLevel } from '@prisma/client';
import { saveIntakeSchema } from '../../family/family.schemas';

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
  meetLink: z.string().trim().url('Valid meeting link is required').optional(),
});

export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
export type CreateAdminStudentInput = z.infer<typeof createAdminStudentSchema>;
