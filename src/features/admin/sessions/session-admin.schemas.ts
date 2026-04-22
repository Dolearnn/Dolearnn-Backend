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
  durationMins: z.coerce.number().int().default(60).refine((value) => value === 60, {
    message: 'Sessions are 60 minutes',
  }),
  meetLink: z
    .string()
    .trim()
    .url('Valid meeting link is required')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type CreateAdminSessionInput = z.infer<typeof createAdminSessionSchema>;
