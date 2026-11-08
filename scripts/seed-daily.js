/*
 * Loads the Daily quiz question pool from scripts/data/daily/*.js.
 * Each file exports rows: [category, text, [correct, wrong, wrong, wrong], 0, explanation]
 * where category is english, maths or history. Safe to re-run.
 *
 *   npm run seed:daily
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { OPTION_IDS, shuffleRow, stableKey, assertValidRows } = require('./lib/question-rows');

const prisma = new PrismaClient();
const DIR = path.join(__dirname, 'data', 'daily');
const CATEGORIES = new Set(['english', 'maths', 'history']);

async function main() {
  const rows = fs
    .readdirSync(DIR)
    .filter((file) => file.endsWith('.js'))
    .flatMap((file) => require(path.join(DIR, file)));
  assertValidRows('daily', rows, CATEGORIES);

  let added = 0;
  for (const row of rows) {
    const [category, text, options, correctIndex, explanation] = shuffleRow(row);
    const sourceKey = stableKey('daily', category, text);
    const exists = await prisma.dailyQuestion.findUnique({ where: { sourceKey }, select: { id: true } });
    if (exists) continue;
    await prisma.dailyQuestion.create({
      data: {
        sourceKey,
        category,
        text,
        options: options.map((option, index) => ({ id: OPTION_IDS[index], text: option })),
        correctOptionId: OPTION_IDS[correctIndex],
        explanation,
      },
    });
    added += 1;
  }

  const counts = await prisma.dailyQuestion.groupBy({ by: ['category'], _count: { _all: true } });
  console.log(`Added ${added} of ${rows.length}.`, counts.map((c) => `${c.category}: ${c._count._all}`).join(', '));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
