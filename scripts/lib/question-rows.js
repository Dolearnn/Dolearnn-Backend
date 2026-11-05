/*
 * Helpers shared by the question seed scripts.
 * Row shape: [topicSlug, text, options[], correctIndex, explanation]
 */
const crypto = require('crypto');

const OPTION_IDS = ['A', 'B', 'C', 'D'];

// Shuffles a row's options with a seed taken from the question text, so the
// correct answer is spread across A-D but every re-run gives the same order.
function shuffleRow([topicSlug, text, options, correctIndex, explanation]) {
  let seed = crypto.createHash('sha1').update(text).digest().readUInt32BE(0);
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return [topicSlug, text, order.map((i) => options[i]), order.indexOf(correctIndex), explanation];
}

// Stable id for a question, so re-running a seed skips questions already present.
function stableKey(prefix, subjectSlug, text) {
  const hash = crypto.createHash('sha1').update(text).digest('hex').slice(0, 12);
  return `${prefix}-${subjectSlug}-${hash}`;
}

// Throws on rows that would be rejected or silently skipped.
function assertValidRows(subjectSlug, rows, topicSlugs) {
  const seen = new Set();
  for (const [topicSlug, text, options, correctIndex, explanation] of rows) {
    const where = `${subjectSlug}: ${String(text).slice(0, 60)}`;
    if (!topicSlugs.has(topicSlug)) throw new Error(`Unknown topic "${topicSlug}" in ${where}`);
    if (options.length !== OPTION_IDS.length) throw new Error(`Expected 4 options in ${where}`);
    if (new Set(options).size !== options.length) throw new Error(`Duplicate options in ${where}`);
    if (!(correctIndex >= 0 && correctIndex < options.length)) throw new Error(`Bad correct index in ${where}`);
    if (!explanation) throw new Error(`Missing explanation in ${where}`);
    if (seen.has(text)) throw new Error(`Duplicate question in ${where}`);
    seen.add(text);
  }
}

module.exports = { OPTION_IDS, shuffleRow, stableKey, assertValidRows };
