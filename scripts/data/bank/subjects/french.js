// Original WAEC/NECO/JAMB/IGCSE-style French questions. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'french',
  name: 'French',
  sortOrder: 23,
  exams: ['waec', 'neco', 'jamb', 'igcse'],
  topics: [
    { slug: 'grammar', name: 'Grammaire (Grammar)' },
    { slug: 'vocabulary', name: 'Vocabulaire (Vocabulary)' },
    { slug: 'culture', name: 'Culture and Usage' },
  ],
  questions: [
    ['grammar', 'Choose the correct translation of "I am a student".', ['Je suis élève.', "J'ai élève.", 'Je suis élèves.', 'Je être élève.'], 0, 'The verb "être" (to be) gives "je suis"; no article is needed before a profession.'],
    ['grammar', 'Complete with the passé composé of "aller": Nous ___ au marché hier.', ['sommes allés', 'avons allé', 'sommes allé', 'allons'], 0, '"Aller" takes "être" in the passé composé, and the participle agrees with "nous": allés.'],
    ['grammar', 'The plural of "le cheval" is', ['les chevaux', 'les chevals', 'les chevaus', 'le chevaux'], 0, 'Most nouns ending in -al form the plural in -aux.'],
    ['grammar', 'Choose the correct article: ___ eau est froide.', ["L'", 'Le', 'La', 'Les'], 0, '"Eau" begins with a vowel, so "la" becomes "l\'".'],
    ['grammar', 'Give the present tense of "avoir" with "ils".', ['ont', 'sont', 'avons', 'a'], 0, 'Avoir: j\'ai, tu as, il a, nous avons, vous avez, ils ont.'],
    ['grammar', 'Choose the correct form: Elle est ___ (heureux).', ['heureuse', 'heureux', 'heureuses', 'heureuxe'], 0, 'Adjectives ending in -eux take -euse in the feminine singular.'],
    ['vocabulary', 'What does "la boulangerie" mean?', ['the bakery', "the butcher's shop", 'the library', 'the bank'], 0, 'La boulangerie sells bread; la boucherie is the butcher\'s.'],
    ['vocabulary', 'Which word means "always"?', ['toujours', 'jamais', 'souvent', 'parfois'], 0, 'Jamais = never, souvent = often, parfois = sometimes.'],
    ['vocabulary', 'The opposite of "grand" is', ['petit', 'gros', 'long', 'haut'], 0, 'Grand (big, tall) is the opposite of petit (small).'],
    ['vocabulary', 'Il fait froid; il faut porter un ___.', ['manteau', 'maillot de bain', 'short', 'éventail'], 0, 'When it is cold you wear a coat (un manteau).'],
    ['culture', 'Translate "Good evening".', ['Bonsoir', 'Bonjour', 'Bonne nuit', 'Au revoir'], 0, 'Bonsoir = good evening; bonne nuit is said at bedtime.'],
    ['culture', 'Which of these West African countries has French as an official language?', ['Senegal', 'Ghana', 'Liberia', 'Gambia'], 0, 'Senegal is francophone; Ghana, Liberia and The Gambia are anglophone.'],
  ],
};
