import { z } from 'zod';

export const assignTeacherSchema = z.object({
  teacherId: z.string().min(1, 'Teacher is required'),
  subject: z.string().trim().min(1, 'Subject is required').optional(),
});

export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
