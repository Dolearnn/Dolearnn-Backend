// Original senior-secondary Biology questions. Uses the existing Biology topics.
// Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'biology',
  name: 'Biology',
  sortOrder: 5,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'cell-biology', name: 'Cell Biology' },
    { slug: 'genetics-evolution', name: 'Genetics and Evolution' },
    { slug: 'ecology', name: 'Ecology' },
    { slug: 'human-physiology', name: 'Human Physiology' },
    { slug: 'plant-biology', name: 'Plant Biology' },
  ],
  questions: [
    ['cell-biology', 'The organelle where aerobic respiration takes place is the', ['mitochondrion', 'ribosome', 'nucleus', 'vacuole'], 0, 'Mitochondria release energy from food in aerobic respiration.'],
    ['cell-biology', 'Which structure is found in plant cells but not in animal cells?', ['Cell wall', 'Cell membrane', 'Nucleus', 'Cytoplasm'], 0, 'Plant cells have a cellulose cell wall; both kinds of cell have the other three.'],
    ['genetics-evolution', 'Crossing two heterozygous tall plants (Tt × Tt) gives the phenotypic ratio', ['3 tall : 1 short', '1 tall : 1 short', 'all tall', '1 tall : 3 short'], 0, 'Offspring: TT, Tt, Tt, tt, so three tall to one short.'],
    ['genetics-evolution', 'The father of genetics is', ['Gregor Mendel', 'Charles Darwin', 'Robert Hooke', 'Louis Pasteur'], 0, "Mendel's experiments with pea plants laid the foundations of genetics."],
    ['ecology', 'In a food chain, organisms that make their own food are', ['producers', 'primary consumers', 'decomposers', 'carnivores'], 0, 'Green plants are producers; they make food by photosynthesis.'],
    ['ecology', 'An association in which both organisms benefit is', ['mutualism', 'parasitism', 'commensalism', 'predation'], 0, 'In mutualism both partners gain, e.g. legumes and nitrogen-fixing bacteria.'],
    ['human-physiology', 'The blood vessel that carries blood from the heart to the lungs is the', ['pulmonary artery', 'pulmonary vein', 'aorta', 'vena cava'], 0, 'The pulmonary artery takes deoxygenated blood to the lungs.'],
    ['human-physiology', 'The enzyme in saliva that begins the digestion of starch is', ['amylase (ptyalin)', 'pepsin', 'lipase', 'trypsin'], 0, 'Salivary amylase breaks starch into maltose.'],
    ['human-physiology', 'The functional unit of the kidney is the', ['nephron', 'neuron', 'alveolus', 'villus'], 0, 'Nephrons filter blood and form urine.'],
    ['human-physiology', 'The disease caused by a lack of vitamin C is', ['scurvy', 'rickets', 'beriberi', 'night blindness'], 0, 'Scurvy results from vitamin C deficiency; rickets from lack of vitamin D.'],
    ['plant-biology', 'The process by which green plants make food using light energy is', ['photosynthesis', 'transpiration', 'respiration', 'osmosis'], 0, 'Photosynthesis uses light, carbon dioxide and water to make glucose.'],
    ['plant-biology', 'The loss of water vapour from the leaves of a plant is', ['transpiration', 'guttation', 'photosynthesis', 'imbibition'], 0, 'Transpiration is loss of water vapour, mainly through stomata.'],
  ],
};
