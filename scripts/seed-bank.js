/*
 * Seeds the shared question bank: every exam in scripts/data/bank/exams.js and
 * every subject file in scripts/data/bank/subjects/.
 *
 * A subject file looks like:
 *   module.exports = {
 *     slug: 'economics', name: 'Economics', sortOrder: 10,
 *     exams: ['waec', 'neco', 'jamb', 'post-utme'],   // the exams these questions suit
 *     topics: [{ slug: 'demand-supply', name: 'Demand and Supply' }, ...],
 *     questions: [[topicSlug, text, [A, B, C, D], correctIndex, explanation], ...],
 *   };
 * Several files may add to the same subject (e.g. SAT Mathematics and IGCSE
 * Mathematics both use slug 'mathematics'). Each question is added once per
 * listed exam. Safe to re-run: questions carry a stable sourceKey.
 *
 *   node scripts/seed-bank.js            # questions go live immediately
 *   node scripts/seed-bank.js --draft    # import as DRAFT, publish after review
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient, QuestionStatus } = require('@prisma/client');
const exams = require('./data/bank/exams');
const { OPTION_IDS, shuffleRow, stableKey, assertValidRows } = require('./lib/question-rows');

const prisma = new PrismaClient();
const SUBJECTS_DIR = path.join(__dirname, 'data', 'bank', 'subjects');

function loadSubjectFiles() {
  return fs
    .readdirSync(SUBJECTS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort()
    // A file holds one subject, or an array of them for a batch across subjects.
    .flatMap((file) => [require(path.join(SUBJECTS_DIR, file))].flat().map((subject) => ({ file, ...subject })));
}

async function main() {
  const status = process.argv.includes('--draft') ? QuestionStatus.DRAFT : QuestionStatus.PUBLISHED;
  const files = loadSubjectFiles();
  const examSlugs = new Set(exams.map((exam) => exam.slug));

  // Validate everything before touching the database.
  for (const subject of files) {
    for (const slug of subject.exams) {
      if (!examSlugs.has(slug)) throw new Error(`${subject.file}: unknown exam "${slug}"`);
    }
    assertValidRows(subject.slug, subject.questions, new Set(subject.topics.map((t) => t.slug)));
  }

  const examIds = new Map();
  for (const exam of exams) {
    const row = await prisma.exam.upsert({
      where: { slug: exam.slug },
      update: {},
      create: exam,
    });
    examIds.set(exam.slug, row.id);
  }

  let inserted = 0;
  let received = 0;
  for (const subject of files) {
    const subjectRow = await prisma.subject.upsert({
      where: { slug: subject.slug },
      update: {},
      create: { slug: subject.slug, name: subject.name, sortOrder: subject.sortOrder },
    });

    const topicIds = new Map();
    const existingTopics = await prisma.topic.count({ where: { subjectId: subjectRow.id } });
    for (const [index, topic] of subject.topics.entries()) {
      const topicRow = await prisma.topic.upsert({
        where: { subjectId_slug: { subjectId: subjectRow.id, slug: topic.slug } },
        update: {},
        create: { subjectId: subjectRow.id, slug: topic.slug, name: topic.name, sortOrder: existingTopics + index },
      });
      topicIds.set(topic.slug, topicRow.id);
    }

    // Skip a question for an exam that already has one with the same wording in
    // this subject (e.g. from the original JAMB seed), so learners never see twins.
    const existing = await prisma.question.findMany({
      where: { subjectId: subjectRow.id, examId: { in: subject.exams.map((slug) => examIds.get(slug)) } },
      select: { examId: true, text: true, sourceKey: true },
    });
    const takenText = new Set(
      existing
        .filter((row) => !row.sourceKey?.startsWith('bank-'))
        .map((row) => `${row.examId}|${row.text.trim()}`),
    );

    const rows = subject.questions.map(shuffleRow);
    const data = subject.exams.flatMap((examSlug) =>
      rows
        .filter(([, text]) => !takenText.has(`${examIds.get(examSlug)}|${text.trim()}`))
        .map(([topicSlug, text, options, correctIndex, explanation]) => ({
        sourceKey: stableKey(`bank-${examSlug}`, subject.slug, text),
        examId: examIds.get(examSlug),
        subjectId: subjectRow.id,
        topicId: topicIds.get(topicSlug),
        text,
        options: options.map((optionText, i) => ({ id: OPTION_IDS[i], text: optionText })),
        correctOptionId: OPTION_IDS[correctIndex],
        explanation,
        status,
      })),
    );
    const skippedTwins = rows.length * subject.exams.length - data.length;

    const result = await prisma.question.createMany({ data, skipDuplicates: true });
    inserted += result.count;
    received += data.length;
    console.log(
      `  ${subject.file} -> ${subject.name} [${subject.exams.join(', ')}]: ${result.count} new / ${data.length - result.count} already present` +
        (skippedTwins ? ` / ${skippedTwins} skipped (same wording already in that exam)` : ''),
    );
  }

  console.log(`\nQuestion bank seed complete: ${inserted} inserted, ${received - inserted} skipped (${status}).`);
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
