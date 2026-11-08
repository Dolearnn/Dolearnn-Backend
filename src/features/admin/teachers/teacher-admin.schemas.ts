import { DayOfWeek, TimeBlock } from '@prisma/client';
import { TeacherGender } from '@prisma/client';
import { z } from 'zod';
import { sessionPrice } from '../../../lib/pricing';

// A tutor's pay per session (stored as hourlyRate). It cannot exceed what the
// learner pays for the session.
const tutorPaySchema = z.coerce
  .number()
  .min(0, 'Pay per session cannot be negative')
  .refine((value) => value <= sessionPrice(), {
    message: 'Pay per session cannot be more than the session price',
  });

export const listTeachersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'TERMINATED']).optional(),
});

export const createTeacherSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required'),
  lastName: z.string().trim().min(2, 'Last name is required'),
  email: z.string().trim().email('Valid email is required'),
  timezone: z.string().trim().min(1, 'Timezone is required').default('Africa/Lagos'),
  phoneCountry: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  gender: z.nativeEnum(TeacherGender),
  bio: z.string().trim().optional(),
  subjects: z.array(z.string().trim().min(1)).min(1, 'Add at least one subject'),
  qualifications: z.array(z.string().trim().min(1)).default([]),
  // Left empty or 0: the default tutor share (50% of the session price).
  hourlyRate: tutorPaySchema.optional(),
  // Optional: normally the tutor sets their own password from the invite email.
  defaultPassword: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(8, 'Starting password must be at least 8 characters').optional(),
  ),
});

export const updateTeacherRateSchema = z.object({
  hourlyRate: tutorPaySchema,
});

export const updateTeacherSubjectsSchema = z.object({
  subjects: z.array(z.string().trim().min(1).max(60)).min(1, 'Choose at least one subject').max(30),
});

export const terminateTeacherSchema = z.object({
  reason: z.string().trim().min(5, 'Termination reason is required'),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type ListTeachersQueryInput = z.infer<typeof listTeachersQuerySchema>;
export type UpdateTeacherRateInput = z.infer<typeof updateTeacherRateSchema>;
export type TerminateTeacherInput = z.infer<typeof terminateTeacherSchema>;

export const teacherHoursSchema = z.object({
  hours: z.array(z.object({ day: z.nativeEnum(DayOfWeek), time: z.nativeEnum(TimeBlock) })).max(21),
});
