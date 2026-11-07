// Original WAEC/NECO-style Civic Education questions. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'civic-education',
  name: 'Civic Education',
  sortOrder: 20,
  exams: ['waec', 'neco'],
  topics: [
    { slug: 'citizenship', name: 'Citizenship' },
    { slug: 'human-rights', name: 'Human Rights' },
    { slug: 'democracy-rule-of-law', name: 'Democracy and the Rule of Law' },
    { slug: 'values-social-issues', name: 'Values and Social Issues' },
  ],
  questions: [
    ['citizenship', 'A legal member of a country who has rights and duties is', ['a citizen', 'an alien', 'a refugee', 'a tourist'], 0, 'A citizen enjoys full rights and owes duties to the state.'],
    ['citizenship', 'Citizenship gained by being born to Nigerian parents is citizenship by', ['birth', 'registration', 'naturalisation', 'honour'], 0, 'The constitution grants citizenship by birth to children of Nigerian parents.'],
    ['citizenship', 'One duty of a citizen is to', ['pay taxes', 'avoid voting', 'ignore court orders', 'hide crimes from the police'], 0, 'Paying taxes, obeying laws and voting are civic duties.'],
    ['human-rights', 'The Universal Declaration of Human Rights was adopted by the United Nations in', ['1948', '1945', '1960', '1966'], 0, 'The UN General Assembly adopted the UDHR on 10 December 1948.'],
    ['human-rights', 'Which of these is a fundamental human right?', ['Right to life', 'Right to a government job', 'Right to own a car', 'Right to free university education'], 0, 'The right to life is protected in Chapter IV of the Nigerian Constitution.'],
    ['democracy-rule-of-law', 'Democracy as "government of the people, by the people and for the people" was defined by', ['Abraham Lincoln', 'Nelson Mandela', 'Julius Nyerere', 'Winston Churchill'], 0, 'Abraham Lincoln used the phrase in the Gettysburg Address (1863).'],
    ['democracy-rule-of-law', 'The rule of law means that', ['everyone, including leaders, is subject to the law', 'leaders can make any law they wish', 'only ordinary citizens obey the law', 'the military makes the laws'], 0, 'Under the rule of law no one is above the law.'],
    ['values-social-issues', 'Being honest and having strong moral principles is', ['integrity', 'tolerance', 'contentment', 'courage'], 0, 'Integrity means honesty and consistency with moral principles.'],
    ['values-social-issues', 'Accepting people whose beliefs or ways differ from yours is', ['tolerance', 'obedience', 'patriotism', 'loyalty'], 0, 'Tolerance is respecting others despite differences.'],
    ['values-social-issues', 'Human trafficking is best described as', ['the illegal trade in people for exploitation', 'legal migration for work', 'travelling without a passport', 'moving goods across borders'], 0, 'Trafficking moves people by force or deception in order to exploit them.'],
    ['values-social-issues', 'The Nigerian agency that fights drug abuse and drug trafficking is', ['NDLEA', 'NAFDAC', 'EFCC', 'FRSC'], 0, 'The National Drug Law Enforcement Agency (NDLEA) fights illicit drugs.'],
    ['values-social-issues', 'The Nigerian agency that investigates economic and financial crimes is', ['EFCC', 'NDLEA', 'INEC', 'NOA'], 0, 'The Economic and Financial Crimes Commission (EFCC) fights fraud and corruption.'],
  ],
};
