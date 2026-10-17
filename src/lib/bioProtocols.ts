export interface BioMission {
  id: string;
  title: string;
  xp: number;
  time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed?: boolean;
  lastCompletedDate?: string;
}

export const DEFAULT_PROTOCOLS: BioMission[] = [
  { id: 'bp-1', title: 'Cold Exposure Protocol (2–3 min cold shower)', xp: 50, time: '3 min', difficulty: 'Hard', completed: false },
  { id: 'bp-2', title: 'Morning Sunlight Saturation & Optic Flow', xp: 25, time: '15 min', difficulty: 'Easy', completed: false },
  { id: 'bp-3', title: 'Zone 2 Steady-State Cardio or 8k Steps', xp: 40, time: '40 min', difficulty: 'Medium', completed: false },
  { id: 'bp-4', title: 'Full Spinal Decompression & Hip Mobility', xp: 30, time: '15 min', difficulty: 'Medium', completed: false },
  { id: 'bp-5', title: 'Digital Fast & Blue-Light Cutoff (Pre-Sleep)', xp: 35, time: '45 min', difficulty: 'Medium', completed: false },
];

