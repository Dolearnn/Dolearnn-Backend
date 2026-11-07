import { QuizMode } from '@prisma/client';
import { z } from 'zod';

// Per subject. A mixed exam may ask up to this many questions per subject it covers.
export const MAX_QUESTIONS_PER_ATTEMPT = 60;
export const MAX_SUBJECTS_PER_ATTEMPT = 6;

export const startAttemptSchema = z.object({
  // One subject, or several in `subjectIds` for a mixed exam (e.g. JAMB: English
  // plus three subjects). Questions are shared evenly between the subjects.
  subjectId: z.string().trim().min(1).optional(),
  subjectIds: z.array(z.string().trim().min(1)).min(1).max(MAX_SUBJECTS_PER_ATTEMPT).optional(),
  examId: z.string().trim().min(1).optional(),
  // Topics from any of the chosen subjects. A subject with no topics picked
  // contributes questions from all of its topics.
  topicIds: z.array(z.string().trim().min(1)).max(100).optional(),
  count: z.coerce.number().int().min(5).max(MAX_QUESTIONS_PER_ATTEMPT * MAX_SUBJECTS_PER_ATTEMPT).default(20),
  mode: z.nativeEnum(QuizMode).default(QuizMode.PRACTICE),
  // A parent quizzing on behalf of one of their children.
  studentId: z.string().trim().min(1).optional(),
  // Re-test the weak topics of this earlier (submitted) attempt. Subject,
  // exam, learner and topics then come from that attempt.
  retakeOfAttemptId: z.string().trim().min(1).optional(),
})
  .refine((input) => input.subjectId || input.subjectIds?.length || input.retakeOfAttemptId, {
    message: 'Subject is required',
    path: ['subjectId'],
  })
  .refine(
    (input) =>
      input.count <= MAX_QUESTIONS_PER_ATTEMPT * Math.max(1, subjectList(input).length),
    { message: `At most ${MAX_QUESTIONS_PER_ATTEMPT} questions per subject`, path: ['count'] },
  );

/** The subjects a start request covers, first subject first, without repeats. */
export function subjectList(input: { subjectId?: string; subjectIds?: string[] }) {
  return [...new Set([...(input.subjectIds ?? []), ...(input.subjectId ? [input.subjectId] : [])])];
}

export const submitAttemptSchema = z.object({
  // { "<questionId>": "<optionId>" }. Unanswered questions are simply omitted.
  answers: z
    .record(z.string().min(1), z.string().trim().min(1).max(20))
    .refine((answers) => Object.keys(answers).length <= MAX_QUESTIONS_PER_ATTEMPT * MAX_SUBJECTS_PER_ATTEMPT, {
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

export const leaderboardPrivacySchema = z.object({
  hidden: z.boolean(),
  // A parent sets this for one of their children.
  studentId: z.string().trim().min(1).optional(),
});

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type ProgressQuery = z.infer<typeof progressQuerySchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
export type ListAttemptsQuery = z.infer<typeof listAttemptsQuerySchema>;
export type WeakTopicsQuery = z.infer<typeof weakTopicsQuerySchema>;
