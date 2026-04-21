import { TeacherGender, TimeBlock } from '@prisma/client';
import { Performance } from '@prisma/client';
import { z } from 'zod';

export const createSessionProposalSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  subject: z.string().trim().min(1, 'Subject is required'),
  startsAt: z.coerce.date(),
  durationMins: z.coerce.number().int().default(60).refine((value) => value === 60, {
    message: 'Sessions are 60 minutes',
  }),
  timeBlock: z.nativeEnum(TimeBlock),
  note: z.string().trim().optional(),
});

export const createSessionNoteSchema = z.object({
  covered: z.string().trim().min(2, 'Add what was covered'),
  performance: z.nativeEnum(Performance),
  rating: z.coerce.number().int().min(1).max(5),
  focusNext: z.string().trim().min(2, 'Add what to focus on next'),
  concerns: z.string().trim().optional(),
});

export const requestCancellationSchema = z.object({
  reason: z.string().trim().min(5, 'Cancellation reason is required'),
});

export const updatePayoutAccountSchema = z.object({
  bankName: z.string().trim().min(2, 'Bank name is required'),
  accountName: z.string().trim().min(2, 'Account name is required'),
  accountNumber: z.string().trim().min(5, 'Account number is required'),
});

export const updateTeacherProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').optional(),
  lastName: z.string().trim().min(1, 'Last name is required').optional(),
  bio: z.string().trim().max(1000).optional().or(z.literal('')),
  phoneCountry: z.string().trim().max(10).optional().or(z.literal('')),
  phoneNumber: z.string().trim().max(30).optional().or(z.literal('')),
  gender: z.nativeEnum(TeacherGender).nullable().optional(),
  subjects: z.array(z.string().trim().min(1)).max(30).optional(),
  qualifications: z.array(z.string().trim().min(1)).max(30).optional(),
});

export type CreateSessionProposalInput = z.infer<
  typeof createSessionProposalSchema
>;
export type CreateSessionNoteInput = z.infer<typeof createSessionNoteSchema>;
export type RequestCancellationInput = z.infer<typeof requestCancellationSchema>;
export type UpdatePayoutAccountInput = z.infer<
  typeof updatePayoutAccountSchema
>;
export type UpdateTeacherProfileInput = z.infer<
  typeof updateTeacherProfileSchema
>;
