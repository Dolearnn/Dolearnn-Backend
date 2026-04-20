import { z } from 'zod';

export const updateNotificationReadSchema = z.object({
  read: z.boolean(),
});
