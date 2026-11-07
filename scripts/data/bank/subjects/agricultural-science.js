// Original WAEC/NECO/JAMB-style Agricultural Science questions. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'agricultural-science',
  name: 'Agricultural Science',
  sortOrder: 18,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'crop-production', name: 'Crop Production' },
    { slug: 'animal-production', name: 'Animal Production' },
    { slug: 'soil-science', name: 'Soil Science' },
    { slug: 'agricultural-economics', name: 'Agricultural Economics' },
  ],
  questions: [
    ['soil-science', 'Removing excess water from waterlogged soil is', ['drainage', 'irrigation', 'tillage', 'mulching'], 0, 'Drainage removes excess water; irrigation adds water.'],
    ['soil-science', 'The soil with the largest particle size is', ['sandy soil', 'clay soil', 'silt', 'loam'], 0, 'Sand particles are the largest; clay particles are the smallest.'],
    ['crop-production', 'Which of these is a leguminous crop?', ['Cowpea', 'Maize', 'Cassava', 'Yam'], 0, 'Cowpea is a legume and fixes nitrogen in root nodules.'],
    ['crop-production', 'Nitrogen deficiency in plants commonly shows as', ['yellowing of older leaves', 'purple leaves', 'very thick stems', 'extra-large fruits'], 0, 'Nitrogen is mobile, so older leaves turn yellow (chlorosis) first.'],
    ['crop-production', 'Growing different crops in sequence on the same piece of land is', ['crop rotation', 'mixed cropping', 'monocropping', 'shifting cultivation'], 0, 'Crop rotation maintains fertility and breaks pest and disease cycles.'],
    ['crop-production', 'Yam is usually propagated by', ['setts (pieces of tuber)', 'seeds', 'stem cuttings', 'suckers'], 0, 'Farmers plant yam setts cut from tubers.'],
    ['crop-production', 'A weed is best described as', ['a plant growing where it is not wanted', 'any plant with thorns', 'a plant without roots', 'a crop that has died'], 0, 'A weed is any plant growing where it is not wanted, competing with crops.'],
    ['animal-production', 'A castrated male cattle is called', ['a steer (bullock)', 'a heifer', 'a cow', 'a bull'], 0, 'A heifer is a young female; a bull is an uncastrated male.'],
    ['animal-production', 'The gestation period of a sow is about', ['114 days', '21 days', '150 days', '280 days'], 0, 'Pigs carry their young for about 114 days (3 months, 3 weeks, 3 days).'],
    ['animal-production', 'Newcastle disease mainly affects', ['poultry', 'cattle', 'goats', 'pigs'], 0, 'Newcastle disease is a viral disease of poultry.'],
    ['animal-production', 'The young of a goat is called', ['a kid', 'a calf', 'a lamb', 'a piglet'], 0, 'A kid is a young goat; a lamb is a young sheep.'],
    ['agricultural-economics', 'Tractors and farm buildings belong to which factor of production?', ['Capital', 'Land', 'Labour', 'Entrepreneurship'], 0, 'Man-made aids to production are capital.'],
  ],
};
