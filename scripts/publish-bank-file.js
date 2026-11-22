/*
 * Publishes (or hides again) the questions that came from given question-bank
 * files, e.g. a draft batch once it has been checked. Only those files'
 * questions change; every other question is left alone.
 *
 *   node scripts/publish-bank-file.js batch-6-yoruba batch-6-irs              # DRAFT -> PUBLISHED
 *   node scripts/publish-bank-file.js batch-6-yoruba batch-6-irs --unpublish  # PUBLISHED -> DRAFT
 *
 * File names are those in scripts/data/bank/subjects/, with or without ".js".
 */
require('dotenv').config();
const path = require('path');
const { PrismaClient, QuestionStatus } = require('@prisma/client');
const { stableKey } = require('./lib/question-rows');

const SUBJECTS_DIR = path.join(__dirname, 'data', 'bank', 'subjects');

async function main() {
  const args = process.argv.slice(2);
  const unpublish = args.includes('--unpublish');
  const files = args.filter((arg) => !arg.startsWith('--')).map((name) => name.replace(/\.js$/, ''));
  if (files.length === 0) {
    console.error('Name at least one file, e.g. node scripts/publish-bank-file.js batch-6-yoruba');
    process.exit(1);
  }

  // The same keys seed-bank.js gave these questions, one per exam they were copied to.
  const sourceKeys = [];
  for (const file of files) {
    for (const subject of [require(path.join(SUBJECTS_DIR, `${file}.js`))].flat()) {
      for (const [, text] of subject.questions) {
        for (const examSlug of subject.exams) {
          sourceKeys.push(stableKey(`bank-${examSlug}`, subject.slug, text));
        }
      }
    }
  }

  const from = unpublish ? QuestionStatus.PUBLISHED : QuestionStatus.DRAFT;
  const to = unpublish ? QuestionStatus.DRAFT : QuestionStatus.PUBLISHED;
  const prisma = new PrismaClient();
  try {
    const result = await prisma.question.updateMany({
      where: { sourceKey: { in: sourceKeys }, status: from },
      data: { status: to },
    });
    console.log(`${files.join(', ')}: ${result.count} of ${sourceKeys.length} questions moved from ${from} to ${to}.`);
    console.log('Servers cache the catalog for up to 5 minutes, so the change can take that long to appear.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
