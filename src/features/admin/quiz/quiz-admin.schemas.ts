import { QuestionDifficulty, QuestionStatus } from '@prisma/client';
import { z } from 'zod';

export const MAX_IMPORT_ROWS = 100;

const slug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes');

export const createExamSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const updateExamSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).nullable(),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
    isActive: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export const createSubjectSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(120),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const updateSubjectSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
    isActive: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export const createTopicSchema = z.object({
  subjectId: z.string().trim().min(1),
  slug,
  name: z.string().trim().min(2).max(120),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

const optionSchema = z.object({
  id: z.string().trim().min(1).max(10),
  text: z.string().trim().min(1).max(1000),
});

const optionsSchema = z
  .array(optionSchema)
  .min(2)
  .max(6)
  .refine(
    (options) => new Set(options.map((option) => option.id)).size === options.length,
    'Option ids must be unique',
  );

// One row of a bulk import. Rows are validated individually so a single bad
// row does not reject the other 99.
export const importQuestionRowSchema = z
  .object({
    // Re-importing the same file is safe: rows with a known sourceKey are skipped.
    sourceKey: z.string().trim().min(1).max(200).optional(),
    examSlug: slug.optional(),
    subjectSlug: slug,
    topicSlug: slug,
    year: z.number().int().min(1960).max(2100).optional(),
    text: z.string().trim().min(5).max(4000),
    imageUrl: z.string().trim().url().max(1000).optional(),
    options: optionsSchema,
    correctOptionId: z.string().trim().min(1).max(10),
    explanation: z.string().trim().max(4000).optional(),
    difficulty: z.nativeEnum(QuestionDifficulty).default(QuestionDifficulty.MEDIUM),
    status: z.nativeEnum(QuestionStatus).default(QuestionStatus.DRAFT),
  })
  .refine(
    (row) => row.options.some((option) => option.id === row.correctOptionId),
    { path: ['correctOptionId'], message: 'correctOptionId must match one of the options' },
  );

export const importQuestionsSchema = z.object({
  questions: z.array(z.unknown()).min(1).max(MAX_IMPORT_ROWS),
});

export const updateQuestionSchema = z
  .object({
    text: z.string().trim().min(5).max(4000),
    imageUrl: z.string().trim().url().max(1000).nullable(),
    options: optionsSchema,
    correctOptionId: z.string().trim().min(1).max(10),
    explanation: z.string().trim().max(4000).nullable(),
    difficulty: z.nativeEnum(QuestionDifficulty),
    status: z.nativeEnum(QuestionStatus),
    year: z.number().int().min(1960).max(2100).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export const setQuestionStatusSchema = z.object({
  questionIds: z.array(z.string().trim().min(1)).min(1).max(500),
  status: z.nativeEnum(QuestionStatus),
});

export const listQuestionsQuerySchema = z.object({
  subjectId: z.string().trim().min(1).optional(),
  topicId: z.string().trim().min(1).optional(),
  examId: z.string().trim().min(1).optional(),
  status: z.nativeEnum(QuestionStatus).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type ImportQuestionRow = z.infer<typeof importQuestionRowSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type SetQuestionStatusInput = z.infer<typeof setQuestionStatusSchema>;
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
