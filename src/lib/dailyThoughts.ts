export type ThoughtCategory = 'Discipline' | 'Mindset' | 'Focus' | 'Wisdom' | 'Execution';

export interface DailyThought {
  id: string;
  quote: string;
  author?: string;
  category: ThoughtCategory;
  isCustom?: boolean;
}

export const DEFAULT_DAILY_THOUGHTS: DailyThought[] = [
  { id: 'dt-1', quote: "Action over thinking. You do not think your way into a new way of living, you live your way into a new way of thinking.", author: "Quantum Axiom", category: "Execution" },
  { id: 'dt-2', quote: "Consistency is the ultimate weapon. Small actions compounded daily outperform occasional bursts of genius.", author: "Discipline Core", category: "Discipline" },
  { id: 'dt-3', quote: "Discipline equals freedom. The more disciplined your habits, the freer your mind.", author: "Jocko Willink", category: "Discipline" },
  { id: 'dt-4', quote: "No excuses. The obstacle is not in your way; the obstacle is the way.", author: "Marcus Aurelius", category: "Mindset" },
  { id: 'dt-5', quote: "Pressure is a privilege. It means you are in a position where your efforts truly matter.", author: "Billie Jean King", category: "Mindset" },
  { id: 'dt-6', quote: "Focus builds empires. Where attention goes, neural energy flows.", author: "Quantum Core", category: "Focus" },
  { id: 'dt-7', quote: "Your future is crafted in the quiet hours of today.", author: "Stoic Maxim", category: "Wisdom" },
  { id: 'dt-8', quote: "Win the morning, command the day, master the trajectory.", author: "Execution Codex", category: "Execution" },
  { id: 'dt-9', quote: "Deep work is not a chore; it is the arena where mastery is forged.", author: "Cal Newport", category: "Focus" },
  { id: 'dt-10', quote: "Speak with clarity, act with conviction, reflect with humility.", author: "Quantum Axiom", category: "Wisdom" },
  { id: 'dt-11', quote: "The master has failed more times than the beginner has even tried.", author: "Stephen McCranie", category: "Mindset" },
  { id: 'dt-12', quote: "Do not negotiate with weakness. Complete what you scheduled.", author: "Discipline Core", category: "Execution" },
  { id: 'dt-13', quote: "Energy flows where discipline goes. Momentum is your greatest asset.", author: "Quantum Axiom", category: "Focus" },
  { id: 'dt-14', quote: "What you do daily defines what you become permanently.", author: "Philosophy of Action", category: "Wisdom" },
  { id: 'dt-15', quote: "Excellence is not an act, but a habit. We are what we repeatedly execute.", author: "Aristotle", category: "Discipline" },
  { id: 'dt-16', quote: "Limit distractions ruthlessly. A fractured attention span is a fractured destiny.", author: "Quantum Protocol", category: "Focus" },
  { id: 'dt-17', quote: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche", category: "Mindset" },
  { id: 'dt-18', quote: "Do the hard work, especially when you don't feel like it.", author: "Discipline Core", category: "Execution" },
];

const THOUGHTS_STORAGE_KEY = 'quantum_daily_thoughts';

export function loadSavedThoughts(settingsThoughts?: DailyThought[]): DailyThought[] {
  if (Array.isArray(settingsThoughts) && settingsThoughts.length > 0) {
    return settingsThoughts;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(THOUGHTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }

  return DEFAULT_DAILY_THOUGHTS;
}

export function saveStoredThoughts(thoughts: DailyThought[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THOUGHTS_STORAGE_KEY, JSON.stringify(thoughts));
    } catch {}
  }
}

/**
 * Returns today's thought deterministically based on date (day of year)
 */
export function getTodayThought(thoughts: DailyThought[], date: Date = new Date()): DailyThought {
  if (!thoughts || thoughts.length === 0) return DEFAULT_DAILY_THOUGHTS[0];

  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const idx = dayOfYear % thoughts.length;
  return thoughts[idx] || thoughts[0];
}

