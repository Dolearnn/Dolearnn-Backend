/*
 * Seeds the WAEC exam and its question bank (scripts/data/waec.js).
 *
 * Subjects and topics are shared with JAMB: existing ones are reused as they
 * are, missing ones are created. Safe to run repeatedly: questions carry a
 * stable `sourceKey`, so existing ones are skipped.
 *
 *   node scripts/seed-waec.js            # questions go live immediately
 *   node scripts/seed-waec.js --draft    # import as DRAFT, publish after review
 */
require('dotenv').config();
const { PrismaClient, QuestionStatus } = require('@prisma/client');
const { exam, subjects } = require('./data/waec');
const { OPTION_IDS, shuffleRow, stableKey, assertValidRows } = require('./lib/question-rows');

const prisma = new PrismaClient();

async function main() {
  const status = process.argv.includes('--draft')
    ? QuestionStatus.DRAFT
    : QuestionStatus.PUBLISHED;

  // Validate everything before touching the database.
  for (const subject of subjects) {
    assertValidRows(subject.slug, subject.questions, new Set(subject.topics.map((t) => t.slug)));
  }

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
      update: {},
      create: { slug: subject.slug, name: subject.name, sortOrder: subject.sortOrder },
    });

    const topicIds = new Map();
    for (const [index, topic] of subject.topics.entries()) {
      const topicRow = await prisma.topic.upsert({
        where: { subjectId_slug: { subjectId: subjectRow.id, slug: topic.slug } },
        update: {},
        create: { subjectId: subjectRow.id, slug: topic.slug, name: topic.name, sortOrder: index },
      });
      topicIds.set(topic.slug, topicRow.id);
    }

    const data = subject.questions.map(shuffleRow).map(([topicSlug, text, options, correctIndex, explanation]) => ({
      sourceKey: stableKey(exam.slug, subject.slug, text),
      examId: examRow.id,
      subjectId: subjectRow.id,
      topicId: topicIds.get(topicSlug),
      text,
      options: options.map((optionText, i) => ({ id: OPTION_IDS[i], text: optionText })),
      correctOptionId: OPTION_IDS[correctIndex],
      explanation,
      status,
    }));

    const result = await prisma.question.createMany({ data, skipDuplicates: true });
    received += data.length;
    inserted += result.count;
    console.log(`  ${subject.name}: ${result.count} new / ${data.length - result.count} already present`);
  }

  console.log(`\nWAEC seed complete: ${inserted} inserted, ${received - inserted} skipped (${status}).`);
  console.log('Servers cache the catalog for up to 5 minutes, so new content can take that long to appear.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
