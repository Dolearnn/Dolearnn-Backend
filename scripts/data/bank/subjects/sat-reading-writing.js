// Original SAT-style Reading and Writing questions (not College Board material).
// Uses the existing "Use of English" subject. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'use-of-english',
  name: 'Use of English',
  sortOrder: 1,
  exams: ['sat'],
  topics: [
    { slug: 'standard-english-conventions', name: 'Standard English Conventions' },
    { slug: 'expression-of-ideas', name: 'Expression of Ideas' },
    { slug: 'vocabulary', name: 'Vocabulary' },
  ],
  questions: [
    ['standard-english-conventions', 'Which choice completes the text so that it conforms to Standard English? "The committee ___ its decision after reviewing every application."', ['announced', 'announcing', 'to announce', 'having announced'], 0, 'The sentence needs a finite verb for "The committee": "announced".'],
    ['standard-english-conventions', 'Which punctuation completes the text correctly? "The museum\'s newest exhibit features three artists___ a painter, a sculptor, and a photographer."', [':', ';', ',and', '.'], 0, 'A colon introduces a list that explains what came before it.'],
    ['standard-english-conventions', 'Which choice completes the text correctly? "The students submitted ___ projects on time."', ['their', 'there', "they're", 'its'], 0, '"Their" is the possessive form for "students".'],
    ['standard-english-conventions', 'Which choice completes the sentence correctly? "Walking into the library, ___"', ['Maya noticed the new reading room.', "the new reading room caught Maya's eye.", 'the reading room was new to Maya.', 'there was a new reading room.'], 0, 'The opening phrase describes Maya, so "Maya" must come right after the comma.'],
    ['standard-english-conventions', 'Which choice completes the text correctly? "Neither of the reports ___ complete."', ['is', 'are', 'were', 'have been'], 0, '"Neither" is singular, so it takes "is".'],
    ['standard-english-conventions', 'Which choice completes the text correctly? "The bridge, which was built in 1932___ still carries heavy traffic today."', [',', ';', ':', '—and'], 0, 'A comma closes the non-essential clause that the first comma opened.'],
    ['expression-of-ideas', 'Which transition best completes the text? "The first trial of the experiment failed. ___, the researchers adjusted the temperature and tried again."', ['Consequently', 'Similarly', 'For example', 'In contrast'], 0, 'The second sentence is a result of the first, so "Consequently" fits.'],
    ['expression-of-ideas', 'Which transition best completes the text? "Many desert plants store water in their stems. ___, cacti can survive months without rain."', ['As a result', 'However', 'Nevertheless', 'On the other hand'], 0, 'Surviving without rain follows from storing water: a cause-and-effect link.'],
    ['expression-of-ideas', 'A student wants to emphasise a similarity between two ideas. Which transition should she use?', ['Likewise', 'However', 'Instead', 'Meanwhile'], 0, '"Likewise" signals similarity; the others signal contrast or time.'],
    ['vocabulary', 'As used in the text, what does "novel" most nearly mean? "The engineer proposed a novel solution that no one had tried before."', ['new', 'long', 'written', 'fictional'], 0, '"Novel" here means new and original, as the clause "no one had tried before" shows.'],
    ['vocabulary', 'Which word best completes the text? "The scientist was ___ about the results, refusing to draw conclusions until more data were collected."', ['cautious', 'careless', 'certain', 'cheerful'], 0, 'Refusing to conclude without more data shows caution.'],
    ['vocabulary', 'Which word best completes the text? "Because the evidence was ___, the jury could not reach a verdict."', ['inconclusive', 'decisive', 'overwhelming', 'convincing'], 0, 'Evidence that settles nothing is inconclusive, so no verdict could be reached.'],
  ],
};
