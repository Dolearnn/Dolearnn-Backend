// Original WAEC/NECO/IGCSE-style Computer Studies questions, including beginner coding (Python).
// Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'computer-studies',
  name: 'Computer Studies and Coding',
  sortOrder: 21,
  exams: ['waec', 'neco', 'igcse'],
  topics: [
    { slug: 'computer-basics', name: 'Computer Basics and Number Systems' },
    { slug: 'hardware-software', name: 'Hardware and Software' },
    { slug: 'programming', name: 'Programming and Algorithms' },
    { slug: 'networks-internet', name: 'Networks and the Internet' },
    { slug: 'applications', name: 'Application Packages' },
  ],
  questions: [
    ['computer-basics', 'The part of the CPU that carries out arithmetic and logical operations is the', ['arithmetic and logic unit (ALU)', 'control unit', 'main memory', 'hard disk'], 0, 'The ALU does calculations and comparisons; the control unit directs operations.'],
    ['computer-basics', 'The binary number 1011 is equal to which decimal number?', ['11', '13', '9', '10'], 0, '1×8 + 0×4 + 1×2 + 1×1 = 11.'],
    ['computer-basics', 'One kilobyte (KB) is traditionally equal to', ['1,024 bytes', '1,000 bits', '1,024 bits', '100 bytes'], 0, '1 KB = 2¹⁰ = 1,024 bytes.'],
    ['hardware-software', 'Which of these is an input device?', ['Keyboard', 'Monitor', 'Printer', 'Speaker'], 0, 'A keyboard sends data into the computer; the others are output devices.'],
    ['hardware-software', 'Which of these is an operating system?', ['Windows', 'Microsoft Word', 'Google Chrome', 'Excel'], 0, 'Windows manages the hardware and runs other programs; the others are applications.'],
    ['hardware-software', 'Memory that loses its contents when the power is switched off is', ['RAM', 'ROM', 'a hard disk', 'a flash drive'], 0, 'RAM is volatile; ROM and storage devices keep their data.'],
    ['programming', 'A step-by-step set of instructions for solving a problem is', ['an algorithm', 'a compiler', 'a variable', 'an interpreter'], 0, 'An algorithm is a precise sequence of steps; programs implement algorithms.'],
    ['programming', 'What does this Python code print?  x = 5; x = x + 3; print(x * 2)', ['16', '13', '10', '8'], 0, 'x becomes 8, and 8 × 2 = 16.'],
    ['programming', 'In Python, what is the value of 7 // 2?', ['3', '3.5', '4', '1'], 0, '// is floor (integer) division: 7 ÷ 2 = 3.5, rounded down to 3.'],
    ['programming', 'Which statement repeats a block of code while a condition stays true?', ['A while loop', 'An if statement', 'A function definition', 'A comment'], 0, 'A while loop keeps running as long as its condition is true.'],
    ['programming', 'A program that translates a whole high-level program into machine code before it runs is', ['a compiler', 'an interpreter', 'an editor', 'a debugger'], 0, 'A compiler translates the whole program first; an interpreter translates line by line as it runs.'],
    ['networks-internet', 'A network covering a small area such as a school building is', ['a LAN', 'a WAN', 'a MAN', 'the internet'], 0, 'A Local Area Network (LAN) covers a building or campus.'],
    ['networks-internet', 'HTTP is the protocol used for', ['transferring web pages', 'sending print jobs', 'formatting a disk', 'compressing files'], 0, 'HyperText Transfer Protocol carries web pages between servers and browsers.'],
    ['applications', 'In a spreadsheet, the formula =SUM(A1:A3) adds', ['the values in cells A1, A2 and A3', 'only A1 and A3', 'all the cells in column A', 'all the cells in row 1'], 0, 'A1:A3 is the range from A1 to A3 inclusive.'],
  ],
};
