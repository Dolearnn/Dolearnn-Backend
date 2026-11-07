// Original WAEC/NECO/JAMB-style English Language questions, including oral English.
// Uses the existing "Use of English" subject. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'use-of-english',
  name: 'Use of English',
  sortOrder: 1,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'grammar-structure', name: 'Grammar and Structure' },
    { slug: 'vocabulary', name: 'Vocabulary' },
    { slug: 'idioms-expressions', name: 'Idioms and Expressions' },
    { slug: 'oral-english', name: 'Oral English' },
  ],
  questions: [
    ['grammar-structure', 'Neither the teacher nor the students ___ in the hall.', ['were', 'was', 'is', 'has been'], 0, 'With "neither … nor", the verb agrees with the nearer subject, "students" (plural).'],
    ['grammar-structure', 'Each of the girls ___ given a prize.', ['was', 'were', 'are', 'have been'], 0, '"Each" is singular, so it takes "was".'],
    ['grammar-structure', 'He has been living in Lagos ___ 2015.', ['since', 'for', 'from', 'by'], 0, '"Since" is used with a point in time; "for" with a length of time.'],
    ['grammar-structure', 'If I ___ you, I would apologise.', ['were', 'am', 'was being', 'will be'], 0, 'Unreal conditions use the subjunctive "were".'],
    ['grammar-structure', 'The plural of "criterion" is', ['criteria', 'criterions', 'criterias', 'criterium'], 0, '"Criterion" is a Greek-derived noun whose plural is "criteria".'],
    ['vocabulary', 'Choose the word nearest in meaning to "candid".', ['frank', 'careful', 'clever', 'hidden'], 0, 'Candid means open and honest, i.e. frank.'],
    ['vocabulary', 'Choose the word opposite in meaning to "scarce".', ['abundant', 'rare', 'costly', 'small'], 0, 'Scarce means in short supply; abundant means plentiful.'],
    ['vocabulary', 'A person who studies the stars and planets scientifically is', ['an astronomer', 'an astrologer', 'an archaeologist', 'a geologist'], 0, 'Astronomy is the science of space; astrology claims stars influence human affairs.'],
    ['idioms-expressions', 'To "bury the hatchet" means to', ['make peace', 'dig a hole', 'hide a weapon', 'start a quarrel'], 0, 'Burying the hatchet means ending a quarrel.'],
    ['idioms-expressions', '"A storm in a teacup" means', ['a lot of fuss about something unimportant', 'a serious crisis', 'bad weather', 'a quarrel at a party'], 0, 'It describes great excitement over a trivial matter.'],
    ['oral-english', 'Which word has a different vowel sound from the others: seat, meat, great, heat?', ['great', 'seat', 'meat', 'heat'], 0, '"Great" has the /eɪ/ sound; the others have /iː/.'],
    ['oral-english', 'Which word is stressed on the second syllable?', ['begin', 'table', 'water', 'husband'], 0, 'be-GIN; the others are stressed on the first syllable.'],
  ],
};
