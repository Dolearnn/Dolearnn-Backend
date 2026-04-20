import { z } from 'zod';

export const assignTeacherSchema = z.object({
  teacherId: z.string().min(1, 'Teacher is required'),
});

export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
