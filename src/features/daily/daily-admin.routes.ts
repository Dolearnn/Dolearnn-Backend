import { randomUUID } from 'crypto';
import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { AppError, asyncHandler } from '../../lib/http';
import { requireAuth, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { PLAN } from './daily.service';

/*
 * Admin tools for the Daily's question pool: see how many days are left,
 * and add, correct or remove questions without touching any code.
 */
const OPTION_IDS = ['A', 'B', 'C', 'D'];
const categorySchema = z.enum(['english', 'maths', 'history']);

const listSchema = z.object({
  category: categorySchema.optional(),
  search: z.string().trim().max(100).optional(),
  id: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

const questionSchema = z
  .object({
    category: categorySchema,
    text: z.string().trim().min(5, 'Write the question').max(500),
    options: z.array(z.string().trim().min(1, 'Fill in all four options').max(200)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(3, 'Add a short explanation').max(500),
  })
  .refine((input) => new Set(input.options.map((option) => option.toLowerCase())).size === 4, {
    message: 'The four options must all be different',
    path: ['options'],
  });

function stored(input: z.infer<typeof questionSchema>) {
  return {
    category: input.category,
    text: input.text,
    options: input.options.map((text, index) => ({ id: OPTION_IDS[index], text })),
    correctOptionId: OPTION_IDS[input.correctIndex],
    explanation: input.explanation,
  };
}

async function poolSummary() {
  const [totals, unused] = await Promise.all([
    prisma.dailyQuestion.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.dailyQuestion.groupBy({ by: ['category'], where: { usedOn: null }, _count: { _all: true } }),
  ]);
  const count = (rows: typeof totals, category: string) => rows.find((row) => row.category === category)?._count._all ?? 0;
  const categories = Object.keys(PLAN).map((category) => ({
    category,
    total: count(totals, category),
    unused: count(unused, category),
    perDay: PLAN[category as keyof typeof PLAN],
  }));
  return {
    categories,
    // The category that runs out first decides when questions start repeating.
    daysLeft: Math.min(...categories.map((item) => Math.floor(item.unused / item.perDay))),
  };
}

export const dailyAdminRoutes = Router();

dailyAdminRoutes.use(requireAuth, requireRole(Role.ADMIN));

dailyAdminRoutes.get(
  '/pool',
  asyncHandler(async (req, res) => {
    const { category, search, id, page, pageSize } = listSchema.parse(req.query);
    const where: Prisma.DailyQuestionWhereInput = {
      ...(category ? { category } : {}),
      ...(search ? { text: { contains: search, mode: 'insensitive' } } : {}),
      ...(id ? { id } : {}),
    };
    const [summary, total, questions] = await Promise.all([
      poolSummary(),
      prisma.dailyQuestion.count({ where }),
      prisma.dailyQuestion.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json({ summary, total, page, pageSize, questions });
  }),
);

// How many people took each of the last two weeks' quizzes, newest first.
dailyAdminRoutes.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const quizzes = await prisma.dailyQuiz.findMany({
      orderBy: { day: 'desc' },
      take: 14,
      select: { id: true, day: true, number: true },
    });
    const entries = await prisma.dailyEntry.findMany({
      where: { dailyQuizId: { in: quizzes.map((quiz) => quiz.id) } },
      select: { dailyQuizId: true, userId: true, finishedAt: true, correctCount: true },
    });

    const days = quizzes.map((quiz) => {
      const all = entries.filter((entry) => entry.dailyQuizId === quiz.id);
      const finished = all.filter((entry) => entry.finishedAt);
      const members = finished.filter((entry) => entry.userId).length;
      return {
        day: quiz.day,
        number: quiz.number,
        played: finished.length,
        members,
        guests: finished.length - members,
        // Opened the quiz but never finished it.
        dropped: all.length - finished.length,
        averageScore: finished.length
          ? Math.round((finished.reduce((sum, entry) => sum + entry.correctCount, 0) / finished.length) * 10) / 10
          : null,
      };
    });
    res.json({ days });
  }),
);

dailyAdminRoutes.post(
  '/questions',
  asyncHandler(async (req, res) => {
    const input = questionSchema.parse(req.body);
    const question = await prisma.dailyQuestion.create({
      data: { ...stored(input), sourceKey: `daily-admin-${randomUUID()}` },
    });
    res.status(201).json({ question });
  }),
);

dailyAdminRoutes.put(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const input = questionSchema.parse(req.body);
    const id = String(req.params.id);
    const exists = await prisma.dailyQuestion.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new AppError(404, 'Question not found');
    res.json({ question: await prisma.dailyQuestion.update({ where: { id }, data: stored(input) }) });
  }),
);

dailyAdminRoutes.delete(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const question = await prisma.dailyQuestion.findUnique({ where: { id }, select: { usedOn: true } });
    if (!question) throw new AppError(404, 'Question not found');
    // Past quizzes and their results still point at used questions.
    if (question.usedOn) throw new AppError(409, 'This question has already been used. Correct it instead of removing it.');
    await prisma.dailyQuestion.delete({ where: { id } });
    res.status(204).send();
  }),
);
