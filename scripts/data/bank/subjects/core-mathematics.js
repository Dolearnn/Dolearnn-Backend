// Original senior-secondary Mathematics questions (no calculus, which WAEC/NECO core Maths excludes).
// Uses the existing Mathematics topics. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'mathematics',
  name: 'Mathematics',
  sortOrder: 2,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'number-numeration', name: 'Number and Numeration' },
    { slug: 'algebra', name: 'Algebra' },
    { slug: 'geometry-mensuration', name: 'Geometry and Mensuration' },
    { slug: 'trigonometry', name: 'Trigonometry' },
    { slug: 'statistics-probability', name: 'Statistics and Probability' },
  ],
  questions: [
    ['number-numeration', 'Simplify 2/3 + 3/4.', ['17/12', '5/7', '5/12', '1/2'], 0, '2/3 = 8/12 and 3/4 = 9/12, so the sum is 17/12.'],
    ['number-numeration', 'Find the simple interest on ₦10,000 at 5% per annum for 3 years.', ['₦1,500', '₦500', '₦15,000', '₦1,000'], 0, 'I = PRT/100 = 10,000 × 5 × 3 ÷ 100 = ₦1,500.'],
    ['algebra', 'Solve 2x − 7 = 11.', ['9', '2', '4', '18'], 0, '2x = 18, so x = 9.'],
    ['algebra', 'Factorise x² − 5x + 6.', ['(x − 2)(x − 3)', '(x + 2)(x + 3)', '(x − 1)(x − 6)', '(x + 1)(x − 6)'], 0, 'Two numbers that multiply to 6 and add to −5 are −2 and −3.'],
    ['algebra', 'y varies directly as x, and y = 12 when x = 3. Find y when x = 5.', ['20', '15', '4', '36'], 0, 'y = kx with k = 4, so y = 4 × 5 = 20.'],
    ['geometry-mensuration', 'Find the area of a circle of radius 7 cm. (Take π = 22/7)', ['154 cm²', '44 cm²', '49 cm²', '308 cm²'], 0, 'πr² = 22/7 × 49 = 154 cm².'],
    ['geometry-mensuration', 'Find the sum of the interior angles of a hexagon.', ['720°', '540°', '360°', '1080°'], 0, '(n − 2) × 180° = 4 × 180° = 720°.'],
    ['trigonometry', 'If sin θ = 3/5 and θ is acute, find cos θ.', ['4/5', '3/4', '5/3', '5/4'], 0, 'A 3-4-5 right triangle gives cos θ = 4/5.'],
    ['trigonometry', 'A ladder 10 m long leans against a wall, making 60° with the ground. How high up the wall does it reach? (sin 60° ≈ 0.866)', ['8.66 m', '5 m', '10 m', '17.3 m'], 0, 'Height = 10 × sin 60° ≈ 8.66 m.'],
    ['statistics-probability', 'Find the mean of 4, 7, 9, 10 and 15.', ['9', '10', '45', '7'], 0, 'Sum = 45, and 45 ÷ 5 = 9.'],
    ['statistics-probability', 'Find the median of 3, 8, 1, 6 and 4.', ['4', '6', '3', '8'], 0, 'In order: 1, 3, 4, 6, 8. The middle value is 4.'],
    ['statistics-probability', 'A bag holds 3 red and 5 blue balls. One ball is picked at random. Find the probability that it is red.', ['3/8', '3/5', '5/8', '1/3'], 0, '3 red out of 8 balls: 3/8.'],
  ],
};
