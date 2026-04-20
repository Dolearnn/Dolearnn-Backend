import { PaymentGateway, PaymentPlan } from '@prisma/client';
import { z } from 'zod';

export const createPaymentSchema = z.object({
  parentId: z.string().min(1),
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
