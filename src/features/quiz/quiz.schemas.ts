import { QuizMode } from '@prisma/client';
import { z } from 'zod';

export const MAX_QUESTIONS_PER_ATTEMPT = 60;

export const startAttemptSchema = z.object({
  subjectId: z.string().trim().min(1, 'Subject is required'),
  examId: z.string().trim().min(1).optional(),
  topicIds: z.array(z.string().trim().min(1)).max(50).optional(),
  count: z.coerce.number().int().min(5).max(MAX_QUESTIONS_PER_ATTEMPT).default(20),
  mode: z.nativeEnum(QuizMode).default(QuizMode.PRACTICE),
  // A parent quizzing on behalf of one of their children.
  studentId: z.string().trim().min(1).optional(),
});

export const submitAttemptSchema = z.object({
  // { "<questionId>": "<optionId>" }. Unanswered questions are simply omitted.
  answers: z
    .record(z.string().min(1), z.string().trim().min(1).max(20))
    .refine((answers) => Object.keys(answers).length <= MAX_QUESTIONS_PER_ATTEMPT, {
      message: 'Too many answers',
    }),
});

export const listAttemptsQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const weakTopicsQuerySchema = z.object({
  studentId: z.string().trim().min(1).optional(),
});

export const progressQuerySchema = z.object({
  studentId: z.string().trim().min(1).optional(),
});

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type ProgressQuery = z.infer<typeof progressQuerySchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
export type ListAttemptsQuery = z.infer<typeof listAttemptsQuerySchema>;
export type WeakTopicsQuery = z.infer<typeof weakTopicsQuerySchema>;
