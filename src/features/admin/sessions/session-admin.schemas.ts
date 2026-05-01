import { z } from 'zod';
import { SessionStatus } from '@prisma/client';
import { safeMeetingLinkSchema } from '../../../lib/urls';

export const listAdminSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.nativeEnum(SessionStatus).optional(),
});

export const updateMeetingLinkSchema = z.object({
  meetLink: safeMeetingLinkSchema,
});

export type UpdateMeetingLinkInput = z.infer<typeof updateMeetingLinkSchema>;
export type ListAdminSessionsQueryInput = z.infer<
  typeof listAdminSessionsQuerySchema
>;

export const createAdminSessionSchema = z.object({
  studentId: z.string().min(1),
  subject: z.string().trim().min(1, 'Subject is required'),
  startsAt: z
    .string()
    .datetime({ message: 'Start date must be an ISO datetime' }),
  durationMins: z.coerce.number().int().default(60).refine((value) => value === 60, {
    message: 'Sessions are 60 minutes',
  }),
  meetLink: safeMeetingLinkSchema.optional().or(
    z.literal('').transform(() => undefined),
  ),
});

export type CreateAdminSessionInput = z.infer<typeof createAdminSessionSchema>;

export const scheduleBookingRequestSchema = z.object({
  meetLink: safeMeetingLinkSchema.optional().or(
    z.literal('').transform(() => undefined),
  ),
});

export type ScheduleBookingRequestInput = z.infer<
  typeof scheduleBookingRequestSchema
>;
