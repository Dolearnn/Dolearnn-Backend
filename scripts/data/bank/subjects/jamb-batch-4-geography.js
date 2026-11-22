// JAMB batch 4: Geography. Original questions. Correct answer first; options are shuffled on import.
// Map questions give every needed figure in the text. Time: 15° of longitude = 1 hour, 1° = 4 minutes.
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
    { slug: 'transport-trade', name: 'Transport and Trade' },
    { slug: 'agriculture-industry', name: 'Agriculture and Industry' },
    { slug: 'environmental-hazards', name: 'Environmental Hazards and Conservation' },
    { slug: 'west-africa-africa', name: 'Regional Geography of West Africa and Africa' },
  ],
  questions: [
    // Map scale, distance and area
    ['earth-and-maps', 'On a map of scale 1:25 000, two road junctions are 8 cm apart. What is the actual distance between them?', ['2 km', '20 km', '0.2 km', '8 km'], 0, '8 × 25 000 = 200 000 cm = 2 000 m = 2 km.'],
    ['earth-and-maps', 'A footpath measures 7.5 cm on a map of scale 1:50 000. Its length on the ground is', ['3.75 km', '37.5 km', '0.375 km', '7.5 km'], 0, '7.5 × 50 000 = 375 000 cm = 3 750 m = 3.75 km.'],
    ['earth-and-maps', 'The representative fraction 1:100 000 expressed as a statement scale is', ['1 cm represents 1 km', '1 cm represents 10 km', '1 cm represents 100 m', '1 cm represents 100 km'], 0, '100 000 cm = 1 000 m = 1 km, so each centimetre on the map stands for 1 km.'],
    ['earth-and-maps', 'A map has the statement scale "2 cm represents 1 km". Its representative fraction is', ['1:50 000', '1:20 000', '1:200 000', '1:500 000'], 0, '1 km = 100 000 cm, so 2 cm represents 100 000 cm and 1 cm represents 50 000 cm: 1:50 000.'],
    ['earth-and-maps', 'A road 12 km long is drawn on a map of scale 1:250 000. How long is it on the map?', ['4.8 cm', '48 cm', '3.0 cm', '0.48 cm'], 0, '12 km = 1 200 000 cm; 1 200 000 ÷ 250 000 = 4.8 cm.'],
    ['earth-and-maps', 'A farm appears as a square of side 4 cm on a map of scale 1:50 000. What is its actual area?', ['4 km²', '2 km²', '16 km²', '8 km²'], 0, 'Each side is 4 × 0.5 km = 2 km, so the area is 2 km × 2 km = 4 km².'],
    ['earth-and-maps', 'On a map of scale 1:20 000, a forest reserve is a rectangle 5 cm by 3 cm. Its area on the ground is', ['0.6 km²', '6 km²', '15 km²', '1.6 km²'], 0, '1 cm = 0.2 km, so the sides are 1 km and 0.6 km; 1 × 0.6 = 0.6 km².'],
    ['earth-and-maps', 'A map of scale 1:25 000 is reduced so that every line is half its former length. The scale of the new map is', ['1:50 000', '1:12 500', '1:25 000', '1:100 000'], 0, 'Halving the map length doubles the ground distance each centimetre represents: 25 000 × 2 = 50 000.'],
    ['earth-and-maps', 'If the linear scale of a map is doubled (for example from 1:50 000 to 1:25 000), the area covered by a given feature on the map becomes', ['four times as large', 'twice as large', 'half as large', 'unchanged'], 0, 'Both length and width double, so map area increases by 2 × 2 = 4 times.'],
    ['earth-and-maps', 'A winding road traced with a thread on a map of scale 1:50 000 measures 9.4 cm. The length of the road is', ['4.7 km', '9.4 km', '47 km', '0.47 km'], 0, '9.4 × 50 000 = 470 000 cm = 4.7 km.'],

    // Relief, contours and gradient
    ['earth-and-maps', 'Contour lines on a map are drawn at 100 m, 120 m, 140 m and 160 m. The vertical interval is', ['20 m', '100 m', '60 m', '40 m'], 0, 'The vertical interval is the constant height difference between successive contours: 120 − 100 = 20 m.'],
    ['earth-and-maps', 'Point A is 450 m above sea level and point B is 150 m above sea level. They are 3 km apart horizontally. The average gradient between them is', ['1 in 10', '1 in 15', '1 in 100', '1 in 30'], 0, 'Vertical interval = 300 m, horizontal equivalent = 3 000 m; 300/3 000 = 1/10.'],
    ['earth-and-maps', 'On a map of scale 1:25 000, two points 6 cm apart lie on contours of 350 m and 250 m. The average gradient is', ['1 in 15', '1 in 25', '1 in 6', '1 in 60'], 0, 'HE = 6 × 25 000 = 150 000 cm = 1 500 m; VI = 100 m; gradient = 100/1 500 = 1 in 15.'],
    ['earth-and-maps', 'A slope has a gradient of 1 in 25. If the vertical interval is 40 m, the horizontal equivalent is', ['1 000 m', '65 m', '625 m', '400 m'], 0, 'Gradient = VI/HE, so HE = 40 × 25 = 1 000 m.'],
    ['earth-and-maps', 'Contour lines that are very close together on a map indicate', ['a steep slope', 'a gentle slope', 'flat land', 'a river'], 0, 'Closely spaced contours mean height changes quickly over a short distance.'],
    ['earth-and-maps', 'On a contour map, contours that are widely spaced near the top of a slope and close together near the bottom show a', ['convex slope', 'concave slope', 'uniform slope', 'terraced slope'], 0, 'Steepness increases downhill, so the slope bulges outwards: a convex slope.'],
    ['earth-and-maps', 'A series of V-shaped contours whose V points towards higher ground represents a', ['valley', 'spur', 'ridge', 'col'], 0, 'In a valley the contours bend upstream, i.e. the V points uphill; a spur\'s V points downhill.'],
    ['earth-and-maps', 'A low point on a ridge between two higher summits, shown on a contour map, is a', ['col (saddle)', 'spur', 'knoll', 'escarpment'], 0, 'A col or saddle is a dip in a ridge linking two hills.'],
    ['earth-and-maps', 'Which method of showing relief uses short lines drawn in the direction of the steepest slope?', ['hachures', 'spot heights', 'layer tints', 'trigonometrical stations'], 0, 'Hachures are short strokes along the slope; they are thicker and closer on steep ground.'],

    // Bearing and grid references
    ['earth-and-maps', 'Town Q lies exactly south-west of town P. The bearing of Q from P is', ['225°', '135°', '315°', '045°'], 0, 'Bearings are measured clockwise from north: south is 180°, south-west is 180° + 45° = 225°.'],
    ['earth-and-maps', 'The bearing of a school from a church is 065°. The bearing of the church from the school is', ['245°', '115°', '295°', '025°'], 0, 'A back bearing differs by 180°: 065° + 180° = 245°.'],
    ['earth-and-maps', 'In a six-figure grid reference such as 346723, the first three figures give the', ['easting', 'northing', 'height of the point', 'map sheet number'], 0, 'Eastings (read along the bottom) are always given before northings: "along the corridor, then up the stairs".'],
    ['earth-and-maps', 'A well lies in the grid square whose south-west corner is formed by easting 34 and northing 72. It is 6/10 of the way across the square eastwards and 3/10 of the way up. Its six-figure grid reference is', ['346723', '723346', '343726', '346372'], 0, 'Easting 34 + 6 tenths = 346; northing 72 + 3 tenths = 723; eastings first gives 346723.'],

    // Latitude, longitude and time
    ['earth-and-maps', 'When the local time at a place on longitude 30°E is 2:00 p.m., what is the local time at a place on longitude 15°W?', ['11:00 a.m.', '5:00 p.m.', '1:00 p.m.', '3:00 p.m.'], 0, 'Difference = 30 + 15 = 45° = 3 hours. The western place is behind: 2:00 p.m. − 3 h = 11:00 a.m.'],
    ['earth-and-maps', 'It is 12 noon at Greenwich (0°). What is the local time at a place on longitude 75°W?', ['7:00 a.m.', '5:00 p.m.', '9:00 a.m.', '6:00 a.m.'], 0, '75 ÷ 15 = 5 hours. Places west of Greenwich are behind, so 12 noon − 5 h = 7:00 a.m.'],
    ['earth-and-maps', 'The local time at a town on longitude 20°E is 12 noon. What is the local time at a town on longitude 7°E?', ['11:08 a.m.', '12:52 p.m.', '11:52 a.m.', '10:08 a.m.'], 0, 'Difference = 13° × 4 minutes = 52 minutes. The town further west is behind: 12:00 − 52 min = 11:08 a.m.'],
    ['earth-and-maps', 'When it is 12 noon at Greenwich, the local time at a town is 3:00 p.m. The longitude of the town is', ['45°E', '45°W', '30°E', '60°E'], 0, '3 hours × 15° = 45°. The town is ahead of Greenwich, so it lies east: 45°E.'],
    ['earth-and-maps', 'The local time at a place is 8:00 a.m. when it is 12 noon at Greenwich. The place is on longitude', ['60°W', '60°E', '40°W', '120°W'], 0, 'The place is 4 hours behind: 4 × 15° = 60°, and being behind means it is west: 60°W.'],
    ['earth-and-maps', 'An aircraft leaves a city on longitude 0° at 10:00 a.m. local time and flies for 5 hours to a city on longitude 45°W. What is the local time on arrival?', ['12:00 noon', '3:00 p.m.', '6:00 p.m.', '2:00 p.m.'], 0, 'At departure point arrival is 3:00 p.m. The destination is 45° ÷ 15 = 3 hours behind, so local time is 3:00 p.m. − 3 h = 12 noon.'],
    ['earth-and-maps', 'Two places differ in local time by 1 hour 20 minutes. Their difference in longitude is', ['20°', '15°', '80°', '25°'], 0, '1 h 20 min = 80 minutes; at 4 minutes per degree, 80 ÷ 4 = 20°.'],
    ['earth-and-maps', 'Two towns lie on the same meridian at latitudes 4°N and 12°N. Taking 1° of latitude as about 111 km, the distance between them is about', ['888 km', '1 776 km', '444 km', '1 332 km'], 0, 'Difference in latitude = 12 − 4 = 8°; 8 × 111 = 888 km.'],
    ['earth-and-maps', 'A ship sailing eastwards crosses the International Date Line on a Tuesday. The date on board should be changed to', ['Monday', 'Wednesday', 'Thursday', 'Sunday'], 0, 'Crossing the Date Line from west to east (travelling eastwards), one repeats a day, so Tuesday becomes Monday.'],
    ['earth-and-maps', 'Which line of latitude is about 66½°N?', ['Arctic Circle', 'Tropic of Cancer', 'Antarctic Circle', 'Tropic of Capricorn'], 0, 'The Arctic Circle is at about 66½°N; the Tropic of Cancer is at about 23½°N.'],

    // Earth and the solar system
    ['earth-and-maps', 'Which planet is nearest to the sun?', ['Mercury', 'Venus', 'Mars', 'Earth'], 0, 'The order outwards from the sun begins Mercury, Venus, Earth, Mars.'],
    ['earth-and-maps', 'The rotation of the earth on its axis causes', ['day and night', 'the seasons', 'the varying length of the year', 'eclipses of the moon'], 0, 'One rotation (about 24 hours) brings each place into sunlight and then darkness.'],
    ['earth-and-maps', 'The midday sun is overhead at the Tropic of Cancer on about', ['21 June', '21 March', '23 September', '22 December'], 0, 'The June solstice (about 21 June) is when the overhead sun reaches 23½°N.'],
    ['earth-and-maps', 'The changing seasons on earth are caused mainly by', ['the tilt of the earth\'s axis as it revolves round the sun', 'the rotation of the earth on its axis', 'changes in the distance between the earth and the moon', 'the speed of the earth\'s rotation'], 0, 'Because the axis is tilted about 23½° from the vertical, the overhead sun shifts between the tropics during the year.'],
    ['earth-and-maps', 'A solar eclipse occurs when', ['the moon passes between the sun and the earth', 'the earth passes between the sun and the moon', 'the sun passes between the earth and the moon', 'the moon is furthest from the earth'], 0, 'The moon blocks the sun\'s light from part of the earth.'],
    ['earth-and-maps', 'What is the altitude of the midday sun at a town on latitude 10°N on 21 March?', ['80°', '90°', '10°', '70°'], 0, 'On 21 March the sun is overhead at the Equator. Altitude = 90° − 10° = 80°.'],
    ['earth-and-maps', 'Taking the overhead sun on 21 June as being at 23½°N, the altitude of the midday sun at a place on latitude 20°N is', ['86½°', '93½°', '66½°', '70°'], 0, 'Angular distance from the overhead sun = 23½ − 20 = 3½°; altitude = 90 − 3½ = 86½°.'],
    ['earth-and-maps', 'Taking the overhead sun on 22 December as being at 23½°S, the altitude of the midday sun at a place on latitude 10°N is', ['56½°', '76½°', '33½°', '80°'], 0, 'Angular distance = 10 + 23½ = 33½° (opposite hemispheres); altitude = 90 − 33½ = 56½°.'],
    ['earth-and-maps', 'The boundary between the earth\'s crust and the mantle is called the', ['Mohorovičić discontinuity', 'Gutenberg discontinuity', 'ozone layer', 'tropopause'], 0, 'The Moho separates the crust from the mantle; the Gutenberg discontinuity separates the mantle from the core.'],

    // Rocks and earth movements
    ['physical-geography', 'Marble is a metamorphic rock formed from', ['limestone', 'shale', 'sandstone', 'granite'], 0, 'Heat and pressure recrystallise limestone into marble.'],
    ['physical-geography', 'Which of these is an example of an organically formed sedimentary rock?', ['coal', 'granite', 'basalt', 'quartzite'], 0, 'Coal forms from compressed plant remains; granite and basalt are igneous; quartzite is metamorphic.'],
    ['physical-geography', 'A sheet of igneous rock that cuts ACROSS the bedding planes of the surrounding rocks is a', ['dyke', 'sill', 'batholith', 'lava plateau'], 0, 'A dyke is discordant (cuts across layers); a sill is concordant (lies along them).'],
    ['physical-geography', 'Basalt is described as an extrusive igneous rock because it', ['cooled from lava at the earth\'s surface', 'formed from layers of sediment', 'formed deep underground from slowly cooling magma', 'was changed by heat and pressure'], 0, 'Extrusive rocks cool quickly at the surface and so have small crystals.'],
    ['physical-geography', 'The upfold produced when rock layers are compressed is called', ['an anticline', 'a syncline', 'a graben', 'a horst'], 0, 'An anticline is an upfold; a syncline is a downfold.'],
    ['physical-geography', 'A rift valley is formed when', ['a block of land sinks between two roughly parallel faults', 'a river erodes downwards for a long time', 'a glacier deepens a valley', 'rock layers are folded downwards'], 0, 'The sunken block between parallel faults forms the floor of a rift valley (graben).'],
    ['physical-geography', 'The point on the earth\'s surface directly above the origin of an earthquake is the', ['epicentre', 'focus', 'crater', 'fault scarp'], 0, 'The focus is the point of origin underground; the epicentre is directly above it.'],
    ['physical-geography', 'A large basin-shaped depression formed when the top of a volcano collapses or is blown away is a', ['caldera', 'crater lake', 'geyser', 'cinder cone'], 0, 'A caldera is much larger than an ordinary crater.'],

    // Weathering
    ['physical-geography', 'The peeling off of outer layers of rock due to repeated heating by day and cooling by night is', ['exfoliation', 'carbonation', 'hydrolysis', 'frost shattering'], 0, 'Exfoliation (onion weathering) is common in hot deserts with large daily temperature ranges.'],
    ['physical-geography', 'Rainwater containing dissolved carbon dioxide attacks limestone mainly by', ['carbonation', 'oxidation', 'exfoliation', 'abrasion'], 0, 'Weak carbonic acid reacts with calcium carbonate to form soluble calcium bicarbonate.'],
    ['physical-geography', 'The reddish colour of many tropical soils and rocks results mainly from', ['oxidation of iron compounds', 'carbonation of limestone', 'frost shattering', 'deposition of salt'], 0, 'Iron in minerals reacts with oxygen to form red iron oxides.'],
    ['physical-geography', 'Chemical weathering is most rapid in regions that are', ['hot and wet', 'cold and dry', 'hot and dry', 'cold and windy'], 0, 'Chemical reactions speed up with heat and need moisture, as in equatorial regions.'],

    // Limestone (karst) landforms
    ['physical-geography', 'An icicle-like column of calcium carbonate hanging from the roof of a limestone cave is a', ['stalactite', 'stalagmite', 'pillar', 'clint'], 0, 'Stalactites hang down from the roof; stalagmites build up from the floor.'],

    // Rivers
    ['physical-geography', 'The boundary separating two neighbouring river basins is the', ['watershed', 'confluence', 'tributary', 'estuary'], 0, 'A watershed is high ground dividing the areas drained by different rivers.'],
    ['physical-geography', 'A channel that branches off the main river and flows away from it, usually in a delta, is a', ['distributary', 'tributary', 'meander', 'levee'], 0, 'Tributaries flow into a main river; distributaries flow out of it.'],
    ['physical-geography', 'Which feature is typical of the upper (youthful) course of a river?', ['interlocking spurs', 'levees', 'ox-bow lakes', 'a wide flood plain'], 0, 'In the upper course vertical erosion produces V-shaped valleys, interlocking spurs and waterfalls.'],
    ['physical-geography', 'Natural embankments built along the banks of a river by deposition during floods are', ['levees', 'spurs', 'gorges', 'meander scars'], 0, 'When a river overflows, coarse material is dropped first near the banks, building levees.'],
    ['physical-geography', 'The wearing away of a river bed by the load the river carries is', ['abrasion (corrasion)', 'attrition', 'solution', 'hydraulic action'], 0, 'Abrasion is erosion by the load rubbing the bed and banks; attrition is the load wearing itself down.'],
    ['physical-geography', 'A river transports sand grains in a series of short hops along its bed. This process is', ['saltation', 'traction', 'suspension', 'solution'], 0, 'Saltation is bouncing movement; traction is rolling of heavier boulders.'],
    ['physical-geography', 'A drainage pattern in which streams flow outwards in all directions from a central dome or volcano is', ['radial', 'dendritic', 'trellis', 'centripetal'], 0, 'Radial drainage spreads out like spokes from a central high point.'],
    ['physical-geography', 'River capture (piracy) occurs when', ['a more vigorous river erodes headwards and diverts the headwaters of another river', 'a river is dammed for irrigation', 'two rivers meet at a confluence', 'a river builds a delta'], 0, 'The captured river is left as a misfit stream beyond the elbow of capture.'],
    ['physical-geography', 'A delta is LEAST likely to form where', ['strong tides and currents sweep sediment away from the river mouth', 'a river carries a large load', 'the sea is shallow near the coast', 'the sea is fairly calm'], 0, 'Deltas need deposition to exceed removal; strong tides and currents prevent build-up, often giving an estuary instead.'],

    // Coasts
    ['physical-geography', 'A ridge of sand or shingle attached to the land at one end and extending into the sea is a', ['spit', 'tombolo', 'stack', 'wave-cut platform'], 0, 'Longshore drift carries material along the coast and builds spits where the coast changes direction.'],
    ['physical-geography', 'The correct order in which coastal erosion develops a headland feature is', ['cave → arch → stack → stump', 'arch → cave → stump → stack', 'stack → arch → cave → stump', 'stump → stack → arch → cave'], 0, 'Waves enlarge a cave into an arch; the arch collapses leaving a stack, which is worn down to a stump.'],
    ['physical-geography', 'The movement of beach material along a coast by waves approaching at an angle is', ['longshore drift', 'backwash', 'deflation', 'rip current'], 0, 'Swash moves material up the beach at an angle and backwash returns it straight down, zig-zagging it along the shore.'],
    ['physical-geography', 'A long, narrow, steep-sided inlet formed when a glaciated valley is drowned by the sea is a', ['fjord', 'ria', 'lagoon', 'estuary'], 0, 'Fjords are drowned U-shaped glacial valleys; rias are drowned river valleys.'],
    ['physical-geography', 'Low walls of wood or concrete built at right angles to a beach to reduce longshore drift are', ['groynes', 'sea walls', 'breakwaters', 'levees'], 0, 'Groynes trap sand on their up-drift side, protecting the beach.'],

    // Deserts
    ['physical-geography', 'A crescent-shaped sand dune with horns pointing downwind is a', ['barchan', 'seif', 'yardang', 'zeugen'], 0, 'Barchans form where wind blows steadily from one direction; seifs are long, ridge-like dunes.'],
    ['physical-geography', 'The removal of loose sand and dust by wind is', ['deflation', 'abrasion', 'exfoliation', 'attrition'], 0, 'Deflation can lower the land to form deflation hollows.'],
    ['physical-geography', 'A rock pillar with a narrow base undercut by wind-blown sand is a', ['mushroom (pedestal) rock', 'stack', 'stalagmite', 'inselberg'], 0, 'Sand blasting is strongest near the ground, undercutting the base.'],
    ['physical-geography', 'A fertile spot in a desert where underground water reaches the surface is', ['an oasis', 'a wadi', 'a reg', 'a bajada'], 0, 'Oases support date palms and settlement.'],

    // Glaciation
    ['physical-geography', 'An armchair-shaped hollow on a mountainside formed by glacial erosion is a', ['cirque (corrie)', 'drumlin', 'moraine', 'esker'], 0, 'Ice plucks and grinds out a cirque at the head of a glacier.'],
    ['physical-geography', 'Unsorted rock debris deposited by a glacier is called', ['moraine (boulder clay)', 'alluvium', 'loess', 'laterite'], 0, 'Glaciers drop their load unsorted as moraine.'],
    ['physical-geography', 'A valley eroded by a glacier usually has a', ['U-shaped cross-section', 'V-shaped cross-section', 'braided channel', 'wide delta'], 0, 'Glaciers erode the floor and sides, producing a U-shaped trough.'],

    // Weather and climate
    ['climate-vegetation', 'An anemometer measures', ['wind speed', 'wind direction', 'humidity', 'sunshine duration'], 0, 'Rotating cups spin faster as wind speed increases; a wind vane shows direction.'],
    ['climate-vegetation', 'The instrument used to measure the relative humidity of air is the', ['hygrometer (wet-and-dry bulb thermometer)', 'anemometer', 'rain gauge', 'Campbell-Stokes recorder'], 0, 'The difference between wet- and dry-bulb readings gives the relative humidity.'],
    ['climate-vegetation', 'The maximum and minimum temperatures of a day are recorded by', ['Six\'s thermometer', 'a barometer', 'a wind vane', 'a hygrometer'], 0, 'Six\'s thermometer has indices that mark the highest and lowest temperatures reached.'],
    ['climate-vegetation', 'Thermometers at a weather station are kept in a Stevenson screen mainly to', ['shield them from direct sunlight and rain while allowing air to circulate', 'keep them warm at night', 'protect them from wind direction changes', 'measure atmospheric pressure'], 0, 'The white louvred box ensures readings show the true air temperature in the shade.'],
    ['climate-vegetation', 'Lines on a map joining places with equal rainfall are', ['isohyets', 'isotherms', 'isobars', 'isohels'], 0, 'Isohyets = rainfall; isotherms = temperature; isobars = pressure; isohels = sunshine.'],
    ['climate-vegetation', 'A town records a maximum temperature of 31°C and a minimum of 21°C in one day. Its mean daily temperature is', ['26°C', '10°C', '52°C', '21°C'], 0, 'Mean = (31 + 21) ÷ 2 = 26°C.'],
    ['climate-vegetation', 'A station has its hottest month at 32°C and its coolest month at 24°C. Its annual range of temperature is', ['8°C', '28°C', '56°C', '24°C'], 0, 'Annual range = highest monthly mean − lowest monthly mean = 32 − 24 = 8°C.'],
    ['climate-vegetation', 'Temperature falls by about 0.6°C for every 100 m rise in height. If a coastal town at sea level records 28°C, the expected temperature on a plateau 1 500 m high is', ['19°C', '9°C', '22°C', '37°C'], 0, 'Fall = 15 × 0.6 = 9°C, so 28 − 9 = 19°C.'],
    ['climate-vegetation', 'Air at a certain temperature holds 12 g of water vapour per cubic metre but could hold 16 g when saturated. Its relative humidity is', ['75%', '25%', '133%', '4%'], 0, 'RH = actual ÷ maximum × 100 = 12 ÷ 16 × 100 = 75%.'],
    ['climate-vegetation', 'The temperature at which air becomes saturated and condensation begins is the', ['dew point', 'boiling point', 'freezing point', 'lapse rate'], 0, 'Cooling air to its dew point brings condensation as dew, fog or cloud.'],
    ['climate-vegetation', 'Rainfall that results from strong heating of the ground, rising air and towering cumulonimbus clouds, often with thunder, is', ['convectional rainfall', 'frontal rainfall', 'relief rainfall', 'cyclonic drizzle'], 0, 'Intense surface heating causes rapid uplift; this is typical of equatorial afternoons.'],
    ['climate-vegetation', 'The leeward side of a mountain that receives little rainfall is called the', ['rain shadow', 'windward slope', 'doldrums', 'frontal zone'], 0, 'Descending air warms and dries, so the sheltered side is dry.'],
    ['climate-vegetation', 'The low-pressure belt of calm winds near the Equator where the trade winds meet is the', ['doldrums', 'horse latitudes', 'westerlies', 'polar front'], 0, 'The doldrums lie in the equatorial low-pressure belt.'],
    ['climate-vegetation', 'A climate with hot, dry summers and mild, wet winters is the', ['Mediterranean climate', 'equatorial climate', 'tropical continental climate', 'tundra climate'], 0, 'Mediterranean lands get rain from westerly winds in winter only.'],
    ['climate-vegetation', 'The equatorial climate is characterised by', ['high temperatures all year, a small annual range and rainfall in every month', 'a long dry season and a short wet season', 'hot summers and very cold winters', 'very low rainfall and a large daily range'], 0, 'Near the Equator the sun is always high, giving uniform heat and convectional rain throughout the year.'],
    ['climate-vegetation', 'Cold ocean currents along a coast tend to cause', ['dry conditions on the neighbouring land', 'heavy rainfall on the neighbouring land', 'higher winter temperatures inland', 'tropical cyclones'], 0, 'Air passing over cold water is cooled and stable, so little rain falls: e.g. the Benguela current and the Namib Desert.'],

    // Vegetation and soils
    ['climate-vegetation', 'Plants adapted to survive in very dry conditions, e.g. by having thick, waxy leaves or deep roots, are called', ['xerophytes', 'hydrophytes', 'epiphytes', 'halophytes'], 0, 'Xerophytes reduce water loss; hydrophytes grow in water; halophytes tolerate salt.'],
    ['climate-vegetation', 'Woody climbing plants that hang from trees in the tropical rainforest are', ['lianas', 'epiphytes', 'buttress roots', 'conifers'], 0, 'Lianas root in the ground and climb towards the light.'],
    ['climate-vegetation', 'The temperate grasslands of Argentina are called the', ['Pampas', 'Veld', 'Steppes', 'Prairies'], 0, 'Pampas (Argentina), Veld (South Africa), Steppes (Eurasia), Prairies (North America).'],
    ['climate-vegetation', 'Coniferous forests are found mainly in', ['cool temperate regions such as Canada and Siberia', 'equatorial lowlands', 'hot deserts', 'Mediterranean coasts'], 0, 'The taiga stretches across the cool northern lands; conifers yield softwood.'],
    ['climate-vegetation', 'The process by which heavy rainfall washes soluble minerals down out of the topsoil is', ['leaching', 'weathering', 'humification', 'capillarity'], 0, 'Leaching makes many tropical soils poor in plant nutrients.'],
    ['climate-vegetation', 'The decomposed organic matter in soil is called', ['humus', 'laterite', 'loam', 'bedrock'], 0, 'Humus darkens the soil and improves its fertility and water retention.'],
    ['climate-vegetation', 'In a soil profile, the horizon made up mainly of weathered parent material is the', ['C horizon', 'A horizon', 'O horizon', 'B horizon'], 0, 'The C horizon lies just above the bedrock and consists of partly weathered rock.'],
    ['climate-vegetation', 'A soil that is a fairly even mixture of sand, silt and clay is', ['loam', 'laterite', 'peat', 'gravel'], 0, 'Loam drains well yet holds moisture and nutrients, so it is ideal for farming.'],
    ['climate-vegetation', 'A sequence of different soils found down a slope from hilltop to valley floor on the same parent rock is a', ['soil catena', 'soil horizon', 'soil profile', 'soil texture'], 0, 'Drainage and erosion change down the slope, giving a catena of related soils.'],

    // Environmental hazards and conservation
    ['environmental-hazards', 'The spread of desert-like conditions into formerly productive dry lands is', ['desertification', 'deforestation', 'afforestation', 'urbanisation'], 0, 'Overgrazing, over-cultivation, tree cutting and drought all contribute.'],
    ['environmental-hazards', 'Ploughing along the contours of a slope helps mainly to', ['reduce soil erosion by run-off', 'increase leaching', 'speed up surface run-off', 'drain swamps'], 0, 'Furrows across the slope hold back water and soil.'],
    ['environmental-hazards', 'The deep, branching channels cut into the land in parts of south-eastern Nigeria such as Anambra State are an example of', ['gully erosion', 'sheet erosion', 'wind erosion', 'coastal erosion'], 0, 'Concentrated run-off on loose sandy soils cuts deep gullies.'],
    ['environmental-hazards', 'Planting trees in areas where there were none before is', ['afforestation', 'deforestation', 'shifting cultivation', 'overgrazing'], 0, 'Afforestation creates new forest; reforestation replaces cut trees.'],
    ['environmental-hazards', 'Which gas is the main contributor to the enhanced greenhouse effect from burning fossil fuels?', ['carbon dioxide', 'oxygen', 'nitrogen', 'argon'], 0, 'Burning coal, oil and gas releases carbon dioxide, which traps outgoing heat.'],
    ['environmental-hazards', 'Acid rain is caused mainly by emissions of', ['sulphur dioxide and nitrogen oxides', 'oxygen and ozone', 'water vapour and argon', 'methane and helium'], 0, 'These gases dissolve in rainwater to form weak sulphuric and nitric acids.'],
    ['environmental-hazards', 'Chlorofluorocarbons (CFCs) are harmful to the environment because they', ['destroy the ozone layer', 'cause gully erosion', 'increase soil fertility', 'raise sea salinity'], 0, 'CFCs break down stratospheric ozone, which shields the earth from ultraviolet rays.'],
    ['environmental-hazards', 'Oil spillage in the Niger Delta mostly harms', ['farmland, creeks and fishing', 'desert oases', 'montane grassland', 'tin mining'], 0, 'Spilled crude coats the soil and water, killing fish and crops.'],
    ['environmental-hazards', 'Cutting terraces into steep hillsides is mainly done to', ['check soil erosion and create level farmland', 'increase run-off', 'drain lakes', 'speed up weathering'], 0, 'Terraces slow the flow of water down the slope.'],

    // Population and settlement
    ['population-settlement', 'A country with 2 000 000 people living on 50 000 km² of land has a population density of', ['40 persons per km²', '25 persons per km²', '400 persons per km²', '4 persons per km²'], 0, '2 000 000 ÷ 50 000 = 40 persons per km².'],
    ['population-settlement', 'A country has a birth rate of 40 per 1 000 and a death rate of 15 per 1 000. Its rate of natural increase is', ['2.5%', '25%', '5.5%', '0.25%'], 0, '40 − 15 = 25 per 1 000 = 2.5%.'],
    ['population-settlement', 'Using the "rule of 70", a population growing steadily at 3.5% a year will double in about', ['20 years', '35 years', '70 years', '10 years'], 0, 'Doubling time ≈ 70 ÷ growth rate = 70 ÷ 3.5 = 20 years.'],
    ['population-settlement', 'A population has 40% aged under 15, 4% aged over 64, and 56% aged 15 to 64. Its dependency ratio is about', ['79', '44', '56', '127'], 0, 'Dependency ratio = (40 + 4) ÷ 56 × 100 ≈ 78.6, i.e. about 79 dependants per 100 workers.'],
    ['population-settlement', 'A town has 520 males and 500 females. Its sex ratio (males per 100 females) is', ['104', '96', '52', '1 020'], 0, '520 ÷ 500 × 100 = 104.'],
    ['population-settlement', 'A population pyramid with a very broad base and a narrow top indicates', ['high birth rate and short life expectancy', 'low birth rate and long life expectancy', 'a declining population', 'many elderly people'], 0, 'Many children and few old people are typical of a developing country.'],
    ['population-settlement', 'A country whose population is too large for its resources to support a good standard of living is', ['overpopulated', 'underpopulated', 'at optimum population', 'depopulated'], 0, 'Overpopulation is measured against resources and technology, not just numbers.'],
    ['population-settlement', 'Lack of jobs and poor social amenities in the countryside that drive people to the city are called', ['push factors', 'pull factors', 'intervening obstacles', 'barriers to migration'], 0, 'Push factors drive people away; pull factors attract them to a destination.'],
    ['population-settlement', 'The actual land on which a settlement is built is its', ['site', 'situation', 'hinterland', 'function'], 0, 'Site is the ground occupied; situation is the position relative to surrounding areas.'],
    ['population-settlement', 'The commercial heart of a city with the highest land values, banks and offices is the', ['central business district (CBD)', 'suburb', 'rural-urban fringe', 'green belt'], 0, 'Accessibility makes CBD land the most expensive.'],
    ['population-settlement', 'A town that grows where several routes meet is described as', ['a nodal town', 'a dispersed settlement', 'a hamlet', 'a dormitory village'], 0, 'Route centres are nodal points attracting trade.'],
    ['population-settlement', 'Which list arranges settlements correctly from smallest to largest?', ['hamlet, village, town, city', 'village, hamlet, city, town', 'town, hamlet, village, city', 'city, town, village, hamlet'], 0, 'The settlement hierarchy rises from hamlet to village, town, city and conurbation.'],
    ['population-settlement', 'Overcrowded, poorly serviced housing areas in large cities are called', ['slums', 'central business districts', 'industrial estates', 'green belts'], 0, 'Rapid urbanisation without planning produces slums and shanty towns.'],

    // Transport and trade
    ['transport-trade', 'The most suitable means of transporting fresh flowers and other perishable, high-value goods between continents is by', ['air', 'sea', 'rail', 'pipeline'], 0, 'Air transport is fast, offsetting its high cost for light, valuable or perishable goods.'],
    ['transport-trade', 'Packing goods in standard-sized steel boxes that move easily between ships, trains and lorries is', ['containerisation', 'transhumance', 'entrepôt trade', 'bulk breaking'], 0, 'Containers cut handling costs and reduce theft and damage.'],
    ['transport-trade', 'A port that imports goods mainly to re-export them to other countries is', ['an entrepôt', 'a fishing port', 'a dry port', 'a naval base'], 0, 'Entrepôt ports such as Singapore thrive on re-export trade.'],
    ['transport-trade', 'The area from which a port draws its exports and to which it sends its imports is its', ['hinterland', 'foreland', 'catchment basin', 'continental shelf'], 0, 'The hinterland is the inland area served by the port.'],
    ['transport-trade', 'The difference between the value of a country\'s visible exports and visible imports is the', ['balance of trade', 'balance of payments', 'terms of trade', 'national income'], 0, 'Balance of trade covers visible goods only; balance of payments includes all transactions.'],
    ['transport-trade', 'The Economic Community of West African States (ECOWAS) was established in 1975 mainly to', ['promote economic integration and trade among member states', 'unite all African armies', 'control world oil prices', 'replace the African Union'], 0, 'The Treaty of Lagos (1975) set up ECOWAS to encourage cooperation and trade.'],
    ['transport-trade', 'A major disadvantage of road transport compared with rail for long-distance bulk haulage is that it', ['carries smaller loads at a higher cost per tonne-kilometre', 'cannot provide door-to-door service', 'is less flexible in its routes', 'needs ports to operate'], 0, 'Lorries carry less per trip, so moving bulky goods far by road costs more.'],
    ['transport-trade', 'Inland water transport in Nigeria is hindered mainly by', ['seasonal fluctuations in river levels and sandbars', 'too many seaports', 'the absence of rivers', 'a lack of rainfall throughout the year'], 0, 'Low water in the dry season and shifting sandbanks make many rivers unreliable for navigation.'],

    // Agriculture and industry
    ['agriculture-industry', 'A system in which farmers clear and crop a piece of land for a few years and then move the whole homestead to a new area is', ['shifting cultivation', 'bush fallowing', 'mixed farming', 'plantation agriculture'], 0, 'In shifting cultivation the settlement moves; in bush fallowing the village stays and only the farmland rotates.'],
    ['agriculture-industry', 'The seasonal movement of herders and their animals between dry-season and wet-season pastures is', ['transhumance', 'shifting cultivation', 'ranching', 'intercropping'], 0, 'Herders move south in the dry season and north in the rains in West Africa.'],
    ['agriculture-industry', 'Growing a single cash crop on a large estate with heavy capital investment and hired labour is', ['plantation agriculture', 'subsistence farming', 'nomadic herding', 'bush fallowing'], 0, 'Plantations specialise in crops such as rubber, oil palm or tea.'],
    ['agriculture-industry', 'An industry that uses a bulky raw material which loses much weight in processing tends to be located', ['near the source of the raw material', 'near the market', 'anywhere at random', 'only at seaports'], 0, 'Processing close to the source saves the cost of transporting waste.'],
    ['agriculture-industry', 'Industries that are not tied to raw materials or power sources and can locate almost anywhere are', ['footloose industries', 'extractive industries', 'heavy industries', 'primary industries'], 0, 'Footloose industries, such as electronics assembly, use light, easily moved inputs.'],
    ['agriculture-industry', 'Mining, fishing and lumbering are examples of', ['primary (extractive) activities', 'secondary activities', 'tertiary activities', 'quaternary activities'], 0, 'Primary activities take resources directly from nature.'],
    ['agriculture-industry', 'Banking, transport and teaching are examples of', ['tertiary activities', 'primary activities', 'secondary activities', 'extractive activities'], 0, 'Tertiary activities provide services.'],
    ['agriculture-industry', 'Rich fishing grounds such as the Grand Banks off Newfoundland occur where', ['warm and cold ocean currents meet over a shallow continental shelf', 'deep ocean trenches lie close to the coast', 'rivers carry no sediment', 'water is warm and very deep'], 0, 'Shallow, well-lit water mixed by meeting currents supports plankton on which fish feed.'],
    ['agriculture-industry', 'Producing goods locally that were formerly imported, in order to save foreign exchange, is', ['import substitution', 'dumping', 'export promotion', 'entrepôt trade'], 0, 'Import-substitution industries replace imported goods with home-made ones.'],
    ['agriculture-industry', 'Small farm size, lack of credit and poor storage are major problems of', ['peasant agriculture in Nigeria', 'mechanised plantation farming in Europe', 'commercial ranching in Argentina', 'dairy farming in Denmark'], 0, 'Most Nigerian farmers are smallholders with limited capital and facilities.'],

    // Geography of Nigeria
    ['geography-of-nigeria', 'The highest point in Nigeria, Chappal Waddi, is located in', ['Taraba State', 'Plateau State', 'Ondo State', 'Kano State'], 0, 'Chappal Waddi (about 2 419 m) is in the Gotel Mountains near the Mambilla Plateau, Taraba State.'],
    ['geography-of-nigeria', 'Tin and columbite have long been mined in Nigeria on the', ['Jos Plateau', 'Udi Plateau', 'Obudu Plateau', 'Mambilla Plateau'], 0, 'Alluvial tin and columbite occur in the Younger Granite areas of the Jos Plateau.'],
    ['geography-of-nigeria', 'Coal in Nigeria has been mined mainly around', ['Enugu', 'Kaduna', 'Sokoto', 'Lagos'], 0, 'The Udi Plateau near Enugu holds Nigeria\'s main coal deposits.'],
    ['geography-of-nigeria', 'Iron ore that feeds the Ajaokuta steel complex comes mainly from', ['Itakpe', 'Oloibiri', 'Ewekoro', 'Bonny'], 0, 'Itakpe in Kogi State has Nigeria\'s main iron ore deposit.'],
    ['geography-of-nigeria', 'Crude oil was first discovered in commercial quantities in Nigeria at Oloibiri in', ['1956', '1946', '1966', '1976'], 0, 'Shell-BP struck oil at Oloibiri (present Bayelsa State) in 1956.'],
    ['geography-of-nigeria', 'Bitumen deposits in Nigeria are found mainly in', ['Ondo State', 'Borno State', 'Kano State', 'Plateau State'], 0, 'Large bitumen deposits stretch across Ondo State and neighbouring areas.'],
    ['geography-of-nigeria', 'Limestone for cement manufacture is quarried at', ['Ewekoro', 'Jos', 'Itakpe', 'Oloibiri'], 0, 'Ewekoro in Ogun State has a long-established cement works using local limestone.'],
    ['geography-of-nigeria', 'The vegetation belt that covers the largest part of Nigeria is', ['Guinea savanna', 'mangrove swamp', 'Sahel savanna', 'montane forest'], 0, 'Guinea savanna spreads across the Middle Belt of Nigeria.'],
    ['geography-of-nigeria', 'The vegetation belt with short grasses, thorny shrubs and the lowest rainfall in Nigeria, found in the far north-east, is the', ['Sahel savanna', 'Guinea savanna', 'freshwater swamp forest', 'derived savanna'], 0, 'The Sahel belt near Lake Chad receives the least rainfall.'],
    ['geography-of-nigeria', 'The rain-bearing wind that blows over Nigeria from the Atlantic Ocean is the', ['south-west monsoon (tropical maritime air)', 'north-east trade wind (harmattan)', 'westerlies', 'polar easterlies'], 0, 'Moist tropical maritime air from the south-west brings the rainy season.'],
    ['geography-of-nigeria', 'In Nigeria, the length of the rainy season generally', ['decreases from south to north', 'increases from south to north', 'is the same everywhere', 'decreases from east to west'], 0, 'Moist air reaches the south first and the far north for only a few months.'],
    ['geography-of-nigeria', 'The rivers of north-eastern Nigeria such as the Komadugu-Yobe drain mainly into', ['Lake Chad', 'the Atlantic Ocean via the Niger', 'Kainji Lake', 'the Benue'], 0, 'The Chad Basin is an area of inland drainage.'],
    ['geography-of-nigeria', 'The Shiroro hydroelectric dam is on the', ['River Kaduna', 'River Niger', 'River Benue', 'River Ogun'], 0, 'Shiroro Dam in Niger State is built on the Kaduna River.'],
    ['geography-of-nigeria', 'Nigeria\'s main cocoa-producing area is the', ['south-west', 'far north', 'Chad Basin', 'Jos Plateau'], 0, 'Ondo, Ogun, Osun, Oyo and Ekiti lie in the cocoa belt of the south-west.'],
    ['geography-of-nigeria', 'Kano became famous for its "groundnut pyramids" because the crop grows well on', ['the light, sandy soils and moderate rainfall of the Sudan savanna', 'the swampy soils of the Niger Delta', 'the leached soils of the rainforest', 'the volcanic soils of the Mambilla Plateau'], 0, 'Groundnuts need a fairly short rainy season and light, well-drained soils.'],
    ['geography-of-nigeria', 'The cool climate of the Jos and Mambilla Plateaux is due mainly to their', ['high altitude', 'nearness to the sea', 'location in the rainforest', 'low latitude'], 0, 'Temperature falls with height, so the plateaux are cooler than surrounding lowlands.'],

    // West Africa and Africa
    ['west-africa-africa', 'The Akosombo Dam, which created Lake Volta, is in', ['Ghana', 'Nigeria', 'Côte d\'Ivoire', 'Togo'], 0, 'Akosombo Dam on the Volta River supplies hydroelectric power to Ghana.'],
    ['west-africa-africa', 'The Fouta Djallon highlands in Guinea are important because they are the source of the rivers', ['Niger, Senegal and Gambia', 'Nile and Congo', 'Volta and Benue', 'Zambezi and Orange'], 0, 'Several of West Africa\'s major rivers rise in the Fouta Djallon.'],
    ['west-africa-africa', 'Guinea is a leading world producer of', ['bauxite', 'copper', 'tin', 'crude oil'], 0, 'Guinea has some of the world\'s largest bauxite (aluminium ore) reserves.'],
    ['west-africa-africa', 'The Copperbelt of Central Africa lies in', ['Zambia and the Democratic Republic of Congo', 'Nigeria and Cameroon', 'Kenya and Uganda', 'Egypt and Sudan'], 0, 'Rich copper deposits straddle the Zambia-DR Congo border.'],
    ['west-africa-africa', 'The highest mountain in Africa is', ['Mount Kilimanjaro', 'Mount Cameroon', 'Mount Kenya', 'Ras Dashen'], 0, 'Kilimanjaro in Tanzania rises to about 5 895 m.'],
    ['west-africa-africa', 'The White Nile flows out of', ['Lake Victoria', 'Lake Tana', 'Lake Chad', 'Lake Volta'], 0, 'The White Nile leaves Lake Victoria; the Blue Nile rises at Lake Tana in Ethiopia.'],
    ['west-africa-africa', 'The Namib Desert on the coast of south-western Africa is dry largely because of the cold', ['Benguela current', 'Canary current', 'Guinea current', 'Agulhas current'], 0, 'The cold Benguela current chills onshore air, preventing rainfall.'],
    ['west-africa-africa', 'The Great Rift Valley of East Africa was formed mainly by', ['faulting', 'glacial erosion', 'river deposition', 'wind erosion'], 0, 'Parallel faults let blocks of crust subside, forming the rift.'],
    ['west-africa-africa', 'The Aswan High Dam, which formed Lake Nasser, is on the River', ['Nile', 'Niger', 'Zambezi', 'Congo'], 0, 'The dam in Egypt controls Nile floods and provides irrigation water and power.'],
  ],
};
