import { z } from 'zod';

export const createWaitlistEntrySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email is required'),
  phone: z.string().trim().min(7, 'WhatsApp number is required'),
});

export const createNewsletterLeadSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
});

export type CreateWaitlistEntryInput = z.infer<
  typeof createWaitlistEntrySchema
>;
export type CreateNewsletterLeadInput = z.infer<
  typeof createNewsletterLeadSchema
>;
