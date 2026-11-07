// Original WAEC/NECO/JAMB-style Music questions. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'music',
  name: 'Music',
  sortOrder: 24,
  exams: ['waec', 'neco', 'jamb'],
  topics: [
    { slug: 'rudiments', name: 'Rudiments of Music' },
    { slug: 'harmony', name: 'Harmony and Keys' },
    { slug: 'music-history', name: 'History of Western Music' },
    { slug: 'african-music', name: 'African Music' },
  ],
  questions: [
    ['rudiments', 'How many crotchets are equal in value to one semibreve?', ['four', 'two', 'eight', 'three'], 0, 'A semibreve = 2 minims = 4 crotchets.'],
    ['rudiments', 'A dot placed after a note increases its value by', ['half of its value', 'its full value', 'a quarter of its value', 'two beats'], 0, 'A dotted note is worth one and a half times the plain note.'],
    ['rudiments', 'The time signature 3/4 means', ['three crotchet beats in a bar', 'four beats of three notes', 'three minim beats in a bar', 'three quaver beats in a bar'], 0, 'The top number gives beats per bar; 4 at the bottom means each beat is a crotchet.'],
    ['rudiments', 'The Italian term "forte" means', ['loud', 'soft', 'slow', 'fast'], 0, 'Forte (f) is loud; piano (p) is soft.'],
    ['rudiments', 'The Italian term "andante" indicates', ['a walking (moderate) pace', 'a very fast pace', 'a very slow pace', 'gradually getting louder'], 0, 'Andante means at a walking pace.'],
    ['harmony', 'The key of G major has one sharp, which is', ['F sharp', 'C sharp', 'G sharp', 'B sharp'], 0, 'G major has one sharp: F♯.'],
    ['harmony', 'The interval from C up to G is a perfect', ['fifth', 'fourth', 'octave', 'third'], 0, 'C–D–E–F–G spans five letter names: a perfect fifth.'],
    ['harmony', 'The chord built on the fifth degree of a scale is the', ['dominant chord', 'tonic chord', 'subdominant chord', 'leading-note chord'], 0, 'Degree I is the tonic, IV the subdominant and V the dominant.'],
    ['music-history', 'The oratorio "Messiah" was composed by', ['George Frideric Handel', 'Johann Sebastian Bach', 'Wolfgang Amadeus Mozart', 'Ludwig van Beethoven'], 0, 'Handel composed "Messiah" in 1741.'],
    ['music-history', 'Which composer kept composing after becoming deaf?', ['Ludwig van Beethoven', 'Joseph Haydn', 'Antonio Vivaldi', 'Franz Schubert'], 0, 'Beethoven wrote major works, including his Ninth Symphony, while profoundly deaf.'],
    ['african-music', 'The Yoruba "talking drum" is the', ['dùndún', 'kora', 'udu', 'mbira'], 0, 'The dùndún imitates speech tones; the kora is a West African harp, the udu an Igbo pot drum.'],
    ['african-music', 'Fela Anikulapo-Kuti is best known for pioneering', ['Afrobeat', 'Highlife', 'Jùjú', 'Fújì'], 0, 'Fela developed Afrobeat in the late 1960s and 1970s.'],
  ],
};
