import { z } from 'zod';

export const updateMeetingLinkSchema = z.object({
  meetLink: z.string().trim().url('Valid meeting link is required'),
});

export type UpdateMeetingLinkInput = z.infer<typeof updateMeetingLinkSchema>;

export const createAdminSessionSchema = z.object({
  studentId: z.string().min(1),
  subject: z.string().trim().min(1, 'Subject is required'),
  startsAt: z
    .string()
    .datetime({ message: 'Start date must be an ISO datetime' }),
  durationMins: z.coerce.number().int().min(15).max(240).default(60),
  meetLink: z
    .string()
    .trim()
    .url('Valid meeting link is required')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type CreateAdminSessionInput = z.infer<typeof createAdminSessionSchema>;
