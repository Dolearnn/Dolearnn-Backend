import {
  CurrentLevel,
  DayOfWeek,
  GenderPreference,
  GradeLevel,
  LearningGoal,
  TimeBlock,
} from '@prisma/client';
import { z } from 'zod';

export const createStudentSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Student name is required'),
    age: z.coerce.number().int().min(3).max(25),
    grade: z.nativeEnum(GradeLevel),
    gradeOther: z.string().trim().optional(),
    school: z.string().trim().optional(),
  })
  .refine((data) => data.grade !== GradeLevel.OTHER || !!data.gradeOther, {
    path: ['gradeOther'],
    message: 'Please enter the grade',
  });

export const intakeScheduleSchema = z.object({
  day: z.nativeEnum(DayOfWeek),
  time: z.nativeEnum(TimeBlock),
});

export const saveIntakeSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
  subjects: z.array(z.string().trim().min(1)).min(1, 'Pick at least one subject'),
  subjectOther: z.string().trim().optional(),
  learningGoal: z.nativeEnum(LearningGoal),
  currentLevel: z.nativeEnum(CurrentLevel),
  specificTopics: z.string().trim().optional(),
  teacherGenderPref: z.nativeEnum(GenderPreference),
  specialNotes: z.string().trim().optional(),
  timezone: z.string().trim().min(1).default('UTC'),
  sessionsPerWeek: z.string().trim().min(1),
  budget: z.string().trim().min(1, 'Budget is required'),
  schedule: z
    .array(intakeScheduleSchema)
    .min(1, 'Pick at least one available day'),
});

export const deactivateStudentSchema = z.object({
  reason: z.string().trim().min(5, 'Reason is required'),
});

export const requestCancellationSchema = z.object({
  reason: z.string().trim().min(5, 'Cancellation reason is required'),
});

export const declineSessionProposalSchema = z
  .object({
    reason: z.string().trim().min(5, 'Decline reason is required'),
    preferredAlternative: intakeScheduleSchema.optional(),
    preferredAlternativeExactTime: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm time format')
      .optional(),
  })
  .refine(
    (data) =>
      !data.preferredAlternativeExactTime || !!data.preferredAlternative,
    {
      path: ['preferredAlternativeExactTime'],
      message: 'Choose a saved availability slot before adding an exact time',
    },
  );

export const saveGoalSchema = z.object({
  title: z.string().trim().min(2, 'Goal title is required'),
  targetDate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: 'Target date must be valid',
    }),
  progress: z.coerce.number().int().min(0).max(100).optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof createStudentSchema>;
export type SaveIntakeInput = z.infer<typeof saveIntakeSchema>;
export type DeactivateStudentInput = z.infer<typeof deactivateStudentSchema>;
export type RequestCancellationInput = z.infer<typeof requestCancellationSchema>;
export type DeclineSessionProposalInput = z.infer<typeof declineSessionProposalSchema>;
export type SaveGoalInput = z.infer<typeof saveGoalSchema>;
