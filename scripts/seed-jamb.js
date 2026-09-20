/*
 * Seeds the JAMB exam, its subjects/topics and the starter question bank.
 *
 * Safe to run repeatedly: exams, subjects and topics are upserted by slug, and
 * questions carry a stable `sourceKey` so existing ones are skipped.
 *
 *   node scripts/seed-jamb.js            # questions go live immediately
 *   node scripts/seed-jamb.js --draft    # import as DRAFT, publish after review
 *
 * Requires prisma/quiz-tables.sql to have been applied first.
 */
require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient, QuestionStatus } = require('@prisma/client');
const { exam, subjects } = require('./data/jamb');

const prisma = new PrismaClient();
const OPTION_IDS = ['A', 'B', 'C', 'D'];

function stableKey(subjectSlug, text) {
  const hash = crypto.createHash('sha1').update(text).digest('hex').slice(0, 12);
  return `jamb-${subjectSlug}-${hash}`;
}

async function main() {
  const status = process.argv.includes('--draft')
    ? QuestionStatus.DRAFT
    : QuestionStatus.PUBLISHED;

  const examRow = await prisma.exam.upsert({
    where: { slug: exam.slug },
    update: { name: exam.name, description: exam.description, sortOrder: exam.sortOrder },
    create: exam,
  });

  let received = 0;
  let inserted = 0;

  for (const subject of subjects) {
    const subjectRow = await prisma.subject.upsert({
      where: { slug: subject.slug },
      update: { name: subject.name, sortOrder: subject.sortOrder },
      create: { slug: subject.slug, name: subject.name, sortOrder: subject.sortOrder },
    });

    const topicIds = new Map();
    for (const [index, topic] of subject.topics.entries()) {
      const topicRow = await prisma.topic.upsert({
        where: { subjectId_slug: { subjectId: subjectRow.id, slug: topic.slug } },
        update: { name: topic.name, sortOrder: index },
        create: { subjectId: subjectRow.id, slug: topic.slug, name: topic.name, sortOrder: index },
      });
      topicIds.set(topic.slug, topicRow.id);
    }

    const data = subject.questions.map(([topicSlug, text, options, correctIndex, explanation]) => {
      const topicId = topicIds.get(topicSlug);
      if (!topicId) throw new Error(`Unknown topic "${topicSlug}" in ${subject.slug}`);
      if (options.length !== OPTION_IDS.length) throw new Error(`Expected 4 options: ${text}`);
      if (!(correctIndex >= 0 && correctIndex < options.length)) {
        throw new Error(`Bad correct index: ${text}`);
      }

      return {
        sourceKey: stableKey(subject.slug, text),
        examId: examRow.id,
        subjectId: subjectRow.id,
        topicId,
        text,
        options: options.map((optionText, i) => ({ id: OPTION_IDS[i], text: optionText })),
        correctOptionId: OPTION_IDS[correctIndex],
        explanation,
        status,
      };
    });

    const result = await prisma.question.createMany({ data, skipDuplicates: true });
    received += data.length;
    inserted += result.count;
    console.log(`  ${subject.name}: ${result.count} new / ${data.length - result.count} already present`);
  }

  console.log(`\nJAMB seed complete: ${inserted} inserted, ${received - inserted} skipped (${status}).`);
  console.log('Servers cache the catalog for up to 5 minutes, so new content can take that long to appear.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
