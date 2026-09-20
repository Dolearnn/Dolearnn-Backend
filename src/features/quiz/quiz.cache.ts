import { QuestionStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createTtlCache } from '../../lib/ttl-cache';

const CATALOG_TTL_MS = 5 * 60 * 1000;
const POOL_TTL_MS = 5 * 60 * 1000;
// Upper bound on how many question ids we hold in memory per exam/subject.
const MAX_POOL_SIZE = 10_000;

export type CatalogTopic = { id: string; slug: string; name: string };

export type CatalogSubject = {
  id: string;
  slug: string;
  name: string;
  topics: CatalogTopic[];
};

export type CatalogExam = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type CatalogAvailability = {
  examId: string | null;
  subjectId: string;
  questionCount: number;
};

export type Catalog = {
  exams: CatalogExam[];
  subjects: CatalogSubject[];
  // How many published questions exist per exam/subject, so the UI can hide
  // combinations that have nothing to practise yet.
  availability: CatalogAvailability[];
};

type CatalogIndex = {
  catalog: Catalog;
  examIds: Set<string>;
  subjectsById: Map<string, CatalogSubject>;
};

export type PoolQuestion = { id: string; topicId: string };

const catalogCache = createTtlCache<CatalogIndex>(CATALOG_TTL_MS, 1);
const poolCache = createTtlCache<PoolQuestion[]>(POOL_TTL_MS, 150);

async function loadCatalogIndex(): Promise<CatalogIndex> {
  const [exams, subjects, counts] = await Promise.all([
    prisma.exam.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, description: true },
    }),
    prisma.subject.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        topics: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: { id: true, slug: true, name: true },
        },
      },
    }),
    prisma.question.groupBy({
      by: ['examId', 'subjectId'],
      where: { status: QuestionStatus.PUBLISHED },
      _count: { _all: true },
    }),
  ]);

  const availability = counts.map((row) => ({
    examId: row.examId,
    subjectId: row.subjectId,
    questionCount: row._count._all,
  }));

  return {
    catalog: { exams, subjects, availability },
    examIds: new Set(exams.map((exam) => exam.id)),
    subjectsById: new Map(subjects.map((subject) => [subject.id, subject])),
  };
}

export function getCatalogIndex() {
  return catalogCache.get('catalog', loadCatalogIndex);
}

/**
 * Ids (and topics) of every published question for an exam/subject. Picking a
 * random sample from this in memory is far cheaper than `ORDER BY random()`
 * against the question table on every quiz start.
 */
export function getQuestionPool(examId: string | null, subjectId: string) {
  return poolCache.get(`${examId ?? 'any'}:${subjectId}`, () =>
    prisma.question.findMany({
      where: {
        subjectId,
        status: QuestionStatus.PUBLISHED,
        ...(examId ? { examId } : {}),
      },
      select: { id: true, topicId: true },
      take: MAX_POOL_SIZE,
    }),
  );
}

export function invalidateQuizCaches() {
  catalogCache.clear();
  poolCache.clear();
}
