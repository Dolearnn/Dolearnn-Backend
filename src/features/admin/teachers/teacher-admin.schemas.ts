import { TeacherGender } from '@prisma/client';
import { z } from 'zod';

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
  phoneCountry: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  gender: z.nativeEnum(TeacherGender),
  bio: z.string().trim().optional(),
  subjects: z.array(z.string().trim().min(1)).min(1, 'Add at least one subject'),
  qualifications: z.array(z.string().trim().min(1)).default([]),
  hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative'),
  defaultPassword: z.string().min(8, 'Default password must be at least 8 characters'),
});

export const updateTeacherRateSchema = z.object({
  hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative'),
});

export const terminateTeacherSchema = z.object({
  reason: z.string().trim().min(5, 'Termination reason is required'),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type ListTeachersQueryInput = z.infer<typeof listTeachersQuerySchema>;
export type UpdateTeacherRateInput = z.infer<typeof updateTeacherRateSchema>;
export type TerminateTeacherInput = z.infer<typeof terminateTeacherSchema>;
