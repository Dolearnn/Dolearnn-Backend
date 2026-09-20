import { z } from 'zod';

export const MIN_ARENA_QUESTIONS = 5;
export const MAX_ARENA_QUESTIONS = 20;

export const createChallengeSchema = z.object({
  subjectId: z.string().trim().min(1, 'Subject is required'),
  examId: z.string().trim().min(1).optional(),
  count: z.coerce
    .number()
    .int()
    .min(MIN_ARENA_QUESTIONS)
    .max(MAX_ARENA_QUESTIONS)
    .default(10),
  // A parent playing on behalf of one of their children.
  studentId: z.string().trim().min(1).optional(),
});

export const joinChallengeSchema = z.object({
  studentId: z.string().trim().min(1).optional(),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type JoinChallengeInput = z.infer<typeof joinChallengeSchema>;
