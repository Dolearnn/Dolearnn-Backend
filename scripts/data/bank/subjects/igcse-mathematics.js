// Original IGCSE/GCSE-style Mathematics questions (not Cambridge, Edexcel or AQA material).
// Uses the existing Mathematics topics. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'mathematics',
  name: 'Mathematics',
  sortOrder: 2,
  exams: ['igcse'],
  topics: [
    { slug: 'number-numeration', name: 'Number and Numeration' },
    { slug: 'algebra', name: 'Algebra' },
    { slug: 'geometry-mensuration', name: 'Geometry and Mensuration' },
    { slug: 'trigonometry', name: 'Trigonometry' },
    { slug: 'statistics-probability', name: 'Statistics and Probability' },
  ],
  questions: [
    ['number-numeration', 'Write 0.00034 in standard form.', ['3.4 × 10⁻⁴', '3.4 × 10⁴', '34 × 10⁻⁵', '0.34 × 10⁻³'], 0, 'Move the decimal point 4 places to the right: 3.4 × 10⁻⁴.'],
    ['number-numeration', 'Find the highest common factor (HCF) of 36 and 60.', ['12', '6', '180', '24'], 0, '36 = 2² × 3², 60 = 2² × 3 × 5, so the HCF is 2² × 3 = 12.'],
    ['number-numeration', 'Increase 80 by 15%.', ['92', '95', '68', '12'], 0, '80 × 1.15 = 92.'],
    ['algebra', 'Expand and simplify 3(2x − 1) − 2(x − 4).', ['4x + 5', '4x − 11', '4x − 5', '8x + 5'], 0, '6x − 3 − 2x + 8 = 4x + 5.'],
    ['algebra', 'Make r the subject of A = πr².', ['r = √(A/π)', 'r = A/π', 'r = √A − π', 'r = πA²'], 0, 'r² = A/π, so r = √(A/π).'],
    ['algebra', 'Solve the simultaneous equations x + y = 7 and x − y = 3.', ['x = 5, y = 2', 'x = 2, y = 5', 'x = 4, y = 3', 'x = 10, y = −3'], 0, 'Adding gives 2x = 10, so x = 5 and y = 2.'],
    ['algebra', 'Find the nth term of the sequence 5, 8, 11, 14, …', ['3n + 2', '5n', '3n + 5', 'n + 3'], 0, 'The difference is 3, and the first term is 5 = 3(1) + 2.'],
    ['geometry-mensuration', 'Find the circumference of a circle of diameter 10 cm, to 1 decimal place. (π = 3.142)', ['31.4 cm', '78.6 cm', '15.7 cm', '62.8 cm'], 0, 'C = πd = 3.142 × 10 = 31.42 ≈ 31.4 cm.'],
    ['geometry-mensuration', 'Each exterior angle of a regular polygon is 40°. How many sides does it have?', ['9', '8', '10', '12'], 0, 'Exterior angles add up to 360°, and 360 ÷ 40 = 9.'],
    ['trigonometry', 'In a right-angled triangle, the side adjacent to angle x is 8 cm and the hypotenuse is 10 cm. Find cos x.', ['0.8', '0.6', '1.25', '0.75'], 0, 'cos x = adjacent/hypotenuse = 8/10 = 0.8.'],
    ['statistics-probability', 'The probability that an event happens is 0.35. What is the probability that it does not happen?', ['0.65', '0.35', '1.35', '0.5'], 0, 'P(not A) = 1 − 0.35 = 0.65.'],
    ['statistics-probability', 'Find the mode of 2, 5, 5, 7, 9, 5, 2.', ['5', '2', '7', '9'], 0, '5 appears three times, more than any other value.'],
  ],
};
