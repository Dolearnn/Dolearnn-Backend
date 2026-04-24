import { PaymentGateway, PaymentPlan } from '@prisma/client';
import { z } from 'zod';

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

export const listLessonPackagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'EXHAUSTED', 'CANCELLED']).default('ALL'),
});

export const createPaymentSchema = z.object({
  parentId: z.string().min(1),
  studentId: z.string().min(1, 'Student is required'),
  subject: z.string().trim().min(1, 'Subject is required'),
  plan: z.nativeEnum(PaymentPlan),
  amount: z.coerce.number().positive(),
  gateway: z.nativeEnum(PaymentGateway),
  sessionsIncluded: z.coerce.number().int().positive(),
});

export const listPayoutsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const markPayoutPaidSchema = z.object({
  teacherId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type MarkPayoutPaidInput = z.infer<typeof markPayoutPaidSchema>;
export type ListPaymentsQueryInput = z.infer<typeof listPaymentsQuerySchema>;
export type ListLessonPackagesQueryInput = z.infer<
  typeof listLessonPackagesQuerySchema
>;
