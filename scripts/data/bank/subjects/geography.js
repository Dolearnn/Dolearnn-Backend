// Original WAEC/NECO/JAMB-style Geography questions. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'geography',
  name: 'Geography',
  sortOrder: 15,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'earth-and-maps', name: 'The Earth and Map Reading' },
    { slug: 'physical-geography', name: 'Physical Geography' },
    { slug: 'climate-vegetation', name: 'Climate and Vegetation' },
    { slug: 'population-settlement', name: 'Population and Settlement' },
    { slug: 'geography-of-nigeria', name: 'Geography of Nigeria' },
  ],
  questions: [
    ['earth-and-maps', 'The imaginary line at 0° latitude is the', ['Equator', 'Prime Meridian', 'Tropic of Cancer', 'International Date Line'], 0, 'Latitude is measured from the Equator (0°); longitude from the Prime Meridian.'],
    ['earth-and-maps', 'Two places are 15° of longitude apart. The difference in their local times is', ['1 hour', '15 minutes', '4 minutes', '30 minutes'], 0, 'The earth turns 360° in 24 hours, i.e. 15° per hour.'],
    ['earth-and-maps', 'On a map of scale 1:50,000, a distance of 4 cm represents', ['2 km', '20 km', '0.2 km', '200 m'], 0, '4 × 50,000 = 200,000 cm = 2,000 m = 2 km.'],
    ['physical-geography', 'Rocks formed from the cooling and solidifying of molten magma are', ['igneous rocks', 'sedimentary rocks', 'metamorphic rocks', 'organic rocks'], 0, 'Igneous rocks form from cooled magma or lava, e.g. granite and basalt.'],
    ['physical-geography', 'The layer of the atmosphere closest to the earth is the', ['troposphere', 'stratosphere', 'mesosphere', 'thermosphere'], 0, 'Weather happens in the troposphere, the lowest layer.'],
    ['physical-geography', 'A crescent-shaped lake formed when a river meander is cut off is', ['an ox-bow lake', 'a crater lake', 'a lagoon', 'a rift valley lake'], 0, 'Erosion at the neck of a meander cuts it off, leaving an ox-bow lake.'],
    ['climate-vegetation', 'Rainfall caused by moist air rising over a mountain is', ['relief (orographic) rainfall', 'convectional rainfall', 'frontal rainfall', 'cyclonic rainfall'], 0, 'Air forced up a slope cools, condenses and falls as relief rain on the windward side.'],
    ['climate-vegetation', 'The dry, dusty wind that blows from the Sahara across West Africa from about November to March is the', ['Harmattan', 'monsoon', 'Foehn', 'Chinook'], 0, 'The Harmattan is the dry north-east trade wind from the Sahara.'],
    ['geography-of-nigeria', 'The rivers Niger and Benue meet at', ['Lokoja', 'Onitsha', 'Jebba', 'Makurdi'], 0, 'The confluence of the Niger and the Benue is at Lokoja in Kogi State.'],
    ['geography-of-nigeria', 'The Kainji Dam is on the', ['River Niger', 'River Benue', 'River Ogun', 'River Kaduna'], 0, 'Kainji Dam on the River Niger supplies hydroelectric power.'],
    ['geography-of-nigeria', 'Tropical rainforest vegetation in Nigeria is found mainly in the', ['south', 'far north-east', 'Sahel zone', 'north-west'], 0, 'Heavy rainfall in southern Nigeria supports rainforest; savanna lies further north.'],
    ['population-settlement', 'The number of people per square kilometre of land is', ['population density', 'population growth rate', 'birth rate', 'population distribution'], 0, 'Population density = population ÷ land area.'],
  ],
};
