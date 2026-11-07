// Original senior-secondary Chemistry questions. Uses the existing Chemistry topics.
// Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'chemistry',
  name: 'Chemistry',
  sortOrder: 4,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'atomic-structure-bonding', name: 'Atomic Structure and Bonding' },
    { slug: 'acids-bases-salts', name: 'Acids, Bases and Salts' },
    { slug: 'stoichiometry', name: 'Stoichiometry' },
    { slug: 'organic-chemistry', name: 'Organic Chemistry' },
    { slug: 'redox-electrochemistry', name: 'Redox and Electrochemistry' },
  ],
  questions: [
    ['atomic-structure-bonding', 'The atomic number of an element is the number of', ['protons in its nucleus', 'neutrons in its nucleus', 'protons and neutrons together', 'electrons in its outermost shell'], 0, 'Atomic number = number of protons; mass number = protons + neutrons.'],
    ['atomic-structure-bonding', 'The electronic configuration of sodium (atomic number 11) is', ['2, 8, 1', '2, 9', '2, 8, 2', '2, 1, 8'], 0, 'Shells fill 2, then 8, then the remaining 1 electron.'],
    ['atomic-structure-bonding', 'A bond formed by the transfer of electrons from one atom to another is', ['an ionic (electrovalent) bond', 'a covalent bond', 'a metallic bond', 'a hydrogen bond'], 0, 'Electron transfer forms ions held by electrostatic attraction; covalent bonds share electrons.'],
    ['acids-bases-salts', 'A solution with pH 2 is', ['strongly acidic', 'weakly acidic', 'neutral', 'strongly alkaline'], 0, 'pH below 7 is acidic; the lower the pH, the stronger the acidity.'],
    ['acids-bases-salts', 'The reaction of an acid with a base to form a salt and water is', ['neutralisation', 'oxidation', 'hydrolysis', 'esterification'], 0, 'Acid + base → salt + water is neutralisation.'],
    ['acids-bases-salts', 'The gas given off when zinc reacts with dilute hydrochloric acid is', ['hydrogen', 'oxygen', 'chlorine', 'carbon(IV) oxide'], 0, 'Zn + 2HCl → ZnCl₂ + H₂.'],
    ['stoichiometry', 'Find the molar mass of water. (H = 1, O = 16)', ['18 g/mol', '17 g/mol', '16 g/mol', '20 g/mol'], 0, 'H₂O = 2(1) + 16 = 18 g/mol.'],
    ['stoichiometry', 'How many moles are in 44 g of carbon(IV) oxide? (C = 12, O = 16)', ['1 mol', '2 mol', '0.5 mol', '44 mol'], 0, 'CO₂ = 44 g/mol, so 44 g is 1 mol.'],
    ['organic-chemistry', 'The general formula of the alkanes is', ['CₙH₂ₙ₊₂', 'CₙH₂ₙ', 'CₙH₂ₙ₋₂', 'CₙH₂ₙ₊₁OH'], 0, 'Alkanes are saturated: CₙH₂ₙ₊₂. Alkenes are CₙH₂ₙ and alkynes CₙH₂ₙ₋₂.'],
    ['organic-chemistry', 'Ethanol belongs to the homologous series of the', ['alkanols (alcohols)', 'alkanes', 'alkanoic acids', 'alkenes'], 0, 'Ethanol, C₂H₅OH, contains the –OH group of the alkanols.'],
    ['redox-electrochemistry', 'Oxidation is defined as', ['loss of electrons', 'gain of electrons', 'gain of hydrogen', 'loss of oxygen'], 0, 'OIL RIG: Oxidation Is Loss, Reduction Is Gain (of electrons).'],
    ['redox-electrochemistry', 'In electrolysis, the electrode connected to the positive terminal is the', ['anode', 'cathode', 'electrolyte', 'salt bridge'], 0, 'The anode is positive and attracts anions; the cathode is negative.'],
  ],
};
