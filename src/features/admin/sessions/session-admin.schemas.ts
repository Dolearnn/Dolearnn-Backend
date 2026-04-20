import { z } from 'zod';

export const updateMeetingLinkSchema = z.object({
  meetLink: z.string().trim().url('Valid meeting link is required'),
});

export type UpdateMeetingLinkInput = z.infer<typeof updateMeetingLinkSchema>;
