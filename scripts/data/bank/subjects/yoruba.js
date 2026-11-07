// Original WAEC/NECO/JAMB-style Yoruba questions (asked in English for now).
// IMPORTANT: have a Yoruba teacher review tone marks and wording before wide use.
// Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'yoruba',
  name: 'Yoruba',
  sortOrder: 22,
  exams: ['waec', 'neco', 'jamb'],
  topics: [
    { slug: 'ede', name: 'Èdè (Language and Grammar)' },
    { slug: 'asa', name: 'Àṣà (Culture)' },
    { slug: 'litireso', name: 'Lítíréṣọ̀ (Literature)' },
  ],
  questions: [
    ['ede', 'What does "ọ̀rẹ́" mean in English?', ['friend', 'enemy', 'brother', 'teacher'], 0, '"Ọ̀rẹ́" means friend.'],
    ['ede', 'What does "ìyá" mean in English?', ['mother', 'father', 'sister', 'grandfather'], 0, '"Ìyá" means mother; "bàbá" means father.'],
    ['ede', 'What is "ọ̀kan" in English?', ['one', 'two', 'five', 'ten'], 0, '"Ọ̀kan" is one; "èjì" is two; "àrún" is five; "ẹ̀wá" is ten.'],
    ['ede', 'What is "ẹ̀wá" in English?', ['ten', 'seven', 'twenty', 'eight'], 0, '"Ẹ̀wá" is ten and "ogún" is twenty.'],
    ['ede', 'Which greeting is used in the morning?', ['Ẹ káàárọ̀', 'Ẹ káàsán', 'Ẹ kúùrọ̀lẹ́', 'Ó dàbọ̀'], 0, '"Ẹ káàárọ̀" is good morning; "ẹ káàsán" good afternoon; "ẹ kúùrọ̀lẹ́" good evening.'],
    ['ede', 'How many oral vowels are there in standard Yoruba?', ['seven', 'five', 'twelve', 'eighteen'], 0, 'The oral vowels are a, e, ẹ, i, o, ọ and u.'],
    ['ede', 'In Yoruba writing, the low tone is marked with', ['the grave accent ( ` )', 'the acute accent ( ´ )', 'no mark at all', 'the tilde ( ~ )'], 0, 'High tone takes the acute accent, low tone the grave accent; mid tone is usually unmarked.'],
    ['asa', '"Oríkì" is best described as', ['praise poetry or a praise name', 'a funeral dirge only', 'a type of drum', 'a market day'], 0, 'Oríkì are praise names and praise poems for people, families and towns.'],
    ['asa', 'The traditional ruler of Ilé-Ifẹ̀ is the', ['Ọọ̀ni', 'Aláàfin', 'Awùjalẹ̀', 'Aláké'], 0, 'The Ọọ̀ni rules Ilé-Ifẹ̀; the Aláàfin rules Ọ̀yọ́.'],
    ['asa', 'The Aláàfin is the traditional ruler of', ['Ọ̀yọ́', 'Ìjẹ̀bú-Òde', 'Ilé-Ifẹ̀', 'Abẹ́òkúta'], 0, 'The Aláàfin rules Ọ̀yọ́; the Awùjalẹ̀ rules Ìjẹ̀bú-Òde and the Aláké rules Abẹ́òkúta.'],
    ['litireso', 'Who wrote "Ògbójú Ọdẹ nínú Igbó Irúnmalẹ̀", the first full-length novel in Yoruba?', ['D. O. Fágúnwà', 'Wọlé Ṣóyínká', 'Akínwùmí Ìṣọ̀lá', 'Adébáyọ̀ Fálétí'], 0, 'D. O. Fágúnwà published it in 1938; Wọlé Ṣóyínká later translated it into English.'],
    ['litireso', 'Òwe (proverbs) are mainly used to', ['express wisdom briefly and strengthen speech', 'count numbers', 'name the days of the week', 'greet only elders'], 0, 'Proverbs carry wisdom and are used to support and illustrate a point.'],
  ],
};
