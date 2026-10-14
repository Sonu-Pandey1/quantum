import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame, Shield, Plus, Check, Trash2, Pencil,
  ChevronLeft, ChevronRight,
  BookOpen, Dumbbell, Briefcase, Brain, Trophy,
  Droplets, Moon, Scale, Sparkles, X,
  Calendar, CheckCircle2, HeartPulse
} from 'lucide-react';
import { useProgression, type Pillar } from '../hooks/useProgression';
import { useEngagement } from '../hooks/useEngagement';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';
import toast from 'react-hot-toast';
import { EngineCard } from '../components/EngineCard';

// ─── TYPES ─────────────────────────────────────────────────────────────
export type EnergyMode = 'peak' | 'normal' | 'survival';
export type HabitType = 'check' | 'counter';

export interface QuantumHabit {
  id: string;
  name: string;
  survivalName: string;
  pillar: Pillar;
  color: string;
  habitType: HabitType;
  dailyGoal: number;
  unit: string;
  targetDaysPerWeek: number;
  xpReward: number;
}

export interface BioMetrics {
  weightKg: number;
  waterLiters: number;
  sleepHours: number;
  dailyWin?: string;
  tomorrowPriority?: string;
}

export interface TimetableBlock {
  id: string;
  start: string;
  end: string;
  title: string;
  pillar: Pillar;
  priority: 'High' | 'Medium' | 'Low';
  completedDates: string[];
}

export interface QuickTodoItem {
  id: string;
  title: string;
  pillar: Pillar;
  priority?: 'High' | 'Medium' | 'Low';
  completed: boolean;
}

const DEFAULT_TIMELINE: TimetableBlock[] = [
  { id: 'tb-1', start: '06:00', end: '07:30', title: 'Physical Conditioning & Mobility', pillar: 'Health', priority: 'High', completedDates: [] },
  { id: 'tb-2', start: '09:30', end: '13:30', title: 'Core Technical Architecture (CDS / RAP)', pillar: 'Study', priority: 'High', completedDates: [] },
  { id: 'tb-3', start: '15:00', end: '18:00', title: 'Full-Stack / ABAP RAP Pipeline', pillar: 'Study', priority: 'High', completedDates: [] },
  { id: 'tb-4', start: '19:30', end: '21:00', title: 'Algorithm & System Design Mastery', pillar: 'Study', priority: 'High', completedDates: [] },
  { id: 'tb-5', start: '22:00', end: '22:45', title: 'Decompression & Daily Retrospective', pillar: 'Mind', priority: 'Medium', completedDates: [] },
];

const DEFAULT_QUICK_TODOS: QuickTodoItem[] = [
  { id: 'td-1', title: 'Review RAP Behavior Definition validations', pillar: 'Study', priority: 'High', completed: false },
  { id: 'td-2', title: 'Update daily retail inventory & cashbook', pillar: 'Finance', priority: 'Medium', completed: false },
];

interface CommandDeckProps {
  onNavigate?: (view: string) => void;
}

// ─── HELPERS ───────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function getWeekDays(referenceDate: Date): { name: string; short: string; dateStr: string; date: Date }[] {
  const dayOfWeek = referenceDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addDays(referenceDate, mondayOffset);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((short, i) => {
    const d = addDays(monday, i);
    return {
      name: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
      short,
      dateStr: toDateStr(d),
      date: d,
    };
  });
}

const PILLAR_CONFIG: Record<Pillar, { color: string; bg: string; border: string; text: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  Study:   { color: '#3b82f6', bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    icon: BookOpen },
  Health:  { color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: Dumbbell },
  Finance: { color: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   icon: Briefcase },
  Mind:    { color: '#8b5cf6', bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  icon: Brain },
};

const DEFAULT_HABITS: QuantumHabit[] = [
  {
    id: 'h-study-1',
    name: 'Full-Stack & System Design Deep Work',
    survivalName: 'Review 1 Architecture Note / Read Docs (5m)',
    pillar: 'Study',
    color: '#3b82f6',
    habitType: 'check',
    dailyGoal: 1,
    unit: 'session',
    targetDaysPerWeek: 6,
    xpReward: 40,
  },
  {
    id: 'h-health-1',
    name: 'Strength, Core & Mobility Training',
    survivalName: '25 Pushups + 3m Stretch (2m)',
    pillar: 'Health',
    color: '#10b981',
    habitType: 'check',
    dailyGoal: 1,
    unit: 'workout',
    targetDaysPerWeek: 5,
    xpReward: 35,
  },
  {
    id: 'h-finance-1',
    name: 'Wealth Ledger & Cashflow Audit',
    survivalName: 'Review daily account balance (1m)',
    pillar: 'Finance',
    color: '#f59e0b',
    habitType: 'check',
    dailyGoal: 1,
    unit: 'check',
    targetDaysPerWeek: 6,
    xpReward: 30,
  },
  {
    id: 'h-mind-1',
    name: 'Mindfulness & Mental Recovery',
    survivalName: '10 Box Breaths & Mental Reset (2m)',
    pillar: 'Mind',
    color: '#8b5cf6',
    habitType: 'counter',
    dailyGoal: 2,
    unit: 'sessions',
    targetDaysPerWeek: 7,
    xpReward: 30,
  },
];

// ─── SVG RADIAL RING COMPONENT ─────────────────────────────────────────
function RadialRing({
  pct,
  color,
  label,
  sublabel,
  size = 110,
  strokeWidth = 9,
  onClick,
}: {
  pct: number;
  color: string;
  label: string;
  sublabel: string;
  size?: number;
  strokeWidth?: number;
  onClick?: () => void;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, pct));
  const offset = circumference - (clampedPct / 100) * circumference;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 transition-all ${
        onClick ? 'cursor-pointer hover:border-white/20 hover:bg-white/[0.05] hover:scale-[1.02]' : ''
      }`}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-white/10"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-black text-white">{Math.round(clampedPct)}%</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-textMuted flex items-center justify-between">
          <span>{label}</span>
          {onClick && <span className="text-[9px] text-primary lowercase tracking-normal">view analytics →</span>}
        </p>
        <p className="text-xs font-bold text-textMain mt-0.5 truncate">{sublabel}</p>
      </div>
    </div>
  );
}

// ─── MAIN COMMAND DECK COMPONENT ───────────────────────────────────────
export function CommandDeck({ onNavigate }: CommandDeckProps) {
  const { state, addXp } = useProgression();
  const { stats: engagementStats } = useEngagement();
  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const uid = state.displayName || 'operator';

  // ── Energy Mode ──────────────────────────────────────────────────────
  const [energyMode, setEnergyMode] = useState<EnergyMode>(() => {
    return (localStorage.getItem(`quantum_pulse_energy_${uid}`) as EnergyMode) || 'normal';
  });

  useEffect(() => {
    localStorage.setItem(`quantum_pulse_energy_${uid}`, energyMode);
  }, [energyMode, uid]);

  // ── Habits State ─────────────────────────────────────────────────────
  const [habits, setHabits] = useState<QuantumHabit[]>(() => {
    const saved = localStorage.getItem(`quantum_pulse_habits_${uid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    const systemHabits = localStorage.getItem(`quantum_habits_${uid}`);
    if (systemHabits) {
      try {
        const parsed = JSON.parse(systemHabits);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((h: any, idx: number) => ({
            id: `h-${h.id || idx}`,
            name: h.title || h.name || 'Core Habit',
            survivalName: `2-Min Micro: ${h.title || h.name || 'Core Habit'}`,
            pillar: (h.pillar || 'Study') as Pillar,
            color: '#3b82f6',
            habitType: 'check' as HabitType,
            dailyGoal: 1,
            unit: 'session',
            targetDaysPerWeek: 6,
            xpReward: 35,
          }));
        }
      } catch {}
    }
    return DEFAULT_HABITS;
  });

  // Save habits locally & sync to Supabase
  useEffect(() => {
    localStorage.setItem(`quantum_pulse_habits_${uid}`, JSON.stringify(habits));
    const syncHabitsToDb = async () => {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const userId = session.user.id;
        for (const [idx, h] of habits.entries()) {
          await supabase.from('habits').upsert({
            id: h.id.includes('-') && h.id.length > 20 ? h.id : undefined,
            user_id: userId,
            name: h.name,
            survival_name: h.survivalName,
            pillar: h.pillar,
            color: h.color,
            habit_type: h.habitType,
            daily_goal: h.dailyGoal,
            unit: h.unit,
            target_days_per_week: h.targetDaysPerWeek,
            xp_reward: h.xpReward,
            order_index: idx,
          }, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Supabase habit sync warning:', err);
      }
    };
    syncHabitsToDb();
  }, [habits, uid]);

  // ── Habit Logs State ({ [habitId_dateStr]: count }) ──────────────────
  const [habitLogs, setHabitLogs] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`quantum_pulse_logs_${uid}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`quantum_pulse_logs_${uid}`, JSON.stringify(habitLogs));
  }, [habitLogs, uid]);

  // Anti-farming locks map ({ [habitId_dateStr]: true })
  const [xpLocks, setXpLocks] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`quantum_pulse_xplocks_${uid}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`quantum_pulse_xplocks_${uid}`, JSON.stringify(xpLocks));
  }, [xpLocks, uid]);

  // ── Week Navigator ───────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [pillarFilter, setPillarFilter] = useState<'All' | Pillar>('All');

  const currentWeekDays = useMemo(() => {
    const ref = addDays(new Date(), weekOffset * 7);
    return getWeekDays(ref);
  }, [weekOffset]);

  const weekDateRangeLabel = useMemo(() => {
    const first = currentWeekDays[0].date;
    const last = currentWeekDays[6].date;
    const fStr = first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const lStr = last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fStr} - ${lStr}`;
  }, [currentWeekDays]);

  // Effective daily goal depending on energy mode
  const getGoalForHabit = (h: QuantumHabit) => {
    if (energyMode === 'survival') return 1;
    return h.habitType === 'counter' ? h.dailyGoal : 1;
  };

  // ── Bio-Telemetry State ──────────────────────────────────────────────
  const [bio, setBio] = useState<BioMetrics>(() => {
    const saved = localStorage.getItem(`quantum_pulse_bio_${uid}_${todayStr}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { weightKg: 75.0, waterLiters: 2.0, sleepHours: 7.5, dailyWin: '', tomorrowPriority: '' };
  });

  useEffect(() => {
    localStorage.setItem(`quantum_pulse_bio_${uid}_${todayStr}`, JSON.stringify(bio));
    const syncBio = async () => {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await supabase.from('daily_biometrics').upsert({
          user_id: session.user.id,
          log_date: todayStr,
          weight_kg: bio.weightKg,
          water_liters: bio.waterLiters,
          sleep_hours: bio.sleepHours,
          daily_win: bio.dailyWin || null,
          tomorrow_priority: bio.tomorrowPriority || null,
        }, { onConflict: 'user_id,log_date' });
      } catch (err) {
        console.warn('Bio sync error:', err);
      }
    };
    syncBio();
  }, [bio, todayStr, uid]);

  // Health bio readiness score (0-100)
  const healthReadinessScore = useMemo(() => {
    let score = 50;
    if (bio.waterLiters >= 3.0) score += 25;
    else score += Math.round((bio.waterLiters / 3.0) * 25);

    if (bio.sleepHours >= 7.0 && bio.sleepHours <= 9.0) score += 25;
    else if (bio.sleepHours > 0) score += Math.min(20, Math.round((bio.sleepHours / 7.0) * 20));

    return Math.min(100, Math.max(20, score));
  }, [bio.waterLiters, bio.sleepHours]);

  const handleUpdateBio = async (field: 'weightKg' | 'waterLiters' | 'sleepHours', delta: number) => {
    audio.playSuccess();
    setBio(prev => {
      let nextVal = prev[field] + delta;
      if (field === 'weightKg') nextVal = Math.max(30, Number(nextVal.toFixed(1)));
      if (field === 'waterLiters') nextVal = Math.max(0, Number(nextVal.toFixed(1)));
      if (field === 'sleepHours') nextVal = Math.max(0, Number(nextVal.toFixed(1)));
      return { ...prev, [field]: nextVal };
    });

    const fieldLabel = field === 'weightKg' ? 'Mass' : field === 'waterLiters' ? 'Hydration' : 'Sleep';
    await addXp('Health', `Bio-telemetry: ${fieldLabel}`, 15);
    toast.success(`Logged ${fieldLabel}! +15 Health XP`, { duration: 1500 });
  };

  // ── Timetable Timeline State ─────────────────────────────────────────
  const [timeline, setTimeline] = useState<TimetableBlock[]>(() => {
    const saved = localStorage.getItem(`quantum_pulse_timeline_${uid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    const systemTimetable = localStorage.getItem(`quantum_timetable_${uid}`);
    if (systemTimetable) {
      try {
        const parsed = JSON.parse(systemTimetable);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any, idx: number) => ({
            id: `tb-${t.id || idx}`,
            start: t.start || '09:00',
            end: t.end || '10:00',
            title: t.title || 'Focus Protocol',
            pillar: (t.pillar || 'Study') as Pillar,
            priority: (t.task_target || 'High') as 'High' | 'Medium' | 'Low',
            completedDates: [],
          }));
        }
      } catch {}
    }
    return DEFAULT_TIMELINE;
  });

  useEffect(() => {
    localStorage.setItem(`quantum_pulse_timeline_${uid}`, JSON.stringify(timeline));
  }, [timeline, uid]);

  // ── Quick Todo Protocol Deck State ───────────────────────────────────
  const [quickTodos, setQuickTodos] = useState<QuickTodoItem[]>(() => {
    const saved = localStorage.getItem(`quantum_pulse_quicktodos_${uid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return DEFAULT_QUICK_TODOS;
  });

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPillar, setNewTodoPillar] = useState<Pillar>('Study');

  useEffect(() => {
    localStorage.setItem(`quantum_pulse_quicktodos_${uid}`, JSON.stringify(quickTodos));
  }, [quickTodos, uid]);

  const toggleTimelineBlock = async (block: TimetableBlock) => {
    const done = block.completedDates.includes(todayStr);
    if (!done) {
      audio.playSuccess();
      setTimeline(prev =>
        prev.map(b =>
          b.id === block.id ? { ...b, completedDates: [...b.completedDates, todayStr] } : b
        )
      );
      const earned = block.priority === 'High' ? 60 : 40;
      await addXp(block.pillar, `Timeline Block: ${block.title}`, earned);
      toast.success(`⚡ Block Executed! +${earned} ${block.pillar} XP`);

      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabase.from('daily_completions').upsert({
              user_id: session.user.id,
              date: todayStr,
              task_id: block.id,
              completed: true,
              completed_at: new Date().toISOString(),
            }, { onConflict: 'user_id,date,task_id' });
          }
        } catch (e) {
          console.warn('Timeline sync warning:', e);
        }
      }
    } else {
      audio.playClick();
      setTimeline(prev =>
        prev.map(b =>
          b.id === block.id
            ? { ...b, completedDates: b.completedDates.filter(d => d !== todayStr) }
            : b
        )
      );
    }
  };

  const handleAddQuickTodo = () => {
    if (!newTodoTitle.trim()) return;
    audio.playClick();
    setQuickTodos(prev => [
      ...prev,
      {
        id: `td-${Date.now()}`,
        title: newTodoTitle.trim(),
        pillar: newTodoPillar,
        priority: 'Medium',
        completed: false,
      },
    ]);
    setNewTodoTitle('');
    toast.success('Task Added to Deck');
  };

  const toggleQuickTodo = async (id: string) => {
    const target = quickTodos.find(x => x.id === id);
    if (!target) return;
    const next = !target.completed;

    setQuickTodos(prev => prev.map(td => (td.id === id ? { ...td, completed: next } : td)));

    if (next) {
      audio.playSuccess();
      await addXp(target.pillar, `Todo: ${target.title}`, 35);
      toast.success(`✓ Completed! +35 ${target.pillar} XP`);
    } else {
      audio.playClick();
    }
  };

  const deleteQuickTodo = (id: string) => {
    audio.playClick();
    setQuickTodos(prev => prev.filter(x => x.id !== id));
  };

  // ── Habit Check-in / Toggle ──────────────────────────────────────────
  const toggleHabitDay = async (h: QuantumHabit, dateStr: string) => {
    const key = `${h.id}_${dateStr}`;
    const currentCount = habitLogs[key] || 0;
    const requiredGoal = dateStr === todayStr ? getGoalForHabit(h) : h.dailyGoal;

    let nextCount = 0;
    if (h.habitType === 'counter' && energyMode !== 'survival') {
      nextCount = currentCount >= requiredGoal ? 0 : currentCount + 1;
    } else {
      nextCount = currentCount >= requiredGoal ? 0 : requiredGoal;
    }

    setHabitLogs(prev => ({ ...prev, [key]: nextCount }));

    // If goal reached today and not yet awarded
    if (nextCount >= requiredGoal) {
      audio.playSuccess();
      if (!xpLocks[key]) {
        setXpLocks(prev => ({ ...prev, [key]: true }));
        const mult = energyMode === 'peak' ? 1.2 : 1.0;
        const awarded = Math.round(h.xpReward * mult);
        const earned = await addXp(h.pillar, `Habit: ${h.name}`, awarded);
        toast.success(`🔥 Protocol Checked! +${earned} ${h.pillar} XP`);
      }
    } else {
      audio.playClick();
    }

    // Sync habit log to Supabase
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('habit_logs').upsert({
            user_id: session.user.id,
            habit_id: h.id.includes('-') && h.id.length > 20 ? h.id : undefined,
            completed_date: dateStr,
            count_value: nextCount,
            completed: nextCount >= requiredGoal,
            xp_awarded: nextCount >= requiredGoal ? h.xpReward : 0,
          }, { onConflict: 'user_id,habit_id,completed_date' });
        }
      } catch (err) {
        console.warn('Habit log sync error:', err);
      }
    }
  };

  // ── Streak Calculations ──────────────────────────────────────────────
  const habitStreaks = useMemo(() => {
    const map: Record<string, { current: number; best: number }> = {};
    const today = new Date();

    habits.forEach(h => {
      let currentStreak = 0;
      let countingCurrent = true;
      let bestStreak = 0;
      let runningStreak = 0;

      // Scan last 60 days
      for (let i = 0; i < 60; i++) {
        const dStr = toDateStr(addDays(today, -i));
        const val = habitLogs[`${h.id}_${dStr}`] || 0;
        const req = h.habitType === 'counter' ? h.dailyGoal : 1;
        const done = val >= req;

        if (done) {
          runningStreak++;
          if (runningStreak > bestStreak) bestStreak = runningStreak;
          if (countingCurrent) currentStreak++;
        } else {
          // If missed today, don't break current streak yet if yesterday was completed
          if (i === 0) {
            // Check yesterday
            continue;
          }
          countingCurrent = false;
          runningStreak = 0;
        }
      }

      map[h.id] = { current: currentStreak, best: Math.max(bestStreak, currentStreak) };
    });

    return map;
  }, [habits, habitLogs]);

  // ── Metrics & Radial Rings Data ──────────────────────────────────────
  const todayHabitsStats = useMemo(() => {
    const total = habits.length;
    if (total === 0) return { completed: 0, total: 0, pct: 0 };
    let completed = 0;
    habits.forEach(h => {
      const val = habitLogs[`${h.id}_${todayStr}`] || 0;
      const req = getGoalForHabit(h);
      if (val >= req) completed++;
    });
    return { completed, total, pct: (completed / total) * 100 };
  }, [habits, habitLogs, todayStr, energyMode]);

  const timelineStats = useMemo(() => {
    const total = timeline.length;
    const completed = timeline.filter(b => b.completedDates.includes(todayStr)).length;
    const pct = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, pct };
  }, [timeline, todayStr]);

  // Real combined daily focus (habits + scheduled execution blocks)
  const todayFocus = useMemo(() => {
    const totalActions = todayHabitsStats.total + timelineStats.total;
    const completedActions = todayHabitsStats.completed + timelineStats.completed;
    const pct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
    return {
      completedActions,
      totalActions,
      pct,
      habitsCompleted: todayHabitsStats.completed,
      habitsTotal: todayHabitsStats.total,
      timelineCompleted: timelineStats.completed,
      timelineTotal: timelineStats.total,
    };
  }, [todayHabitsStats, timelineStats]);

  const weeklyStats = useMemo(() => {
    let targetCheckins = 0;
    let doneCheckins = 0;

    habits.forEach(h => {
      targetCheckins += h.targetDaysPerWeek;
      currentWeekDays.forEach(day => {
        const val = habitLogs[`${h.id}_${day.dateStr}`] || 0;
        const req = h.habitType === 'counter' ? h.dailyGoal : 1;
        if (val >= req) doneCheckins++;
      });
    });

    const pct = targetCheckins > 0 ? Math.round((doneCheckins / targetCheckins) * 100) : 0;
    return { done: doneCheckins, target: targetCheckins, pct };
  }, [habits, habitLogs, currentWeekDays]);

  // Daily Bonus Tier (based on real combined focus %)
  const bonusClaimKey = `quantum_pulse_bonus_${uid}_${todayStr}`;
  const [bonusClaimed, setBonusClaimed] = useState<boolean>(() => {
    return localStorage.getItem(bonusClaimKey) === 'true';
  });

  const dailyBonusTier = useMemo(() => {
    const pct = todayFocus.pct;
    if (pct >= 100) return { name: 'Perfect Day', bonusXp: 150, color: '#10b981', eligible: true };
    if (pct >= 80) return { name: 'Disciplined', bonusXp: 90, color: '#3b82f6', eligible: true };
    if (pct >= 50) return { name: 'Momentum', bonusXp: 45, color: '#f59e0b', eligible: true };
    return { name: 'Unearned', bonusXp: 0, color: '#6b7280', eligible: false };
  }, [todayFocus.pct]);

  const [debriefOpen, setDebriefOpen] = useState(false);

  const handleClaimBonus = async () => {
    if (!dailyBonusTier.eligible || bonusClaimed) return;
    audio.playSuccess();
    setBonusClaimed(true);
    localStorage.setItem(bonusClaimKey, 'true');
    await addXp('Mind', `Daily Bonus: ${dailyBonusTier.name}`, dailyBonusTier.bonusXp);
    toast.success(`🎉 Claimed Daily Bonus! +${dailyBonusTier.bonusXp} Mind XP`);
    setDebriefOpen(true);
  };

  // ── Modals: Add / Edit Habit ─────────────────────────────────────────
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<QuantumHabit | null>(null);
  const [mName, setMName] = useState('');
  const [mSurvival, setMSurvival] = useState('');
  const [mPillar, setMPillar] = useState<Pillar>('Study');
  const [mType, setMType] = useState<HabitType>('check');
  const [mGoal, setMGoal] = useState<number>(1);
  const [mUnit, setMUnit] = useState<string>('times');
  const [mDays, setMDays] = useState<number>(6);
  const [mXp, setMXp] = useState<number>(35);

  const openNewHabitModal = () => {
    audio.playClick();
    setEditingHabit(null);
    setMName('');
    setMSurvival('');
    setMPillar('Study');
    setMType('check');
    setMGoal(1);
    setMUnit('times');
    setMDays(6);
    setMXp(35);
    setHabitModalOpen(true);
  };

  const openEditHabitModal = (h: QuantumHabit) => {
    audio.playClick();
    setEditingHabit(h);
    setMName(h.name);
    setMSurvival(h.survivalName);
    setMPillar(h.pillar);
    setMType(h.habitType);
    setMGoal(h.dailyGoal);
    setMUnit(h.unit);
    setMDays(h.targetDaysPerWeek);
    setMXp(h.xpReward);
    setHabitModalOpen(true);
  };

  const saveHabit = () => {
    if (!mName.trim()) return;
    audio.playSuccess();

    if (editingHabit) {
      setHabits(prev => prev.map(h => h.id === editingHabit.id ? {
        ...h,
        name: mName.trim(),
        survivalName: mSurvival.trim() || `2-Min Micro: ${mName.trim()}`,
        pillar: mPillar,
        color: PILLAR_CONFIG[mPillar].color,
        habitType: mType,
        dailyGoal: mType === 'counter' ? Math.max(1, mGoal) : 1,
        unit: mUnit.trim() || 'times',
        targetDaysPerWeek: Math.min(7, Math.max(1, mDays)),
        xpReward: mXp,
      } : h));
      toast.success('Habit Protocol Updated');
    } else {
      const created: QuantumHabit = {
        id: `h-${Date.now()}`,
        name: mName.trim(),
        survivalName: mSurvival.trim() || `2-Min Micro: ${mName.trim()}`,
        pillar: mPillar,
        color: PILLAR_CONFIG[mPillar].color,
        habitType: mType,
        dailyGoal: mType === 'counter' ? Math.max(1, mGoal) : 1,
        unit: mUnit.trim() || 'times',
        targetDaysPerWeek: Math.min(7, Math.max(1, mDays)),
        xpReward: mXp,
      };
      setHabits(prev => [...prev, created]);
      toast.success('New Habit Protocol Initialized');
    }
    setHabitModalOpen(false);
  };

  const deleteHabit = (id: string) => {
    audio.playClick();
    if (confirm('Delete this habit protocol?')) {
      setHabits(prev => prev.filter(h => h.id !== id));
      toast.success('Protocol removed');
    }
  };

  // ── Row 3: 7-Day Completion Bars & 28-Day Heatmap Data ───────────────
  const weeklyCompletionBars = useMemo(() => {
    return currentWeekDays.map(day => {
      let done = 0;
      let total = habits.length;
      habits.forEach(h => {
        const val = habitLogs[`${h.id}_${day.dateStr}`] || 0;
        const req = h.habitType === 'counter' ? h.dailyGoal : 1;
        if (val >= req) done++;
      });
      timeline.forEach(b => {
        if (b.completedDates.includes(day.dateStr)) done++;
        total++;
      });
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { short: day.short, dateStr: day.dateStr, pct, done, total };
    });
  }, [currentWeekDays, habits, habitLogs, timeline]);

  const last28Days = useMemo(() => {
    const list: { dateStr: string; pct: number }[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = addDays(today, -i);
      const dStr = toDateStr(d);
      let done = 0;
      let total = habits.length;
      habits.forEach(h => {
        const val = habitLogs[`${h.id}_${dStr}`] || 0;
        const req = h.habitType === 'counter' ? h.dailyGoal : 1;
        if (val >= req) done++;
      });
      timeline.forEach(b => {
        if (b.completedDates.includes(dStr)) done++;
        total++;
      });
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      list.push({ dateStr: dStr, pct });
    }
    return list;
  }, [habits, habitLogs, timeline]);

  // Real actual streak count (truthful, matches Engagement Hub exactly)
  const actualStreak = engagementStats.currentLoginStreak || state.streakCount || 0;

  // Streak shields: Earned 1 shield per 7 consecutive days of actual streak (0-6d = 0, 7-13d = 1, 14-20d = 2, 21+d = 3)
  const streakShields = Math.min(3, Math.floor(actualStreak / 7));

  // Filtered habits by pillar
  const displayedHabits = useMemo(() => {
    if (pillarFilter === 'All') return habits;
    return habits.filter(h => h.pillar === pillarFilter);
  }, [habits, pillarFilter]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-28 md:pb-8 scrollbar-none">
      {/* ─── TOP COMMAND BAR ─── */}
      <div className="glass-panel p-4 md:p-5 rounded-3xl border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Operator Rank, Level & Streak Shields */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            onClick={() => {
              audio.playClick();
              if (onNavigate) onNavigate('rank');
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider cursor-pointer hover:border-primary hover:scale-105 transition-all"
            title="View Ascension Rank & AI Counsel"
          >
            <Trophy size={14} className="text-primary" />
            <span>Lv.{state.totalLevel} {state.rank}</span>
          </div>

          <div
            onClick={() => {
              audio.playClick();
              if (onNavigate) onNavigate('engagement');
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-black cursor-pointer hover:border-orange-500/50 hover:scale-105 transition-all"
            title="View Streak & Activity in Engagement Hub"
          >
            <Flame size={14} />
            <span>{actualStreak}d Streak</span>
          </div>

          <div
            onClick={() => {
              audio.playClick();
              if (onNavigate) onNavigate('engagement');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-black cursor-pointer hover:border-cyan-500/50 hover:scale-105 transition-all"
            title={
              actualStreak >= 7
                ? `${streakShields}/3 Streak Shields active. Earn 1 shield per 7 days of consistency.`
                : '0/3 Streak Shields. Reach a 7-day streak to unlock your first Streak Shield!'
            }
          >
            <Shield size={14} />
            <span>{streakShields}/3 Streak Shields</span>
          </div>

          <div className="text-xs text-textMuted font-medium hidden xl:block">
            {actualStreak === 0
              ? '⚡ Check off daily habits and execution blocks to ignite your streak!'
              : energyMode === 'survival'
              ? '🛡️ Survival Mode: 2-minute micro-habits active so busy days never break your streak.'
              : energyMode === 'peak'
              ? '🔥 Peak Overdrive: +20% Bonus XP active across all habit protocols.'
              : '⚡ Standard Protocol: Execute daily habits for full consistency rewards.'}
          </div>
        </div>

        {/* Right: Energy Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10 self-start lg:self-auto">
          {([
            { id: 'peak', label: '🔥 Peak (1.2x XP)', active: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
            { id: 'normal', label: '⚡ Normal', active: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
            { id: 'survival', label: '🛡️ Busy / Survival', active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
          ] as const).map(m => (
            <button
              key={m.id}
              onClick={() => {
                audio.playClick();
                setEnergyMode(m.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                energyMode === m.id ? m.active : 'border-transparent text-textMuted hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── ROW 1: 3 RADIAL RINGS + THE ENGINE (ROUTINE FOCUS TIMER) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 3 Radial Progress Rings */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-3xl border border-white/10 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-textMain flex items-center gap-2">
              <Sparkles size={15} className="text-primary" />
              <span>Consistency & Daily Targets</span>
            </h3>

            {/* Ring 1: Today's Focus */}
            <RadialRing
              pct={todayFocus.pct}
              color="#10b981"
              label="Today's Focus"
              sublabel={todayFocus.totalActions > 0 ? `${todayFocus.habitsCompleted}/${todayFocus.habitsTotal} Habits · ${todayFocus.timelineCompleted}/${todayFocus.timelineTotal} Blocks (${todayFocus.pct}%)` : 'No active protocols'}
              onClick={() => {
                audio.playClick();
                if (onNavigate) onNavigate('engagement');
              }}
            />

            {/* Ring 2: Weekly Target */}
            <RadialRing
              pct={weeklyStats.pct}
              color="#3b82f6"
              label="Weekly Target"
              sublabel={`${weeklyStats.done} / ${weeklyStats.target} Check-ins (${weeklyStats.pct}%)`}
              onClick={() => {
                audio.playClick();
                if (onNavigate) onNavigate('engagement');
              }}
            />
          </div>

          {/* Ring 3: Daily Bonus Tier */}
          <div className="flex flex-col justify-center p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-textMuted">Daily Bonus</span>
              <span
                className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border"
                style={{ color: dailyBonusTier.color, borderColor: `${dailyBonusTier.color}40`, backgroundColor: `${dailyBonusTier.color}15` }}
              >
                {dailyBonusTier.name}
              </span>
            </div>

            <div className="text-xs font-bold text-textMain">
              {dailyBonusTier.eligible ? `+${dailyBonusTier.bonusXp} XP Available` : 'Need 50%+ for Bonus'}
            </div>

            <button
              disabled={!dailyBonusTier.eligible || bonusClaimed}
              onClick={handleClaimBonus}
              className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                bonusClaimed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                  : dailyBonusTier.eligible
                  ? 'bg-primary text-white hover:bg-primary/80 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'bg-white/5 text-textMuted border border-white/5 cursor-not-allowed'
              }`}
            >
              {bonusClaimed ? '✓ Claimed Today' : 'Claim Bonus XP'}
            </button>
          </div>
        </div>

        {/* The Engine (Real-Time Routine Timer & Execution Engine) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl border border-white/10 overflow-hidden min-h-[380px] flex flex-col">
          <EngineCard />
        </div>
      </div>

      {/* ─── ROW 2: 7-DAY HABITPULSE MATRIX ─── */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
        {/* Controls: Filter Tabs, Week Navigator & + New Habit */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Pillar Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {(['All', 'Study', 'Health', 'Finance', 'Mind'] as const).map(p => (
              <button
                key={p}
                onClick={() => {
                  audio.playClick();
                  setPillarFilter(p);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  pillarFilter === p
                    ? 'bg-white/10 text-white border-white/20 shadow-md'
                    : 'border-transparent text-textMuted hover:text-white hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Week Navigator & Add Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  audio.playClick();
                  setWeekOffset(o => o - 1);
                }}
                className="p-1 rounded hover:bg-white/10 text-textMuted hover:text-white"
                title="Previous Week"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="text-[11px] font-bold text-textMain px-2 select-none">
                {weekDateRangeLabel}
              </span>

              <button
                onClick={() => {
                  audio.playClick();
                  setWeekOffset(o => o + 1);
                }}
                className="p-1 rounded hover:bg-white/10 text-textMuted hover:text-white"
                title="Next Week"
              >
                <ChevronRight size={14} />
              </button>

              {weekOffset !== 0 && (
                <button
                  onClick={() => {
                    audio.playClick();
                    setWeekOffset(0);
                  }}
                  className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-primary/20 text-primary hover:bg-primary/30"
                >
                  Today
                </button>
              )}
            </div>

            <button
              onClick={openNewHabitModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:scale-105 transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)]"
            >
              <Plus size={14} />
              <span>New Habit</span>
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-textMuted">
                <th className="py-2.5 px-3">Habit Protocol</th>
                {currentWeekDays.map(day => {
                  const isToday = day.dateStr === todayStr;
                  return (
                    <th key={day.dateStr} className={`py-2.5 px-2 text-center ${isToday ? 'text-primary' : ''}`}>
                      <div>{day.short}</div>
                      <div className="text-[9px] font-bold opacity-60">
                        {day.date.toLocaleDateString(undefined, { day: 'numeric' })}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 text-center">Weekly Goal</th>
                <th className="py-2.5 px-3 text-center">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayedHabits.map(h => {
                const conf = PILLAR_CONFIG[h.pillar];
                const Icon = conf.icon;
                const displayName = energyMode === 'survival' ? h.survivalName : h.name;
                const reqGoal = energyMode === 'survival' ? 1 : (h.habitType === 'counter' ? h.dailyGoal : 1);

                // Weekly done count
                let weeklyDone = 0;
                currentWeekDays.forEach(day => {
                  const val = habitLogs[`${h.id}_${day.dateStr}`] || 0;
                  if (val >= reqGoal) weeklyDone++;
                });
                const weeklyPct = Math.min(100, Math.round((weeklyDone / h.targetDaysPerWeek) * 100));
                const streak = habitStreaks[h.id] || { current: 0, best: 0 };

                return (
                  <tr key={h.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Habit Info */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
                          style={{ backgroundColor: `${conf.color}15`, borderColor: `${conf.color}35`, color: conf.color }}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-textMain truncate">{displayName}</span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0"
                              style={{ color: conf.color, borderColor: `${conf.color}30` }}
                            >
                              +{h.xpReward} XP
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-textMuted mt-0.5">
                            <span>{h.habitType === 'counter' ? `${h.dailyGoal} ${h.unit}/day` : 'Daily Check'}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={() => openEditHabitModal(h)}
                                className="text-textMuted hover:text-white p-0.5 rounded"
                                title="Edit Habit"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                onClick={() => deleteHabit(h.id)}
                                className="text-textMuted hover:text-red-400 p-0.5 rounded"
                                title="Delete Habit"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mon-Sun Check-in Cells */}
                    {currentWeekDays.map(day => {
                      const key = `${h.id}_${day.dateStr}`;
                      const count = habitLogs[key] || 0;
                      const dayGoal = day.dateStr === todayStr ? getGoalForHabit(h) : h.dailyGoal;
                      const isComplete = count >= dayGoal;

                      return (
                        <td key={day.dateStr} className="py-3 px-2 text-center">
                          <button
                            onClick={() => toggleHabitDay(h, day.dateStr)}
                            className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all mx-auto flex items-center justify-center border ${
                              isComplete
                                ? 'text-white border-transparent shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                                : count > 0
                                ? 'bg-white/10 text-white border-white/20'
                                : 'bg-white/[0.03] text-textMuted border-white/5 hover:border-white/20'
                            }`}
                            style={{
                              backgroundColor: isComplete ? conf.color : undefined,
                            }}
                            title={`Click to check in (${count}/${dayGoal})`}
                          >
                            {isComplete ? (
                              <Check size={14} className="stroke-[3]" />
                            ) : h.habitType === 'counter' && count > 0 ? (
                              `${count}`
                            ) : null}
                          </button>
                        </td>
                      );
                    })}

                    {/* Weekly Goal Progress Bar */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1 min-w-[70px]">
                        <span className="text-[10px] font-black text-textMain">
                          {weeklyDone}/{h.targetDaysPerWeek} ({weeklyPct}%)
                        </span>
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${weeklyPct}%`,
                              backgroundColor: weeklyPct >= 100 ? '#10b981' : conf.color,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Streak Column */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-orange-400 flex items-center gap-1">
                          <Flame size={12} />
                          {streak.current}d
                        </span>
                        <span className="text-[9px] text-textMuted">Best: {streak.best}d</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ROW 3: LIVE DAY TIMELINE BLOCKS + QUICK TODO PROTOCOL DECK (1ST SCREENSHOT SECTION) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Day Timeline Blocks */}
        <div className="bg-[#11131e] p-5 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Calendar size={15} className="text-primary" /> Daily Execution Timeline
            </h3>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  audio.playClick();
                  if (onNavigate) onNavigate('control_room');
                }}
                className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-blue-300 transition-colors"
                title="Configure Timetable & Engine in System"
              >
                Configure System →
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {timeline.map(block => {
              const done = block.completedDates.includes(todayStr);
              const pCfg = PILLAR_CONFIG[block.pillar];
              return (
                <div
                  key={block.id}
                  onClick={() => toggleTimelineBlock(block)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    done
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'
                      }`}
                    >
                      {done && <Check size={14} className="stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${done ? 'line-through text-zinc-400' : 'text-white'}`}>
                        {block.title}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {block.start} – {block.end} • <span className={pCfg.text}>{block.pillar}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-300 shrink-0">
                    +{block.priority === 'High' ? 60 : 40} XP
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Todo Protocol Deck */}
        <div className="bg-[#11131e] p-5 rounded-3xl border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400" /> Quick Todo Protocol Deck
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTodoTitle}
                onChange={e => setNewTodoTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddQuickTodo();
                }}
                placeholder="Add quick task & press Enter..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-primary"
              />
              <select
                value={newTodoPillar}
                onChange={e => setNewTodoPillar(e.target.value as Pillar)}
                className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none"
              >
                <option value="Study">Study</option>
                <option value="Health">Health</option>
                <option value="Finance">Finance</option>
                <option value="Mind">Mind</option>
              </select>
              <button
                onClick={handleAddQuickTodo}
                className="px-3.5 py-2 rounded-xl text-white text-xs font-black bg-primary hover:bg-primary/80 transition-all flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.3)]"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {quickTodos.map(td => (
                <div
                  key={td.id}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-2"
                >
                  <button
                    onClick={() => toggleQuickTodo(td.id)}
                    className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        td.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'
                      }`}
                    >
                      {td.completed && <Check size={12} className="stroke-[3]" />}
                    </div>
                    <span className={`text-xs font-bold truncate ${td.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                      {td.title}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${PILLAR_CONFIG[td.pillar].text} ${PILLAR_CONFIG[td.pillar].bg} ${PILLAR_CONFIG[td.pillar].border}`}
                    >
                      {td.pillar}
                    </span>
                    <button
                      onClick={() => deleteQuickTodo(td.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 4: WEEKLY BAR CHART + 28-DAY HEATMAP + LIVE BIO-TELEMETRY ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Weekly Streak Bar Chart + 28-Day Consistency Heatmap */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-3xl border border-white/10 space-y-5">
          {/* Weekly 7-Day Completion Bar Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                onClick={() => {
                  audio.playClick();
                  if (onNavigate) onNavigate('engagement');
                }}
                className="cursor-pointer group flex items-center gap-2"
                title="View full engagement velocity analytics"
              >
                <Flame size={15} className="text-orange-400 group-hover:scale-110 transition-transform" />
                <h3 className="text-xs font-black uppercase tracking-wider text-textMain group-hover:text-orange-400 transition-colors">
                  Weekly Execution Velocity
                </h3>
                <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-textMuted font-bold uppercase">{weekDateRangeLabel}</span>
                <button
                  onClick={() => {
                    audio.playClick();
                    if (onNavigate) onNavigate('engagement');
                  }}
                  className="text-[10px] font-bold text-primary hover:underline uppercase"
                >
                  Full Hub →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 h-28 items-end pt-2 pb-1 border-b border-white/5">
              {weeklyCompletionBars.map((bar, i) => (
                <div
                  key={i}
                  onClick={() => {
                    audio.playClick();
                    if (onNavigate) onNavigate('engagement');
                  }}
                  className="flex flex-col items-center gap-1 h-full justify-end cursor-pointer group"
                  title={`${bar.short} (${bar.dateStr}): ${bar.pct}% completed. Click to view Engagement Hub.`}
                >
                  <span className="text-[9px] font-bold text-textMuted group-hover:text-primary transition-colors">{bar.pct}%</span>
                  <div className="w-full bg-white/5 rounded-lg h-20 flex items-end overflow-hidden p-0.5 group-hover:bg-white/10 transition-colors">
                    <div
                      className="w-full rounded-md transition-all duration-700"
                      style={{
                        height: `${Math.max(4, bar.pct)}%`,
                        backgroundColor: bar.pct >= 100 ? '#10b981' : bar.pct >= 50 ? '#3b82f6' : '#f59e0b',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${bar.dateStr === todayStr ? 'text-primary font-black' : 'text-textMuted group-hover:text-white'}`}>
                    {bar.short}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 28-Day Consistency Heatmap */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div
                onClick={() => {
                  audio.playClick();
                  if (onNavigate) onNavigate('engagement');
                }}
                className="cursor-pointer group flex items-center gap-1.5"
                title="View full activity contribution graph in Engagement Hub"
              >
                <h4 className="text-[11px] font-black uppercase tracking-wider text-textMuted group-hover:text-textMain transition-colors">
                  28-Day HabitPulse Consistency Heatmap
                </h4>
                <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">View Graph →</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-textMuted">
                <span>Less</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-white/5 border border-white/10" />
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/40" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {last28Days.map((item, idx) => {
                let bg = 'bg-white/5 border-white/5';
                if (item.pct >= 100) bg = 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
                else if (item.pct >= 70) bg = 'bg-emerald-500/70 border-emerald-500/40';
                else if (item.pct > 0) bg = 'bg-blue-500/50 border-blue-500/30';

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      audio.playClick();
                      if (onNavigate) onNavigate('engagement');
                    }}
                    title={`${item.dateStr}: ${Math.round(item.pct)}% habits done. Click to view Engagement Hub.`}
                    className={`h-7 rounded-lg border flex items-center justify-center text-[9px] font-bold text-white/90 transition-all cursor-pointer hover:scale-110 ${bg}`}
                  >
                    {item.pct > 0 ? `${Math.round(item.pct)}%` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Bio-Telemetry Widget */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-3xl border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div
                onClick={() => {
                  audio.playClick();
                  if (onNavigate) onNavigate('lab');
                }}
                className="flex items-center gap-2 cursor-pointer group"
                title="Open Health & Bio-Optimization Lab"
              >
                <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
                  <HeartPulse size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-textMain group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                    <span>Live Bio-Telemetry Lab</span>
                    <span className="text-[10px] text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </h3>
                  <p className="text-[9px] text-textMuted uppercase font-semibold">Health & Bio-Optimization</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black uppercase tracking-wider">
                  {healthReadinessScore}% Ready
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">{todayStr}</span>
              </div>
            </div>

            {/* Bio-Readiness Progress Bar */}
            <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-textMuted uppercase tracking-wider">Bio-Readiness Index</span>
                <span className="text-emerald-400 font-black">{healthReadinessScore}/100 Optimal</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500 rounded-full"
                  style={{ width: `${healthReadinessScore}%` }}
                />
              </div>
            </div>

            {/* Mass, Hydration, Sleep Controls */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Body Mass */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-textMuted">
                  <Scale size={11} className="text-blue-400" /> Mass
                </div>
                <div className="text-base font-black text-white">{bio.weightKg.toFixed(1)} kg</div>
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => handleUpdateBio('weightKg', -0.2)}
                    className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black text-textMain transition-colors"
                  >
                    -0.2
                  </button>
                  <button
                    onClick={() => handleUpdateBio('weightKg', 0.2)}
                    className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black text-textMain transition-colors"
                  >
                    +0.2
                  </button>
                </div>
              </div>

              {/* Hydration */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-textMuted">
                  <Droplets size={11} className="text-cyan-400" /> Water
                </div>
                <div className="text-base font-black text-white">{bio.waterLiters.toFixed(1)} / 4.0L</div>
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => handleUpdateBio('waterLiters', -0.5)}
                    className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black text-textMain transition-colors"
                  >
                    -0.5
                  </button>
                  <button
                    onClick={() => handleUpdateBio('waterLiters', 0.5)}
                    className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black text-textMain transition-colors"
                  >
                    +0.5
                  </button>
                </div>
              </div>

              {/* Sleep Hours */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-textMuted">
                  <Moon size={11} className="text-purple-400" /> Sleep
                </div>
                <div className="text-base font-black text-white">{bio.sleepHours.toFixed(1)} hrs</div>
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => handleUpdateBio('sleepHours', -0.5)}
                    className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black text-textMain transition-colors"
                  >
                    -0.5
                  </button>
                  <button
                    onClick={() => handleUpdateBio('sleepHours', 0.5)}
                    className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black text-textMain transition-colors"
                  >
                    +0.5
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Direct jump to Health & Bio Lab */}
          <div className="pt-2">
            <button
              onClick={() => {
                audio.playClick();
                if (onNavigate) onNavigate('lab');
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 hover:border-emerald-400 text-textMain text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
            >
              <HeartPulse size={16} className="text-emerald-400" />
              <span>Launch Health & Bio-Optimization Lab →</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL: ADD / EDIT HABIT PROTOCOL ─── */}
      {habitModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11131e] border border-white/20 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {editingHabit ? 'Edit Habit Protocol' : 'New Habit Protocol'}
              </h3>
              <button onClick={() => setHabitModalOpen(false)} className="text-textMuted hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Habit Title</label>
                <input
                  type="text"
                  value={mName}
                  onChange={e => setMName(e.target.value)}
                  placeholder="e.g., SAP RAP & CDS Views Practice"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-textMuted block mb-1">
                  2-Minute Micro Version (Survival Mode)
                </label>
                <input
                  type="text"
                  value={mSurvival}
                  onChange={e => setMSurvival(e.target.value)}
                  placeholder="e.g., Read 1 CDS/RAP Note (5 min)"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Pillar</label>
                  <select
                    value={mPillar}
                    onChange={e => setMPillar(e.target.value as Pillar)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Study">Study</option>
                    <option value="Health">Health</option>
                    <option value="Finance">Finance</option>
                    <option value="Mind">Mind</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Habit Type</label>
                  <select
                    value={mType}
                    onChange={e => setMType(e.target.value as HabitType)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="check">Check (Done / Undone)</option>
                    <option value="counter">Counter (e.g. 4 reps)</option>
                  </select>
                </div>
              </div>

              {mType === 'counter' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Daily Goal Count</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={mGoal}
                      onChange={e => setMGoal(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Unit</label>
                    <input
                      type="text"
                      value={mUnit}
                      onChange={e => setMUnit(e.target.value)}
                      placeholder="times / liters"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Days / Week</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={mDays}
                    onChange={e => setMDays(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Base XP Reward</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    step={5}
                    value={mXp}
                    onChange={e => setMXp(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setHabitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-textMuted text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={saveHabit}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase shadow-lg shadow-primary/20"
              >
                Save Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DAILY REFLECTION / DEBRIEF ─── */}
      {debriefOpen && (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11131e] border border-white/20 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <span>Daily Debrief & Reflection</span>
              </h3>
              <button onClick={() => setDebriefOpen(false)} className="text-textMuted hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-textMuted block mb-1">
                  🏆 Today's #1 Win
                </label>
                <textarea
                  value={bio.dailyWin || ''}
                  onChange={e => setBio(b => ({ ...b, dailyWin: e.target.value }))}
                  rows={2}
                  placeholder="What was your main achievement or breakthrough today?"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-textMuted block mb-1">
                  🎯 Tomorrow's #1 Priority
                </label>
                <textarea
                  value={bio.tomorrowPriority || ''}
                  onChange={e => setBio(b => ({ ...b, tomorrowPriority: e.target.value }))}
                  rows={2}
                  placeholder="What single critical task will move the needle tomorrow?"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <button
              onClick={() => {
                audio.playSuccess();
                setDebriefOpen(false);
                toast.success('Reflection Saved to Daily Biometrics');
              }}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase shadow-lg shadow-primary/20"
            >
              Save Daily Debrief
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandDeck;
