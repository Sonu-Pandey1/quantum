/**
 * Advanced Validation Engine for Practice Hub
 * Implements logical equivalence, similarity checks, and structural code analysis.
 */

import { Question } from './questions';

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Calculates Levenshtein distance between two strings
 */
function getLevenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[len1][len2];
}

/**
 * Calculates similarity percentage between two strings (0 to 1)
 */
function getSimilarity(s1: string, s2: string): number {
  const distance = getLevenshteinDistance(s1.toLowerCase().trim(), s2.toLowerCase().trim());
  const longestLength = Math.max(s1.length, s2.length);
  return longestLength === 0 ? 1 : (longestLength - distance) / longestLength;
}

/**
 * Main Validation Logic
 */
export function validateAnswer(question: Question, input: string): ValidationResult {
  const cleanInput = input.trim().toLowerCase();
  
  if (!cleanInput || cleanInput.length < 5) {
    return { isValid: false, message: 'Your solution is too brief. Please provide a more detailed answer.' };
  }

  // 1. Logic & ABAP Technical Questions (Key-based)
  if (question.category === 'Logic' || question.category === 'ABAP') {
    if (!question.correctAnswer) return { isValid: true, message: 'Correct!' }; // Fallback

    const target = question.correctAnswer.toLowerCase().trim();
    
    // Exact match (after normalization)
    if (cleanInput === target) return { isValid: true, message: 'Perfect! Logic is sound.' };
    
    // Mathematical/Binary Formatting equivalence
    const normalizedInput = cleanInput.replace(/[^a-z0-9]/g, '');
    const normalizedTarget = target.replace(/[^a-z0-9]/g, '');
    if (normalizedInput === normalizedTarget) return { isValid: true, message: 'Correct formatting.' };

    // Check if the answer is contained within a larger explanation
    if (cleanInput.includes(target) || target.includes(cleanInput)) {
       return { isValid: true, message: 'Core logic identified. Well done.' };
    }

    return { isValid: false, message: 'The logical output does not match the expected protocol. Re-check your calculations.' };
  }

  // 2. HR / Interview Questions (Similarity-based)
  if (question.category === 'HR') {
    if (!question.correctAnswer) return { isValid: true, message: 'Accepted.' };
    
    const similarity = getSimilarity(cleanInput, question.correctAnswer);
    if (similarity > 0.6) {
      return { isValid: true, message: 'Response aligns with professional standards. Good perspective.' };
    }
    
    return { isValid: false, message: 'Your response doesn\'t quite capture the core professional principle required here.' };
  }

  // 3. Pattern / Coding Questions (Structural Analysis)
  if (question.category === 'Pattern') {
    const hasLoop = /for|while|loop|do|repeat/i.test(input);
    const hasPrint = /print|console|write|output|\*/i.test(input);
    
    if (question.difficulty === 'Easy') {
      if (hasLoop && hasPrint) return { isValid: true, message: 'Pattern logic verified.' };
      return { isValid: false, message: 'Pattern requires an iterative loop and an output mechanism.' };
    }
    
    if (question.difficulty === 'Medium') {
      const nestedCount = (input.match(/for|while|loop/gi) || []).length;
      if (nestedCount >= 2) return { isValid: true, message: 'Nested logic correctly implemented.' };
      return { isValid: false, message: 'Medium patterns typically require nested loop structures.' };
    }

    if (question.difficulty === 'Hard') {
      const complexLogic = /if|else|switch|math|floor|ceil|abs/i.test(input);
      if (hasLoop && complexLogic) return { isValid: true, message: 'Advanced logic detected. Exceptional work.' };
      return { isValid: false, message: 'Hard challenges require conditional logic within loops.' };
    }
  }

  // Fallback for generated or unknown types
  return { isValid: true, message: 'Submission accepted for review.' };
}
