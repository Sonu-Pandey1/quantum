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
  
  // ─── 50 EXPANDED PROTOCOLS & STOIC THOUGHTS ───
  { id: 'dt-19', quote: "You have power over your mind - not outside events. Realize this, and you will find immense strength.", author: "Marcus Aurelius", category: "Wisdom" },
  { id: 'dt-20', quote: "We suffer more often in imagination than in reality. Conquer your assumptions.", author: "Seneca", category: "Mindset" },
  { id: 'dt-21', quote: "First say to yourself what you would be; and then do what you have to do without compromise.", author: "Epictetus", category: "Discipline" },
  { id: 'dt-22', quote: "It is not that we have a short time to live, but that we waste a lot of it in trivialities.", author: "Seneca", category: "Execution" },
  { id: 'dt-23', quote: "The mind that is anxious about future events is miserable. Ground yourself in current execution.", author: "Seneca", category: "Mindset" },
  { id: 'dt-24', quote: "Waste no more time arguing what a good person should be. Embody it.", author: "Marcus Aurelius", category: "Execution" },
  { id: 'dt-25', quote: "If you want to improve, be content to be thought foolish and unrefined by the crowd.", author: "Epictetus", category: "Wisdom" },
  { id: 'dt-26', quote: "Dwell on the beauty of life. Watch the stars, and see yourself running alongside them.", author: "Marcus Aurelius", category: "Mindset" },
  { id: 'dt-27', quote: "Luck is what happens when relentless preparation meets fleeting opportunity.", author: "Seneca", category: "Discipline" },
  { id: 'dt-28', quote: "Amor fati — love your fate, whatever it brings, and use it as fuel for mastery.", author: "Friedrich Nietzsche", category: "Wisdom" },
  { id: 'dt-29', quote: "Small disciplines repeated with consistency every day lead to exponential achievements over time.", author: "John C. Maxwell", category: "Discipline" },
  { id: 'dt-30', quote: "A true champion is defined not by their wins, but by how they rise after severe defeat.", author: "Serena Williams", category: "Mindset" },
  { id: 'dt-31', quote: "Self-discipline is the supernatural power that makes your potential inevitable.", author: "Dan Kennedy", category: "Discipline" },
  { id: 'dt-32', quote: "The successful warrior is the average person, armed with laser-like, unbroken focus.", author: "Bruce Lee", category: "Focus" },
  { id: 'dt-33', quote: "I fear not the opponent who has practiced 10,000 kicks once, but the one who has practiced one kick 10,000 times.", author: "Bruce Lee", category: "Focus" },
  { id: 'dt-34', quote: "If you don't sacrifice for what you want, what you want becomes the ultimate sacrifice.", author: "Execution Codex", category: "Execution" },
  { id: 'dt-35', quote: "The secret of getting ahead is getting started without waiting for ideal conditions.", author: "Mark Twain", category: "Execution" },
  { id: 'dt-36', quote: "It does not matter how slowly you advance, as long as you refuse to halt.", author: "Confucius", category: "Discipline" },
  { id: 'dt-37', quote: "Don't count the days. Force every single day to count toward your vision.", author: "Muhammad Ali", category: "Execution" },
  { id: 'dt-38', quote: "You don't have to be great to start, but you must start if you ever intend to be great.", author: "Zig Ziglar", category: "Mindset" },
  { id: 'dt-39', quote: "Simplicity is the essential prerequisite for bulletproof reliability and focus.", author: "Edsger W. Dijkstra", category: "Focus" },
  { id: 'dt-40', quote: "Hard choices, easy life. Easy choices, brutal life.", author: "Jerzy Gregorek", category: "Discipline" },
  { id: 'dt-41', quote: "The quality of your consciousness determines the quality of your entire existence.", author: "Marcus Aurelius", category: "Mindset" },
  { id: 'dt-42', quote: "When you awaken, remember what a privilege it is to breathe, to think, and to build.", author: "Marcus Aurelius", category: "Wisdom" },
  { id: 'dt-43', quote: "He who conquers his own impulses is mightier than any conqueror of cities.", author: "Confucius", category: "Discipline" },
  { id: 'dt-44', quote: "Be infinitely tolerant with others, and strictly unyielding with yourself.", author: "Marcus Aurelius", category: "Wisdom" },
  { id: 'dt-45', quote: "Focus is a muscle. The more you defend it from trivial noise, the more lethal it becomes.", author: "Quantum Codex", category: "Focus" },
  { id: 'dt-46', quote: "Do not pray for an easy path; train for the capacity to endure a demanding journey.", author: "Bruce Lee", category: "Mindset" },
  { id: 'dt-47', quote: "You will never find time for greatness. If you want time, you must carve it out.", author: "Charles Buxton", category: "Execution" },
  { id: 'dt-48', quote: "Do what is right, not what is convenient nor what is applauded.", author: "Roy T. Bennett", category: "Discipline" },
  { id: 'dt-49', quote: "A river carves through mountain rock not by sheer force, but through relentless continuity.", author: "James N. Watkins", category: "Discipline" },
  { id: 'dt-50', quote: "The architect who moves a mountain begins by carrying away the smallest gravel stones.", author: "Confucius", category: "Execution" },
  { id: 'dt-51', quote: "Stop waiting for the stars to align. Build where you stand with what you hold.", author: "Napoleon Hill", category: "Execution" },
  { id: 'dt-52', quote: "Associate only with those whose standards challenge you to elevate your own.", author: "Seneca", category: "Wisdom" },
  { id: 'dt-53', quote: "Concentrate all your neural firepower on the task at hand. Scattered light produces zero heat.", author: "Alexander Graham Bell", category: "Focus" },
  { id: 'dt-54', quote: "The price of mastery is discipline. The cost of neglect is lifelong regret.", author: "William Arthur Ward", category: "Discipline" },
  { id: 'dt-55', quote: "Quiet minds cannot be perplexed. They advance through storm or sunlight at their sovereign pace.", author: "Robert Louis Stevenson", category: "Mindset" },
  { id: 'dt-56', quote: "Silence is often the most lethal response, and focused stillness is the sharpest strategy.", author: "Quantum Axiom", category: "Wisdom" },
  { id: 'dt-57', quote: "Your brain is an engine for generating solutions, not a warehouse for clutter.", author: "David Allen", category: "Execution" },
  { id: 'dt-58', quote: "Rule your thoughts with unwavering resolve, or your thoughts will enslave you.", author: "Horace", category: "Mindset" },
  { id: 'dt-59', quote: "Courage does not always roar. Sometimes courage is the quiet vow saying, 'I return tomorrow.'", author: "Mary Anne Radmacher", category: "Mindset" },
  { id: 'dt-60', quote: "Monumental achievements are simply thousands of invisible duties executed with precision.", author: "Lao Tzu", category: "Execution" },
  { id: 'dt-61', quote: "To remain centered amidst external chaos is the pinnacle of human sovereignty.", author: "Zen Maxim", category: "Wisdom" },
  { id: 'dt-62', quote: "Never mistake frantic motion for meaningful progression. Be fiercely intentional.", author: "John Wooden", category: "Focus" },
  { id: 'dt-63', quote: "Discipline is the choice between fleeting gratification and lasting legacy.", author: "Abraham Lincoln", category: "Discipline" },
  { id: 'dt-64', quote: "Mastery demands patient devotion. Those who rush the journey forfeit the summit.", author: "Quantum Protocol", category: "Focus" },
  { id: 'dt-65', quote: "Every action you execute is a vote cast for the person you are evolving into.", author: "James Clear", category: "Execution" },
  { id: 'dt-66', quote: "You do not rise to the heights of your ambitions. You fall to the baseline of your systems.", author: "James Clear", category: "Discipline" },
  { id: 'dt-67', quote: "Ruthlessly clear your workspace, your schedule, and your attention. Pure focus is your edge.", author: "Quantum Core", category: "Focus" },
  { id: 'dt-68', quote: "Today is your only operational arena. Stand tall, execute your protocols, leave zero regrets.", author: "Quantum Axiom", category: "Execution" },
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
 * 32-bit Mulberry32 PRNG for stable, seedable pseudo-random distribution
 */
function mulberry32(seed: number) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically shuffles thoughts for each repetition cycle.
 * - Cycle 0 (first pass): returns original thoughts order (Day 1 to Day N)
 * - Cycle 1, 2, 3...: when all thoughts are completed and repeated from Day 1,
 *   shuffles thoughts with a deterministic cycle seed so every cycle is freshly randomized.
 */
export function getCycleShuffledThoughts(thoughts: DailyThought[], cycle: number): DailyThought[] {
  if (!thoughts || thoughts.length <= 1) return thoughts || [];
  if (cycle === 0) return [...thoughts]; // Initial cycle: original order

  const shuffled = [...thoughts];
  const rand = mulberry32(cycle * 10007 + 7919);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  return shuffled;
}

export interface ThoughtCycleInfo {
  cycle: number;
  dayInCycle: number;
  totalCycleDays: number;
  isRepeatCycle: boolean;
}

/**
 * Returns cycle information (current cycle, day in cycle, etc.)
 */
export function getThoughtCycleInfo(
  thoughts: DailyThought[], 
  dateOrDayIndex: Date | number = new Date()
): ThoughtCycleInfo {
  const total = thoughts.length || 1;
  let dayIndex: number;
  if (typeof dateOrDayIndex === 'number') {
    dayIndex = Math.max(0, Math.floor(dateOrDayIndex));
  } else {
    const date = dateOrDayIndex;
    const epoch = Date.UTC(2026, 0, 1);
    const currentDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    dayIndex = Math.max(0, Math.floor((currentDay - epoch) / (1000 * 60 * 60 * 24)));
  }

  const cycle = Math.floor(dayIndex / total);
  const dayInCycle = (dayIndex % total) + 1;

  return {
    cycle,
    dayInCycle,
    totalCycleDays: total,
    isRepeatCycle: cycle > 0,
  };
}

/**
 * Returns today's thought deterministically based on date / day index.
 * Whenever all thoughts are completed (Day 1 through Day N), it repeats from Day 1,
 * automatically shuffling thoughts for each complete cycle.
 */
export function getTodayThought(
  thoughts: DailyThought[], 
  dateOrDayIndex: Date | number = new Date()
): DailyThought {
  if (!thoughts || thoughts.length === 0) return DEFAULT_DAILY_THOUGHTS[0];

  let dayIndex: number;
  if (typeof dateOrDayIndex === 'number') {
    dayIndex = Math.max(0, Math.floor(dateOrDayIndex));
  } else {
    const date = dateOrDayIndex;
    const epoch = Date.UTC(2026, 0, 1);
    const currentDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    dayIndex = Math.max(0, Math.floor((currentDay - epoch) / (1000 * 60 * 60 * 24)));
  }

  const cycle = Math.floor(dayIndex / thoughts.length);
  const indexInCycle = dayIndex % thoughts.length;

  const cycleThoughts = getCycleShuffledThoughts(thoughts, cycle);
  return cycleThoughts[indexInCycle] || thoughts[0];
}
