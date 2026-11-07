/*
 * Exams in the shared question bank. JAMB UTME and WAEC already exist (from
 * seed-jamb.js / seed-waec.js); they are listed so subject files can target
 * them. `name` must match the exam names learners pick during onboarding.
 *
 * All questions in the bank are ORIGINAL, written in the style and syllabus
 * of each exam. They are not copied past papers (WAEC, JAMB, NECO, Cambridge
 * and the College Board own those). Have a subject teacher review before use
 * in official competitions.
 */
module.exports = [
  { slug: 'jamb', name: 'JAMB UTME', description: 'Unified Tertiary Matriculation Examination practice questions.', sortOrder: 1 },
  { slug: 'waec', name: 'WAEC', description: 'West African Senior School Certificate Examination (WASSCE) practice questions.', sortOrder: 2 },
  { slug: 'neco', name: 'NECO', description: 'National Examinations Council SSCE practice questions.', sortOrder: 3 },
  { slug: 'post-utme', name: 'Post-UTME', description: 'University screening-style practice questions.', sortOrder: 4 },
  { slug: 'igcse', name: 'IGCSE / GCSE', description: 'International GCSE and GCSE-style practice questions.', sortOrder: 5 },
  { slug: 'sat', name: 'SAT', description: 'SAT-style Math and Reading & Writing practice questions.', sortOrder: 6 },
];
