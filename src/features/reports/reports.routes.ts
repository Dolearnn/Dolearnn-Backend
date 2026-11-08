import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { AppError, asyncHandler } from '../../lib/http';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { prisma } from '../../lib/prisma';

/*
 * Anyone answering a question can report it (wrong answer, typo, unclear...).
 * Reports wait for an admin; nothing changes on its own, so a few bad-faith
 * reports can never take a good question away.
 */
export const REPORT_REASONS = ['wrong_answer', 'typo', 'unclear', 'wrong_topic', 'other'] as const;

const kindSchema = z.enum(['bank', 'daily']);
const createSchema = z.object({
  kind: kindSchema,
  questionId: z.string().trim().min(1).max(64),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional(),
});
const resolveSchema = z.object({ kind: kindSchema, questionId: z.string().trim().min(1).max(64) });

type Stored = { text: string; options: unknown; correctOptionId: string };

function loadQuestions(kind: 'bank' | 'daily', ids: string[]): Promise<Array<Stored & { id: string }>> {
  const select = { id: true, text: true, options: true, correctOptionId: true } as const;
  return kind === 'bank'
    ? prisma.question.findMany({ where: { id: { in: ids } }, select })
    : prisma.dailyQuestion.findMany({ where: { id: { in: ids } }, select });
}

export const reportRoutes = Router();

reportRoutes.post(
  '/',
  rateLimit({ keyPrefix: 'question-report', windowMs: 15 * 60 * 1000, max: 30, message: 'Too many reports. Please try again later.' }),
  optionalAuth,
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const [question] = await loadQuestions(input.kind, [input.questionId]);
    if (!question) throw new AppError(404, 'Question not found');

    const userId = req.user?.id ?? null;
    const duplicate = userId
      ? await prisma.questionReport.findFirst({
          where: { kind: input.kind, questionId: input.questionId, userId, status: 'OPEN' },
          select: { id: true },
        })
      : null;
    if (!duplicate) {
      await prisma.questionReport.create({
        data: { kind: input.kind, questionId: input.questionId, userId, reason: input.reason, note: input.note || null },
      });
    }
    res.status(201).json({ ok: true });
  }),
);

// Admin: open reports, one row per question, most-reported first.
reportRoutes.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const open = await prisma.questionReport.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const grouped = new Map<string, typeof open>();
    for (const report of open) {
      const key = `${report.kind}:${report.questionId}`;
      grouped.set(key, [...(grouped.get(key) ?? []), report]);
    }
    const lookup = async (kind: 'bank' | 'daily') =>
      new Map((await loadQuestions(kind, open.filter((r) => r.kind === kind).map((r) => r.questionId))).map((q) => [q.id, q]));
    const [bank, daily] = await Promise.all([lookup('bank'), lookup('daily')]);

    const reports = [...grouped.values()]
      .map((list) => {
        const { kind, questionId, createdAt } = list[0];
        const question = (kind === 'bank' ? bank : daily).get(questionId);
        const options = (question?.options ?? []) as Array<{ id: string; text: string }>;
        return {
          kind,
          questionId,
          text: question?.text ?? 'This question no longer exists.',
          answer: options.find((option) => option.id === question?.correctOptionId)?.text ?? null,
          count: list.length,
          latestAt: createdAt,
          reasons: list.map((report) => ({ reason: report.reason, note: report.note })),
        };
      })
      .sort((a, b) => b.count - a.count);
    res.json({ reports });
  }),
);

reportRoutes.post(
  '/resolve',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { kind, questionId } = resolveSchema.parse(req.body);
    await prisma.questionReport.updateMany({
      where: { kind, questionId, status: 'OPEN' },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    res.json({ ok: true });
  }),
);
