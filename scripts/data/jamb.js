/*
 * Starter JAMB (UTME) practice content: the exam, five subjects with syllabus
 * topics, and original JAMB-style questions.
 *
 * Almost all of these are ORIGINAL practice questions. The exceptions are the
 * rows marked "JAMB past question", taken from a published past paper (source:
 * kofastudy.com/free-jamb-physics-past-questions-with-solutions) with the
 * answer re-worked by hand. Past questions belong to JAMB: confirm you may use
 * them before scaling this up.
 * Have a subject teacher review them before real students use them, then add
 * more through `POST /api/admin/quiz/questions/import` or by extending this file.
 *
 * Question row: [topicSlug, question, [optionA, optionB, optionC, optionD], correctIndex (0-3), explanation]
 */

const exam = {
  slug: 'jamb',
  name: 'JAMB UTME',
  description: 'Unified Tertiary Matriculation Examination practice questions.',
  sortOrder: 1,
};

const subjects = [
  {
    slug: 'use-of-english',
    name: 'Use of English',
    sortOrder: 1,
    topics: [
      { slug: 'grammar-structure', name: 'Grammar & Structure' },
      { slug: 'vocabulary', name: 'Vocabulary' },
      { slug: 'idioms-expressions', name: 'Idioms & Expressions' },
    ],
    questions: [
      ['grammar-structure', 'Choose the option that best completes the sentence: Neither of the two boys ___ present at the meeting.', ['were', 'was', 'are', 'have been'], 1, '"Neither" takes a singular verb, so "was" is correct.'],
      ['grammar-structure', 'Choose the option that best completes the sentence: The news ___ broadcast at nine o\'clock every night.', ['are', 'were', 'is', 'have'], 2, '"News" is an uncountable noun and takes a singular verb.'],
      ['grammar-structure', 'She has been living in Lagos ___ 2015.', ['for', 'since', 'from', 'in'], 1, '"Since" is used with a point in time; "for" is used with a length of time.'],
      ['grammar-structure', 'If I ___ the answer, I would tell you.', ['know', 'knew', 'had known', 'will know'], 1, 'The second conditional uses the past simple in the "if" clause and "would" in the main clause.'],
      ['grammar-structure', 'The committee ___ its report yesterday.', ['submitted', 'submit', 'have submitted', 'were submitting'], 0, '"Yesterday" signals a completed past action, so the simple past is used.'],
      ['grammar-structure', 'Choose the correct sentence.', ['She don\'t like rice.', 'She doesn\'t like rice.', 'She not like rice.', 'She isn\'t like rice.'], 1, 'With a third-person singular subject, the negative is formed with "doesn\'t" plus the base verb.'],
      ['vocabulary', 'Choose the word closest in meaning to RELUCTANT.', ['eager', 'unwilling', 'ready', 'glad'], 1, 'Reluctant means unwilling or hesitant to do something.'],
      ['vocabulary', 'Choose the word opposite in meaning to ABUNDANT.', ['plentiful', 'scarce', 'ample', 'rich'], 1, 'Abundant means existing in large quantities; the opposite is scarce.'],
      ['vocabulary', 'Choose the word opposite in meaning to GENEROUS.', ['kind', 'stingy', 'wealthy', 'modest'], 1, 'A generous person gives freely; a stingy person does not.'],
      ['vocabulary', 'Choose the word closest in meaning to CONCEAL.', ['reveal', 'hide', 'display', 'discover'], 1, 'To conceal is to hide something from view.'],
      ['idioms-expressions', 'The expression "to kick the bucket" means', ['to die', 'to be angry', 'to fail an exam', 'to play football'], 0, '"Kick the bucket" is an informal idiom meaning to die.'],
      ['idioms-expressions', '"He let the cat out of the bag" means that he', ['released a pet', 'revealed a secret', 'told a lie', 'made a mistake'], 1, 'To "let the cat out of the bag" is to reveal a secret by accident.'],
    ],
  },
  {
    slug: 'mathematics',
    name: 'Mathematics',
    sortOrder: 2,
    topics: [
      { slug: 'number-numeration', name: 'Number & Numeration' },
      { slug: 'algebra', name: 'Algebra' },
      { slug: 'geometry-mensuration', name: 'Geometry & Mensuration' },
      { slug: 'trigonometry', name: 'Trigonometry' },
      { slug: 'statistics-probability', name: 'Statistics & Probability' },
      { slug: 'calculus', name: 'Calculus' },
    ],
    questions: [
      ['number-numeration', 'Evaluate 0.25 × 0.4 ÷ 0.05.', ['0.2', '2', '20', '0.02'], 1, '0.25 × 0.4 = 0.1, and 0.1 ÷ 0.05 = 2.'],
      ['number-numeration', 'Express 0.000345 in standard form.', ['3.45 × 10^-3', '3.45 × 10^-4', '3.45 × 10^-5', '3.45 × 10^4'], 1, 'Move the decimal point 4 places to the right: 3.45 × 10^-4.'],
      ['number-numeration', 'Find the LCM of 12, 18 and 30.', ['90', '180', '360', '540'], 1, '12 = 2²×3, 18 = 2×3², 30 = 2×3×5. LCM = 2²×3²×5 = 180.'],
      ['algebra', 'Solve for x: 3x − 7 = 2x + 5.', ['2', '12', '−2', '5'], 1, 'Subtract 2x from both sides: x − 7 = 5, so x = 12.'],
      ['algebra', 'If x + y = 10 and x − y = 4, find the value of xy.', ['21', '24', '40', '12'], 0, 'Adding gives 2x = 14, so x = 7 and y = 3. Then xy = 21.'],
      ['algebra', 'Factorise x² − 5x + 6.', ['(x + 2)(x + 3)', '(x − 2)(x − 3)', '(x − 1)(x − 6)', '(x + 1)(x − 6)'], 1, 'Two numbers that multiply to 6 and add to −5 are −2 and −3.'],
      ['algebra', 'Make a the subject of the formula v = u + at.', ['(v + u)/t', '(v − u)/t', 't(v − u)', 'v − u − t'], 1, 'Subtract u from both sides: v − u = at. Then divide by t.'],
      ['geometry-mensuration', 'The area of a circle is 154 cm². Find its circumference. (Take π = 22/7)', ['22 cm', '44 cm', '88 cm', '154 cm'], 1, 'r² = 154 × 7/22 = 49, so r = 7. Circumference = 2 × 22/7 × 7 = 44 cm.'],
      ['geometry-mensuration', 'Each interior angle of a regular hexagon is', ['60°', '108°', '120°', '135°'], 2, 'Interior angle = (n − 2) × 180° ÷ n = 4 × 180° ÷ 6 = 120°.'],
      ['geometry-mensuration', 'A cuboid measures 5 cm by 4 cm by 3 cm. Its volume is', ['12 cm³', '47 cm³', '60 cm³', '94 cm³'], 2, 'Volume = length × width × height = 5 × 4 × 3 = 60 cm³.'],
      ['trigonometry', 'Evaluate sin 30° + cos 60°.', ['0.5', '1', '√3/2', '√3'], 1, 'sin 30° = 0.5 and cos 60° = 0.5, so the sum is 1.'],
      ['trigonometry', 'In a right-angled triangle the hypotenuse is 13 cm and one side is 5 cm. Find the other side.', ['8 cm', '12 cm', '14 cm', '18 cm'], 1, 'By Pythagoras: √(13² − 5²) = √(169 − 25) = √144 = 12 cm.'],
      ['statistics-probability', 'Find the mean of 4, 7, 9, 10 and 15.', ['8', '9', '10', '11'], 1, 'The sum is 45 and there are 5 numbers, so the mean is 9.'],
      ['statistics-probability', 'A fair die is thrown once. What is the probability of getting a prime number?', ['1/6', '1/3', '1/2', '2/3'], 2, 'The primes on a die are 2, 3 and 5, so the probability is 3/6 = 1/2.'],
      ['calculus', 'Differentiate y = 3x² + 5x − 2 with respect to x.', ['6x + 5', '3x + 5', '6x² + 5', '6x − 2'], 0, 'Differentiate each term: d/dx(3x²) = 6x, d/dx(5x) = 5, d/dx(−2) = 0.'],
      ['calculus', 'Evaluate the integral of 2x dx from x = 0 to x = 3.', ['6', '9', '12', '18'], 1, 'The integral of 2x is x². Evaluating from 0 to 3 gives 9 − 0 = 9.'],
    ],
  },
  {
    slug: 'physics',
    name: 'Physics',
    sortOrder: 3,
    topics: [
      { slug: 'mechanics', name: 'Mechanics' },
      { slug: 'heat-thermal-physics', name: 'Heat & Thermal Physics' },
      { slug: 'waves-optics', name: 'Waves & Optics' },
      { slug: 'electricity-magnetism', name: 'Electricity & Magnetism' },
      { slug: 'modern-physics', name: 'Modern Physics' },
    ],
    questions: [
      ['mechanics', 'A car accelerates uniformly from rest to 20 m/s in 5 s. Its acceleration is', ['2 m/s²', '4 m/s²', '5 m/s²', '100 m/s²'], 1, 'a = (v − u) / t = (20 − 0) / 5 = 4 m/s².'],
      ['mechanics', 'What is the SI unit of momentum?', ['N', 'kg m/s', 'J', 'kg m/s²'], 1, 'Momentum = mass × velocity, so its unit is kg m/s.'],
      ['mechanics', 'A body of mass 2 kg moves with a velocity of 3 m/s. Its kinetic energy is', ['6 J', '9 J', '18 J', '3 J'], 1, 'KE = ½mv² = ½ × 2 × 3² = 9 J.'],
      ['mechanics', 'A force of 10 N moves an object 5 m in the direction of the force. The work done is', ['2 J', '15 J', '50 J', '500 J'], 2, 'Work = force × distance = 10 × 5 = 50 J.'],
      // JAMB past question
      ['mechanics', 'An object weighs 30 N in air and 21 N in water. The weight of the object when completely immersed in a liquid of relative density 1.4 is', ['25.2 N', '17.4 N', '12.6 N', '9.0 N'], 1, 'Upthrust in water = 30 − 21 = 9 N. Upthrust in the liquid = 1.4 × 9 = 12.6 N. Weight in the liquid = 30 − 12.6 = 17.4 N.'],
      // JAMB past question
      ['mechanics', 'A simple pendulum, 0.6 m long, has a period of 1.5 s. What is the period of a similar pendulum 0.4 m long in the same location?', ['1.5√(2/3) s', '1.5√(3/2) s', '2.25 s', '1.00 s'], 0, 'The period is proportional to the square root of the length, so T = 1.5 × √(0.4/0.6) = 1.5√(2/3) s.'],
      ['heat-thermal-physics', 'Which method of heat transfer does not need a material medium?', ['Conduction', 'Convection', 'Radiation', 'Evaporation'], 2, 'Radiation transfers heat as electromagnetic waves, which can travel through a vacuum.'],
      ['heat-thermal-physics', 'How much heat is needed to raise the temperature of 2 kg of water by 10 °C? (Specific heat capacity of water = 4200 J/kg/K)', ['8,400 J', '42,000 J', '84,000 J', '840,000 J'], 2, 'Q = mcΔθ = 2 × 4200 × 10 = 84,000 J.'],
      ['waves-optics', 'A wave has a frequency of 50 Hz and a wavelength of 4 m. Its speed is', ['12.5 m/s', '46 m/s', '54 m/s', '200 m/s'], 3, 'v = fλ = 50 × 4 = 200 m/s.'],
      ['waves-optics', 'The bending of light as it passes from one medium into another is called', ['reflection', 'refraction', 'diffraction', 'dispersion'], 1, 'Refraction is the change in direction of light caused by a change in speed between media.'],
      ['electricity-magnetism', 'A current of 2 A flows through a resistor of 6 Ω. The potential difference across it is', ['3 V', '8 V', '12 V', '24 V'], 2, 'V = IR = 2 × 6 = 12 V.'],
      ['electricity-magnetism', 'Two 4 Ω resistors are connected in parallel. Their effective resistance is', ['2 Ω', '4 Ω', '8 Ω', '16 Ω'], 0, '1/R = 1/4 + 1/4 = 1/2, so R = 2 Ω.'],
      ['electricity-magnetism', 'The SI unit of electrical power is the', ['volt', 'ampere', 'watt', 'ohm'], 2, 'Power is measured in watts (W).'],
      ['modern-physics', 'Which particle is emitted during beta (β⁻) decay?', ['proton', 'neutron', 'electron', 'helium nucleus'], 2, 'In β⁻ decay a neutron changes into a proton and emits an electron.'],
    ],
  },
  {
    slug: 'chemistry',
    name: 'Chemistry',
    sortOrder: 4,
    topics: [
      { slug: 'atomic-structure-bonding', name: 'Atomic Structure & Bonding' },
      { slug: 'acids-bases-salts', name: 'Acids, Bases & Salts' },
      { slug: 'stoichiometry', name: 'Stoichiometry & Gas Laws' },
      { slug: 'organic-chemistry', name: 'Organic Chemistry' },
      { slug: 'redox-electrochemistry', name: 'Redox & Electrochemistry' },
    ],
    questions: [
      ['atomic-structure-bonding', 'The number of protons in the nucleus of an atom is called its', ['mass number', 'atomic number', 'valency', 'isotope number'], 1, 'The atomic number is the number of protons in an atom.'],
      ['atomic-structure-bonding', 'Which element has the electron configuration 2, 8, 1?', ['Lithium', 'Sodium', 'Potassium', 'Magnesium'], 1, 'Sodium has 11 electrons, arranged 2, 8, 1.'],
      ['atomic-structure-bonding', 'A bond formed by the sharing of electron pairs between atoms is', ['ionic', 'covalent', 'metallic', 'hydrogen'], 1, 'Covalent bonds form when atoms share pairs of electrons.'],
      ['acids-bases-salts', 'What is the pH of a neutral solution at 25 °C?', ['0', '1', '7', '14'], 2, 'A neutral solution has a pH of 7.'],
      ['acids-bases-salts', 'Which of the following is a strong acid?', ['Ethanoic acid', 'Carbonic acid', 'Hydrochloric acid', 'Citric acid'], 2, 'Hydrochloric acid ionises completely in water, so it is a strong acid.'],
      ['acids-bases-salts', 'The reaction between an acid and a base to form a salt and water is called', ['esterification', 'neutralisation', 'hydrolysis', 'polymerisation'], 1, 'Acid + base → salt + water is a neutralisation reaction.'],
      ['stoichiometry', 'How many moles are present in 36 g of water? (H = 1, O = 16)', ['0.5 mol', '1 mol', '2 mol', '4 mol'], 2, 'Molar mass of H₂O = 18 g/mol, so 36 ÷ 18 = 2 mol.'],
      ['stoichiometry', 'What volume does one mole of any gas occupy at s.t.p.?', ['11.2 dm³', '22.4 dm³', '24.0 dm³', '44.8 dm³'], 1, 'One mole of any gas occupies 22.4 dm³ at s.t.p.'],
      ['organic-chemistry', 'The general formula of the alkanes is', ['CnH2n', 'CnH2n+2', 'CnH2n−2', 'CnHn'], 1, 'Alkanes are saturated hydrocarbons with the formula CnH2n+2.'],
      ['organic-chemistry', 'What is the functional group of the alcohols?', ['−COOH', '−OH', '−CHO', '−NH₂'], 1, 'Alcohols contain the hydroxyl group, −OH.'],
      ['redox-electrochemistry', 'In the reaction Zn + Cu²⁺ → Zn²⁺ + Cu, the substance that is oxidised is', ['Zn', 'Cu²⁺', 'Zn²⁺', 'Cu'], 0, 'Zinc loses electrons to become Zn²⁺, so it is oxidised.'],
      ['redox-electrochemistry', 'During electrolysis, reduction takes place at the', ['anode', 'cathode', 'electrolyte', 'salt bridge'], 1, 'Reduction (gain of electrons) always occurs at the cathode.'],
    ],
  },
  {
    slug: 'biology',
    name: 'Biology',
    sortOrder: 5,
    topics: [
      { slug: 'cell-biology', name: 'Cell Biology' },
      { slug: 'genetics-evolution', name: 'Genetics & Evolution' },
      { slug: 'ecology', name: 'Ecology' },
      { slug: 'human-physiology', name: 'Human Physiology' },
      { slug: 'plant-biology', name: 'Plant Biology' },
    ],
    questions: [
      ['cell-biology', 'Which organelle is known as the powerhouse of the cell?', ['Nucleus', 'Ribosome', 'Mitochondrion', 'Golgi body'], 2, 'Mitochondria release energy from food during respiration.'],
      ['cell-biology', 'Which of the following is found in plant cells but not in animal cells?', ['Cell membrane', 'Cell wall', 'Nucleus', 'Ribosome'], 1, 'Plant cells have a cellulose cell wall, which animal cells lack.'],
      ['cell-biology', 'The movement of water across a partially permeable membrane from a region of high water potential to one of low water potential is called', ['diffusion', 'osmosis', 'active transport', 'transpiration'], 1, 'This is the definition of osmosis.'],
      ['genetics-evolution', 'The observable characteristics of an organism are called its', ['genotype', 'phenotype', 'allele', 'karyotype'], 1, 'Phenotype is the physical expression of the genes; genotype is the genetic makeup.'],
      ['genetics-evolution', 'A cross between two heterozygous tall plants (Tt × Tt) is expected to give tall to short offspring in the ratio', ['1 : 1', '2 : 1', '3 : 1', '4 : 1'], 2, 'The offspring are 1 TT : 2 Tt : 1 tt, which is 3 tall to 1 short.'],
      ['ecology', 'An organism that makes its own food from simple inorganic substances is called a', ['consumer', 'decomposer', 'producer', 'parasite'], 2, 'Producers (autotrophs) make their own food, for example by photosynthesis.'],
      ['ecology', 'Which relationship describes one organism living on another and harming it?', ['Mutualism', 'Commensalism', 'Parasitism', 'Saprophytism'], 2, 'In parasitism the parasite benefits while the host is harmed.'],
      ['human-physiology', 'Which blood cells are mainly responsible for fighting infection?', ['Red blood cells', 'White blood cells', 'Platelets', 'Plasma'], 1, 'White blood cells defend the body against pathogens.'],
      ['human-physiology', 'Which enzyme in saliva begins the digestion of starch?', ['Pepsin', 'Lipase', 'Amylase', 'Trypsin'], 2, 'Salivary amylase breaks starch down into maltose.'],
      ['human-physiology', 'Which organ produces bile?', ['Stomach', 'Pancreas', 'Liver', 'Kidney'], 2, 'Bile is made in the liver and stored in the gall bladder.'],
      ['plant-biology', 'The process by which green plants make food using sunlight is called', ['respiration', 'transpiration', 'photosynthesis', 'germination'], 2, 'Photosynthesis uses light energy to make glucose from carbon dioxide and water.'],
      ['plant-biology', 'Water is lost from plants mainly through tiny pores on the leaves called', ['root hairs', 'stomata', 'lenticels', 'xylem vessels'], 1, 'Stomata are the pores through which transpiration occurs.'],
    ],
  },
];

module.exports = { exam, subjects };
