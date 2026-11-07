// Original SAT-style Math questions (not College Board material). Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'mathematics',
  name: 'Mathematics',
  sortOrder: 2,
  exams: ['sat'],
  topics: [
    { slug: 'algebra', name: 'Algebra' },
    { slug: 'advanced-math', name: 'Advanced Math' },
    { slug: 'problem-solving-data', name: 'Problem-Solving and Data Analysis' },
    { slug: 'geometry-mensuration', name: 'Geometry and Mensuration' },
    { slug: 'trigonometry', name: 'Trigonometry' },
  ],
  questions: [
    ['algebra', 'If 3x + 5 = 20, what is the value of 6x + 5?', ['35', '30', '15', '40'], 0, '3x = 15, so x = 5 and 6x + 5 = 35.'],
    ['algebra', 'A line passes through the points (0, 2) and (4, 10). What is its slope?', ['2', '4', '8', '1/2'], 0, 'Slope = (10 − 2)/(4 − 0) = 8/4 = 2.'],
    ['algebra', 'What is the y-intercept of the line 2x + 3y = 12?', ['4', '6', '2', '12'], 0, 'At x = 0, 3y = 12, so y = 4.'],
    ['advanced-math', 'If f(x) = x² − 3x, what is f(−2)?', ['10', '−2', '2', '−10'], 0, '(−2)² − 3(−2) = 4 + 6 = 10.'],
    ['advanced-math', 'What are the solutions of x² − 9 = 0?', ['x = 3 and x = −3', 'x = 9 only', 'x = 3 only', 'x = 0 and x = 9'], 0, 'x² = 9, so x = ±3.'],
    ['advanced-math', 'Which expression is equivalent to (x + 3)²?', ['x² + 6x + 9', 'x² + 9', 'x² + 3x + 9', 'x² + 6x + 6'], 0, '(x + 3)(x + 3) = x² + 6x + 9.'],
    ['problem-solving-data', 'A shirt priced at $40 is discounted by 25%. What is the sale price?', ['$30', '$35', '$10', '$15'], 0, '25% of $40 is $10; $40 − $10 = $30.'],
    ['problem-solving-data', 'The mean of five numbers is 12. What is their sum?', ['60', '12', '17', '2.4'], 0, 'Sum = mean × count = 12 × 5 = 60.'],
    ['problem-solving-data', 'A car travels 150 miles in 2.5 hours at a constant speed. What is its speed in miles per hour?', ['60', '62.5', '375', '50'], 0, '150 ÷ 2.5 = 60 mph.'],
    ['geometry-mensuration', 'A right triangle has legs of length 6 and 8. What is the length of the hypotenuse?', ['10', '14', '12', '48'], 0, '√(6² + 8²) = √100 = 10.'],
    ['geometry-mensuration', 'What is the volume of a cube with edge length 3?', ['27', '9', '18', '12'], 0, '3³ = 27.'],
    ['trigonometry', 'In a right triangle, the side opposite angle A is 5 and the hypotenuse is 13. What is sin A?', ['5/13', '12/13', '5/12', '13/5'], 0, 'sin A = opposite/hypotenuse = 5/13.'],
  ],
};
