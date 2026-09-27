import { z } from 'zod';

export const learnerStageSchema = z.enum([
  'SS2',
  'SS3',
  'RECENT_SCHOOL_LEAVER',
  'OTHER',
]);

export const guestBaselineSchema = z.object({
  score: z.number().int().min(0).max(100),
  correct: z.number().int().min(0).max(100),
  total: z.number().int().min(1).max(100),
  weakTopics: z.array(z.string().trim().min(1).max(100)).max(20),
  completedAt: z.string().datetime().optional(),
});

export const updateLearnerProfileSchema = z.object({
  stage: learnerStageSchema,
  externalExams: z
    .array(z.string().trim().min(2).max(100))
    .min(1, 'Choose at least one external examination')
    .max(20),
  subjectIds: z.array(z.string().trim().min(1)).min(1, 'Choose at least one subject').max(20),
  examDate: z.string().date().nullable().optional(),
  guestBaseline: guestBaselineSchema.nullable().optional(),
});

export const guestBaselineOnlySchema = z.object({
  guestBaseline: guestBaselineSchema,
});

export type UpdateLearnerProfileInput = z.infer<typeof updateLearnerProfileSchema>;
export type GuestBaselineInput = z.infer<typeof guestBaselineOnlySchema>;
