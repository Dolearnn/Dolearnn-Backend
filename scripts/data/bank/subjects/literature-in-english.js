// Original WAEC/NECO/JAMB-style Literature in English questions (general literary knowledge, not set texts,
// which change every few years). Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'literature-in-english',
  name: 'Literature in English',
  sortOrder: 14,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'literary-devices', name: 'Literary Devices' },
    { slug: 'poetry', name: 'Poetry' },
    { slug: 'drama', name: 'Drama' },
    { slug: 'prose', name: 'Prose' },
  ],
  questions: [
    ['literary-devices', 'A comparison between two unlike things using "like" or "as" is', ['a simile', 'a metaphor', 'personification', 'hyperbole'], 0, 'A simile compares using "like" or "as"; a metaphor compares directly.'],
    ['literary-devices', 'Giving human qualities to non-human things is', ['personification', 'onomatopoeia', 'alliteration', 'irony'], 0, 'Personification treats animals, objects or ideas as if they were human.'],
    ['literary-devices', 'Deliberate exaggeration for effect is', ['hyperbole', 'litotes', 'euphemism', 'paradox'], 0, 'Hyperbole overstates; litotes understates.'],
    ['literary-devices', 'A mild or indirect expression used in place of a harsh one is', ['a euphemism', 'a hyperbole', 'an oxymoron', 'a pun'], 0, 'For example, "passed away" is a euphemism for "died".'],
    ['poetry', 'A poem of fourteen lines is', ['a sonnet', 'a ballad', 'an elegy', 'an ode'], 0, 'The sonnet has fourteen lines, usually in iambic pentameter.'],
    ['poetry', 'A poem written to mourn the dead is', ['an elegy', 'an epic', 'a limerick', 'a lyric'], 0, 'An elegy is a mournful poem, often a lament for someone who has died.'],
    ['poetry', 'The repetition of the same consonant sound at the beginning of nearby words is', ['alliteration', 'assonance', 'rhyme', 'refrain'], 0, 'Alliteration repeats initial consonants; assonance repeats vowel sounds.'],
    ['drama', 'A speech in which a character alone on stage speaks his or her thoughts aloud is', ['a soliloquy', 'an aside', 'a dialogue', 'a prologue'], 0, 'A soliloquy reveals inner thoughts to the audience; an aside is a brief remark others on stage do not hear.'],
    ['drama', 'A play that ends in the downfall of the main character is', ['a tragedy', 'a comedy', 'a farce', 'a satire'], 0, 'A tragedy traces the fall of a protagonist, often through a tragic flaw.'],
    ['drama', 'When the audience knows something a character does not, the device is', ['dramatic irony', 'verbal irony', 'satire', 'flashback'], 0, 'Dramatic irony depends on the audience knowing more than the character.'],
    ['prose', 'A story told by a character who uses "I" is narrated from the', ['first-person point of view', 'third-person point of view', 'omniscient point of view', 'second-person point of view'], 0, 'A first-person narrator is a character in the story and speaks as "I".'],
    ['prose', 'The sequence of events in a story is its', ['plot', 'setting', 'theme', 'diction'], 0, 'Plot is the arrangement of events; setting is time and place; theme is the central idea.'],
    ['prose', '"Things Fall Apart" was written by', ['Chinua Achebe', 'Wole Soyinka', "Ngũgĩ wa Thiong'o", 'Cyprian Ekwensi'], 0, 'Chinua Achebe published "Things Fall Apart" in 1958.'],
  ],
};
