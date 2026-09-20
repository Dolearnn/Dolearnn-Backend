import { Prisma } from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import { invalidateQuizCaches } from '../../quiz/quiz.cache';
import {
  importQuestionRowSchema,
  type CreateExamInput,
  type CreateSubjectInput,
  type CreateTopicInput,
  type ListQuestionsQuery,
  type SetQuestionStatusInput,
  type UpdateExamInput,
  type UpdateQuestionInput,
  type UpdateSubjectInput,
} from './quiz-admin.schemas';

// Turns "that slug already exists" into a 409 instead of a 500.
async function withUniqueCheck<T>(work: () => Promise<T>, message: string) {
  try {
    return await work();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(409, message);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Exams, subjects, topics
// ---------------------------------------------------------------------------

export async function getQuizOverview() {
  const [exams, subjects, counts] = await Promise.all([
    prisma.exam.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.subject.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { topics: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    }),
    prisma.question.groupBy({
      by: ['subjectId', 'status'],
      _count: { _all: true },
    }),
  ]);

  return {
    exams,
    subjects,
    questionCounts: counts.map((row) => ({
      subjectId: row.subjectId,
      status: row.status,
      count: row._count._all,
    })),
  };
}

export async function createExam(input: CreateExamInput) {
  const exam = await withUniqueCheck(
    () => prisma.exam.create({ data: input }),
    'An exam with this slug already exists',
  );
  invalidateQuizCaches();
  return exam;
}

export async function updateExam(examId: string, input: UpdateExamInput) {
  const exam = await prisma.exam
    .update({ where: { id: examId }, data: input })
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError(404, 'Exam not found');
      }
      throw error;
    });
  invalidateQuizCaches();
  return exam;
}

export async function createSubject(input: CreateSubjectInput) {
  const subject = await withUniqueCheck(
    () => prisma.subject.create({ data: input }),
    'A subject with this slug already exists',
  );
  invalidateQuizCaches();
  return subject;
}

export async function updateSubject(subjectId: string, input: UpdateSubjectInput) {
  const subject = await prisma.subject
    .update({ where: { id: subjectId }, data: input })
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError(404, 'Subject not found');
      }
      throw error;
    });
  invalidateQuizCaches();
  return subject;
}

export async function createTopic(input: CreateTopicInput) {
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true },
  });
  if (!subject) {
    throw new AppError(404, 'Subject not found');
  }

  const topic = await withUniqueCheck(
    () => prisma.topic.create({ data: input }),
    'This subject already has a topic with this slug',
  );
  invalidateQuizCaches();
  return topic;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function importQuestions(rows: unknown[]) {
  const [exams, subjects] = await Promise.all([
    prisma.exam.findMany({ select: { id: true, slug: true } }),
    prisma.subject.findMany({
      select: { id: true, slug: true, topics: { select: { id: true, slug: true } } },
    }),
  ]);

  const examIdBySlug = new Map(exams.map((exam) => [exam.slug, exam.id]));
  const subjectBySlug = new Map(
    subjects.map((subject) => [
      subject.slug,
      {
        id: subject.id,
        topicIdBySlug: new Map(subject.topics.map((topic) => [topic.slug, topic.id])),
      },
    ]),
  );

  const errors: { index: number; message: string }[] = [];
  const data: Prisma.QuestionCreateManyInput[] = [];

  rows.forEach((raw, index) => {
    const parsed = importQuestionRowSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push({
        index,
        message: `${issue.path.join('.') || 'row'}: ${issue.message}`,
      });
      return;
    }

    const row = parsed.data;
    const subject = subjectBySlug.get(row.subjectSlug);
    const topicId = subject?.topicIdBySlug.get(row.topicSlug);
    const examId = row.examSlug ? examIdBySlug.get(row.examSlug) : null;

    if (!subject) {
      errors.push({ index, message: `Unknown subject "${row.subjectSlug}"` });
      return;
    }
    if (!topicId) {
      errors.push({
        index,
        message: `Unknown topic "${row.topicSlug}" for subject "${row.subjectSlug}"`,
      });
      return;
    }
    if (row.examSlug && !examId) {
      errors.push({ index, message: `Unknown exam "${row.examSlug}"` });
      return;
    }

    data.push({
      sourceKey: row.sourceKey ?? null,
      examId: examId ?? null,
      subjectId: subject.id,
      topicId,
      year: row.year ?? null,
      text: row.text,
      imageUrl: row.imageUrl ?? null,
      options: row.options,
      correctOptionId: row.correctOptionId,
      explanation: row.explanation ?? null,
      difficulty: row.difficulty,
      status: row.status,
    });
  });

  const { count: inserted } = data.length
    ? await prisma.question.createMany({ data, skipDuplicates: true })
    : { count: 0 };

  if (inserted > 0) invalidateQuizCaches();

  return {
    received: rows.length,
    inserted,
    skippedDuplicates: data.length - inserted,
    errors,
  };
}

export async function updateQuestion(questionId: string, input: UpdateQuestionInput) {
  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { options: true, correctOptionId: true },
  });
  if (!existing) {
    throw new AppError(404, 'Question not found');
  }

  const options = (input.options ?? existing.options) as { id: string }[];
  const correctOptionId = input.correctOptionId ?? existing.correctOptionId;
  if (!options.some((option) => option.id === correctOptionId)) {
    throw new AppError(400, 'correctOptionId must match one of the options');
  }

  const question = await prisma.question.update({
    where: { id: questionId },
    data: input,
  });
  invalidateQuizCaches();
  return question;
}

export async function setQuestionStatus(input: SetQuestionStatusInput) {
  const { count } = await prisma.question.updateMany({
    where: { id: { in: input.questionIds } },
    data: { status: input.status },
  });
  invalidateQuizCaches();
  return { updated: count };
}

export async function listQuestions(query: ListQuestionsQuery) {
  const rows = await prisma.question.findMany({
    where: {
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.topicId ? { topicId: query.topicId } : {}),
      ...(query.examId ? { examId: query.examId } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > query.limit;
  const questions = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    questions,
    nextCursor: hasMore ? questions[questions.length - 1].id : null,
  };
}
