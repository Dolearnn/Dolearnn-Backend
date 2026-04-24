import { z } from 'zod';

export const getAdminReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export type GetAdminReportQueryInput = z.infer<
  typeof getAdminReportQuerySchema
>;
