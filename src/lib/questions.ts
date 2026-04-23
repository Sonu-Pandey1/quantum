export interface Question {
  id: string;
  title: string;
  category: 'Pattern' | 'Logic' | 'HR' | 'ABAP';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  pseudoCode?: string;
  correctAnswer?: string; // For Logic/HR/ABAP questions
  xpFirstSolve: number;
  xpRepeatSolve: number;
  week?: number;
}

export const QUESTIONS: Question[] = [
  // Patterns (ID: P1 - P20)
  {
    id: 'P1',
    title: 'Star Pyramid',
    category: 'Pattern',
    difficulty: 'Easy',
    description: 'Print a full pyramid of stars with N rows.',
    pseudoCode: 'FOR i=1 to N: spaces(N-i), stars(2*i-1)',
    xpFirstSolve: 20,
    xpRepeatSolve: 10
  },
  {
    id: 'P2',
    title: 'Inverted Triangle',
    category: 'Pattern',
    difficulty: 'Easy',
    description: 'Print an inverted triangle of stars with N rows.',
    pseudoCode: 'FOR i=N down to 1: stars(i)',
    xpFirstSolve: 20,
    xpRepeatSolve: 10
  },
  {
    id: 'P3',
    title: 'Diamond Pulse',
    category: 'Pattern',
    difficulty: 'Medium',
    description: 'Print a diamond shape of stars for an odd integer N.',
    pseudoCode: 'Two loops: one for upper triangle, one for lower.',
    xpFirstSolve: 50,
    xpRepeatSolve: 25
  },
  {
    id: 'P4',
    title: 'Hollow Square',
    category: 'Pattern',
    difficulty: 'Easy',
    description: 'Print a hollow square of N x N stars.',
    pseudoCode: 'Loop i, j. If edge (i=1, i=N, j=1, j=N) print star, else space.',
    xpFirstSolve: 20,
    xpRepeatSolve: 10
  },
  {
    id: 'P5',
    title: 'Pascal Triangle',
    category: 'Pattern',
    difficulty: 'Hard',
    description: 'Print Pascal\'s triangle up to N rows.',
    pseudoCode: 'Each number is sum of two numbers above it.',
    xpFirstSolve: 100,
    xpRepeatSolve: 50
  },

  // Logic (ID: L1 - L40)
  {
    id: 'L1',
    title: 'Fibonacci Sequence',
    category: 'Logic',
    difficulty: 'Easy',
    description: 'What is the 10th number in the Fibonacci sequence (starting 0, 1)?',
    correctAnswer: '34',
    xpFirstSolve: 20,
    xpRepeatSolve: 10
  },
  {
    id: 'L2',
    title: 'Prime Checker',
    category: 'Logic',
    difficulty: 'Easy',
    description: 'Is 97 a prime number? (Yes/No)',
    correctAnswer: 'Yes',
    xpFirstSolve: 20,
    xpRepeatSolve: 10
  },
  {
    id: 'L3',
    title: 'Binary Conversion',
    category: 'Logic',
    difficulty: 'Medium',
    description: 'Convert decimal 156 to binary.',
    correctAnswer: '10011100',
    xpFirstSolve: 50,
    xpRepeatSolve: 25
  },
  {
    id: 'L4',
    title: 'Array Intersection',
    category: 'Logic',
    difficulty: 'Medium',
    description: 'Given [1,2,2,1] and [2,2], what is the intersection? (Format: [x,y])',
    correctAnswer: '[2,2]',
    xpFirstSolve: 50,
    xpRepeatSolve: 25
  },
  {
    id: 'L5',
    title: 'Missing Number',
    category: 'Logic',
    difficulty: 'Easy',
    description: 'Find missing number in range 1-10: [1,2,4,5,6,7,8,9,10]',
    correctAnswer: '3',
    xpFirstSolve: 20,
    xpRepeatSolve: 10
  },

  // ABAP / Technical (ID: T1 - T20)
  {
    id: 'T1',
    title: 'Internal Table Type',
    category: 'ABAP',
    difficulty: 'Easy',
    description: 'Which ABAP table type allows binary search? (Standard/Sorted/Hashed)',
    correctAnswer: 'Sorted',
    xpFirstSolve: 30,
    xpRepeatSolve: 15
  },
  {
    id: 'T2',
    title: 'Loop Efficiency',
    category: 'ABAP',
    difficulty: 'Medium',
    description: 'What is the time complexity of reading a Hashed table? (O(1), O(log N), O(N))',
    correctAnswer: 'O(1)',
    xpFirstSolve: 50,
    xpRepeatSolve: 25
  },

  // HR / Interview (ID: H1 - H20)
  {
    id: 'H1',
    title: 'Conflict Resolution',
    category: 'HR',
    difficulty: 'Easy',
    description: 'A teammate is not meeting deadlines. What is your first step?',
    correctAnswer: 'Talk to them privately',
    xpFirstSolve: 20,
    xpRepeatSolve: 10
  },
  {
    id: 'H2',
    title: 'Handling Failure',
    category: 'HR',
    difficulty: 'Easy',
    description: 'A project you led failed. How do you present this to your manager?',
    correctAnswer: 'Accept responsibility and share learnings',
    xpFirstSolve: 20,
    xpRepeatSolve: 10
  }
];

// Dynamically generate the remaining to reach 100+
for (let i = 1; i <= 80; i++) {
  const categories: Question['category'][] = ['Pattern', 'Logic', 'HR', 'ABAP'];
  const difficulties: Question['difficulty'][] = ['Easy', 'Medium', 'Hard'];
  const cat = categories[i % categories.length];
  const diff = difficulties[i % difficulties.length];
  
  QUESTIONS.push({
    id: `G${i}`,
    title: `${cat} Challenge #${i}`,
    category: cat,
    difficulty: diff,
    description: `Complete this ${diff} level ${cat} exercise to master your skills.`,
    correctAnswer: 'Done', // Simplified for generated ones
    xpFirstSolve: diff === 'Easy' ? 20 : diff === 'Medium' ? 50 : 100,
    xpRepeatSolve: diff === 'Easy' ? 10 : diff === 'Medium' ? 25 : 50,
  });
}
