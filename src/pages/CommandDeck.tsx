import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame, Shield, Plus, Check, Trash2, Pencil,
  ChevronLeft, ChevronRight,
  BookOpen, Dumbbell, Briefcase, Brain, Trophy,
  Droplets, Moon, Scale, Sparkles, X,
  Calendar, HeartPulse, Clock, Lightbulb, Copy
} from 'lucide-react';
import { useProgression, type Pillar } from '../hooks/useProgression';
import { useEngagement } from '../hooks/useEngagement';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';
import toast from 'react-hot-toast';
import { EngineCard } from '../components/EngineCard';
import { type BioMission, DEFAULT_PROTOCOLS } from '../lib/bioProtocols';
import { loadSavedThoughts, getTodayThought } from '../lib/dailyThoughts';

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

export interface ProtocolTodoItem {
  id: number;
  title: string;
  dayOfWeek: number; // 0=Sun … 6=Sat
  time?: string;
  pillar: Pillar;
  isOneOff?: boolean;
  completed?: boolean;
  completedDates?: string[];
  task_target?: 'High' | 'Medium' | 'Low';
  xpAwarded?: boolean;
  xpAwardedDates?: string[];
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'one-off';
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

function getSystemTimetableTasks(authId: string | null, displayName?: string): any[] | null {
  const keys = [
    authId ? `quantum_timetable_${authId}` : null,
    displayName ? `quantum_timetable_${displayName}` : null,
    'quantum_timetable_default',
    'quantum_timetable',
  ].filter(Boolean) as string[];

  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw && raw !== 'undefined' && raw !== 'null') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
  }
  return null;
}

function getSystemTodos(authId: string | null, displayName?: string, settingsTodos?: ProtocolTodoItem[]): ProtocolTodoItem[] {
  // 1. Prioritize live Supabase profile settings if available
  if (Array.isArray(settingsTodos) && settingsTodos.length > 0) {
    return settingsTodos;
  }

  // 2. Check prioritized specific localStorage keys
  const keys = [
    authId ? `quantum_todos_${authId}` : null,
    displayName ? `quantum_todos_${displayName}` : null,
    'quantum_todos_default',
    'quantum_todos',
    'quantum_pulse_quicktodos_default',
    displayName ? `quantum_pulse_quicktodos_${displayName}` : null,
  ].filter(Boolean) as string[];

  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw && raw !== 'undefined' && raw !== 'null') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
  }

  // 3. Scan all localStorage keys for any saved protocol todos
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('quantum_todos_') || k.startsWith('quantum_pulse_quicktodos_'))) {
        const raw = localStorage.getItem(k);
        if (raw && raw !== 'undefined' && raw !== 'null') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch {}
        }
      }
    }
  } catch {}

  return [];
}

function loadTodayTimeline(authId: string | null, displayName: string): TimetableBlock[] {
  const todayDay = new Date().getDay();
  const systemTasks = getSystemTimetableTasks(authId, displayName);

  let completionsMap: Record<string, string[]> = {};
  const completionKeys = [
    authId ? `quantum_pulse_timeline_completions_${authId}` : null,
    `quantum_pulse_timeline_completions_${displayName || 'operator'}`,
    `quantum_pulse_timeline_completions_default`,
  ].filter(Boolean) as string[];

  for (const k of completionKeys) {
    const raw = localStorage.getItem(k);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          completionsMap = { ...completionsMap, ...parsed };
        }
      } catch {}
    }
  }

  const oldKeys = [
    authId ? `quantum_pulse_timeline_${authId}` : null,
    `quantum_pulse_timeline_${displayName || 'operator'}`,
    `quantum_pulse_timeline_default`,
  ].filter(Boolean) as string[];

  for (const k of oldKeys) {
    const old = localStorage.getItem(k);
    if (old) {
      try {
        const parsed = JSON.parse(old);
        if (Array.isArray(parsed)) {
          parsed.forEach((b: any) => {
            if (b.id && Array.isArray(b.completedDates)) {
              completionsMap[b.id] = Array.from(new Set([...(completionsMap[b.id] || []), ...b.completedDates]));
            }
          });
        }
      } catch {}
    }
  }

  if (systemTasks && systemTasks.length > 0) {
    const filtered = systemTasks.filter((t: any) => t.dayOfWeek === undefined || t.dayOfWeek === null || t.dayOfWeek === todayDay);
    if (filtered.length > 0) {
      filtered.sort((a: any, b: any) => (a.start || '00:00').localeCompare(b.start || '00:00'));
      return filtered.map((t: any, idx: number) => {
        const id = `tb-${t.id || idx}`;
        return {
          id,
          start: t.start || '09:00',
          end: t.end || '10:00',
          title: t.title || 'Focus Protocol',
          pillar: (t.pillar || (t.category === 'gym' ? 'Health' : t.category === 'study' ? 'Study' : t.category === 'work' ? 'Finance' : 'Mind')) as Pillar,
          priority: (t.task_target || 'High') as 'High' | 'Medium' | 'Low',
          completedDates: completionsMap[id] || [],
        };
      });
    }
  }

  return DEFAULT_TIMELINE;
}

function isTodoDoneToday(t: ProtocolTodoItem, todayStr: string): boolean {
  const rec = t.recurrence || (t.isOneOff ? 'one-off' : 'weekly');
  if (rec === 'one-off') return !!t.completed;
  if (rec === 'daily') return !!t.completedDates?.includes(todayStr);
  if (rec === 'monthly') {
    const month = todayStr.substring(0, 7);
    return !!t.completedDates?.some(d => d.startsWith(month));
  }
  return !!t.completedDates?.includes(todayStr);
}

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
  const { state, addXp, updateProfile, refuelStreakShield } = useProgression();
  const { stats: engagementStats } = useEngagement();
  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const dailyThoughtsList = useMemo(() => loadSavedThoughts(state.settings?.customThoughts), [state.settings?.customThoughts]);
  const todayThought = useMemo(() => getTodayThought(dailyThoughtsList), [dailyThoughtsList]);
  const uid = state.displayName || 'operator';
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [dbActivityMap, setDbActivityMap] = useState<Record<string, { count: number; xp: number }>>({});
  const [shieldModalOpen, setShieldModalOpen] = useState(false);

  // ─── BIO-OPTIMIZATION PROTOCOLS (HEALTH TASKS) ─────────────────────────
  const bioMissionsKey = `quantum_bio_missions_${uid}`;
  const [protocols, setProtocols] = useState<BioMission[]>(() => {
    if (state.settings?.bioMissions && Array.isArray(state.settings.bioMissions) && state.settings.bioMissions.length > 0) {
      return state.settings.bioMissions.map((m: BioMission) => ({
        ...m,
        completed: m.lastCompletedDate === todayStr ? (m.completed ?? false) : false
      }));
    }
    const saved = localStorage.getItem(bioMissionsKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: BioMission) => ({
            ...m,
            completed: m.lastCompletedDate === todayStr ? (m.completed ?? false) : false
          }));
        }
      } catch {}
    }
    return DEFAULT_PROTOCOLS;
  });

  useEffect(() => {
    localStorage.setItem(bioMissionsKey, JSON.stringify(protocols));
    if (supabase) {
      const client = supabase;
      client.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user && updateProfile) {
          try {
            await updateProfile({
              settings: {
                ...state.settings,
                bioMissions: protocols
              }
            });
          } catch (err) {
            console.warn('Profile protocol sync warning:', err);
          }
        }
      });
    }
  }, [protocols, bioMissionsKey]);

  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<BioMission | null>(null);
  const [protocolForm, setProtocolForm] = useState<{
    title: string;
    time: string;
    xp: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }>({
    title: '',
    time: '15 min',
    xp: 30,
    difficulty: 'Medium',
  });

  const handleOpenAddProtocol = () => {
    setEditingProtocol(null);
    setProtocolForm({ title: '', time: '15 min', xp: 30, difficulty: 'Medium' });
    setProtocolModalOpen(true);
  };

  const handleOpenEditProtocol = (p: BioMission, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProtocol(p);
    setProtocolForm({
      title: p.title,
      time: p.time,
      xp: p.xp,
      difficulty: p.difficulty,
    });
    setProtocolModalOpen(true);
  };

  const handleDeleteProtocol = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audio.playClick();
    setProtocols(prev => prev.filter(p => p.id !== id));
    toast.success('Protocol removed.');
  };

  const handleSaveProtocol = () => {
    if (!protocolForm.title.trim()) {
      toast.error('Protocol title required.');
      return;
    }
    audio.playSuccess();
    if (editingProtocol) {
      setProtocols(prev => prev.map(p => p.id === editingProtocol.id ? { ...p, ...protocolForm, title: protocolForm.title.trim() } : p));
      toast.success('Protocol updated.');
    } else {
      const newProtocol: BioMission = {
        id: `bp-${Date.now()}`,
        title: protocolForm.title.trim(),
        time: protocolForm.time.trim() || '15 min',
        xp: Number(protocolForm.xp) || 30,
        difficulty: protocolForm.difficulty,
        completed: false,
      };
      setProtocols(prev => [newProtocol, ...prev]);
      toast.success('New health protocol created!');
    }
    setProtocolModalOpen(false);
  };

  const handleToggleProtocol = async (id: string) => {
    const mission = protocols.find(p => p.id === id);
    if (!mission) return;

    if (mission.completed) {
      audio.playClick();
      setProtocols(prev => prev.map(p => p.id === id ? { ...p, completed: false } : p));
      toast.success('Protocol marked pending.');
      return;
    }

    audio.playSuccess();
    setProtocols(prev => prev.map(p => p.id === id ? { ...p, completed: true, lastCompletedDate: todayStr } : p));
    const earned = await addXp('Health', `Bio Protocol: ${mission.title}`, mission.xp);
    toast.success(`⚡ Protocol Mastered! +${earned} Health XP`);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUserId(session.user.id);
      }
    });
  }, []);

  // Fetch real activity logs from Supabase for the last 28 days
  useEffect(() => {
    async function loadActivityData() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const startDate = toDateStr(addDays(new Date(), -28));
      const startIso = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const [{ data: dailyRows }, { data: logs }] = await Promise.all([
          supabase
            .from('daily_activity')
            .select('date, activity_count, xp_earned')
            .eq('user_id', user.id)
            .gte('date', startDate),
          supabase
            .from('activity_logs')
            .select('created_at, xp_earned, action_type')
            .eq('user_id', user.id)
            .gte('created_at', startIso)
        ]);

        const map: Record<string, { count: number; xp: number }> = {};
        if (dailyRows) {
          dailyRows.forEach((r: any) => {
            if (r.date) {
              map[r.date] = {
                count: Number(r.activity_count || 0),
                xp: Number(r.xp_earned || 0),
              };
            }
          });
        }
        if (logs) {
          logs.forEach((l: any) => {
            const d = l.created_at?.split('T')[0];
            if (d) {
              if (!map[d]) map[d] = { count: 0, xp: 0 };
              map[d].count += 1;
              map[d].xp += Number(l.xp_earned || 0);
            }
          });
        }
        setDbActivityMap(map);
      } catch (err) {
        console.warn('Error fetching engagement activity data:', err);
      }
    }

    loadActivityData();
  }, [authUserId]);

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

  // Pull latest daily biometrics from Supabase if logged in The Lab
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const fetchRemoteBio = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (!session?.user) return;
        const { data, error } = await client
          .from('daily_biometrics')
          .select('weight_kg, water_liters, sleep_hours, daily_win, tomorrow_priority')
          .eq('user_id', session.user.id)
          .eq('log_date', todayStr)
          .maybeSingle();

        if (data && !error) {
          setBio(prev => ({
            ...prev,
            weightKg: Number(data.weight_kg) || prev.weightKg,
            waterLiters: Number(data.water_liters) || prev.waterLiters,
            sleepHours: Number(data.sleep_hours) || prev.sleepHours,
            dailyWin: data.daily_win || prev.dailyWin,
            tomorrowPriority: data.tomorrow_priority || prev.tomorrowPriority,
          }));
        }
      } catch (err) {
        console.warn('Remote bio fetch error:', err);
      }
    };
    fetchRemoteBio();
  }, [todayStr]);

  useEffect(() => {
    localStorage.setItem(`quantum_pulse_bio_${uid}_${todayStr}`, JSON.stringify(bio));
    const syncBio = async () => {
      const client = supabase;
      if (!client) return;
      try {
        const { data: { session } } = await client.auth.getSession();
        if (!session?.user) return;
        await client.from('daily_biometrics').upsert({
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

  // Real Health Telemetry derived from app state
  const healthHabits = useMemo(() => habits.filter(h => h.pillar === 'Health'), [habits]);
  const completedHealthHabits = useMemo(() => {
    return healthHabits.filter(h => {
      const key = `${h.id}_${todayStr}`;
      const count = habitLogs[key] || 0;
      const dayGoal = getGoalForHabit(h);
      return count >= dayGoal;
    });
  }, [healthHabits, habitLogs, energyMode, todayStr]);

  const todayHealthFocusMins = useMemo(() => {
    const logs = state.settings?.execution_logs || [];
    return logs
      .filter((l: any) => l.date === todayStr && l.pillar === 'Health')
      .reduce((sum: number, l: any) => sum + (Number(l.minutes) || 0), 0);
  }, [state.settings?.execution_logs, todayStr]);

  // Real Dynamic Health bio readiness score (0-100)
  const healthReadinessScore = useMemo(() => {
    let score = 20; // baseline

    // Hydration score (up to 30 pts)
    const waterScore = Math.min(30, Math.round((bio.waterLiters / 3.5) * 30));
    score += waterScore;

    // Sleep score (up to 30 pts)
    if (bio.sleepHours >= 7.0 && bio.sleepHours <= 9.0) {
      score += 30;
    } else if (bio.sleepHours > 0) {
      score += Math.min(25, Math.round((bio.sleepHours / 7.0) * 25));
    }

    // Health habit completion score (up to 15 pts)
    if (healthHabits.length > 0) {
      score += Math.round((completedHealthHabits.length / healthHabits.length) * 15);
    } else {
      score += 10;
    }

    // Active health conditioning / focus minutes (up to 5 pts)
    if (todayHealthFocusMins > 0) {
      score += Math.min(5, Math.round((todayHealthFocusMins / 30) * 5));
    }

    return Math.min(100, Math.max(10, score));
  }, [bio.waterLiters, bio.sleepHours, healthHabits.length, completedHealthHabits.length, todayHealthFocusMins]);

  const handleUpdateBio = async (field: 'weightKg' | 'waterLiters' | 'sleepHours', delta: number) => {
    audio.playSuccess();
    setBio(prev => {
      let nextVal = prev[field] + delta;
      if (field === 'weightKg') nextVal = Math.max(30, Number(nextVal.toFixed(1)));
      if (field === 'waterLiters') nextVal = Math.max(0, Number(nextVal.toFixed(2)));
      if (field === 'sleepHours') nextVal = Math.max(0, Number(nextVal.toFixed(1)));
      return { ...prev, [field]: nextVal };
    });

    const fieldLabel = field === 'weightKg' ? 'Mass' : field === 'waterLiters' ? 'Hydration' : 'Sleep';
    await addXp('Health', `Bio-telemetry: ${fieldLabel}`, 15);
    toast.success(`Logged ${fieldLabel}! +15 Health XP`, { duration: 1500 });
  };

  // ── Timetable Timeline State ─────────────────────────────────────────
  const [timeline, setTimeline] = useState<TimetableBlock[]>(() => {
    return loadTodayTimeline(null, uid);
  });

  const toggleTimelineBlock = async (block: TimetableBlock) => {
    const done = block.completedDates.includes(todayStr);
    const updatedDates = !done 
      ? Array.from(new Set([...block.completedDates, todayStr]))
      : block.completedDates.filter(d => d !== todayStr);

    const updatedTimeline = timeline.map(b => b.id === block.id ? { ...b, completedDates: updatedDates } : b);
    setTimeline(updatedTimeline);

    const completionsMap: Record<string, string[]> = {};
    updatedTimeline.forEach(b => { completionsMap[b.id] = b.completedDates; });
    localStorage.setItem(`quantum_pulse_timeline_completions_${uid}`, JSON.stringify(completionsMap));
    localStorage.setItem(`quantum_pulse_timeline_completions_default`, JSON.stringify(completionsMap));
    if (authUserId) {
      localStorage.setItem(`quantum_pulse_timeline_completions_${authUserId}`, JSON.stringify(completionsMap));
    }

    if (!done) {
      audio.playSuccess();
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
    }
  };

  // ── Daily Protocol Deck Todos State ──────────────────────────────────
  const [allTodos, setAllTodos] = useState<ProtocolTodoItem[]>(() => {
    return getSystemTodos(authUserId, uid, state.settings?.todos);
  });

  const todayDay = new Date().getDay();
  const todayTodos = useMemo(() => {
    return allTodos.filter(t => {
      const rec = t.recurrence || (t.isOneOff ? 'one-off' : 'weekly');
      if (rec === 'daily' || rec === 'monthly') return true;
      if (rec === 'one-off') {
        if (!t.completed) return true;
        if (t.completedDates?.includes(todayStr)) return true;
        return false;
      }
      // If no dayOfWeek specified, applies to all days
      if (t.dayOfWeek === undefined || t.dayOfWeek === null) return true;
      return Number(t.dayOfWeek) === todayDay;
    });
  }, [allTodos, todayDay, todayStr]);

  const toggleProtocolTodo = async (todoId: number) => {
    const target = allTodos.find(t => t.id === todoId);
    if (!target) return;

    const done = isTodoDoneToday(target, todayStr);
    const rec = target.recurrence || (target.isOneOff ? 'one-off' : 'weekly');
    const xpAmt = target.task_target === 'High' ? 100 : target.task_target === 'Low' ? 40 : 60;

    let updatedTodos: ProtocolTodoItem[];
    if (!done) {
      audio.playSuccess();
      updatedTodos = allTodos.map(t => {
        if (t.id !== todoId) return t;
        const newDates = Array.from(new Set([...(t.completedDates || []), todayStr]));
        return {
          ...t,
          completed: true,
          completedDates: newDates,
        };
      });
      await addXp(target.pillar, `Protocol Deck: ${target.title}`, xpAmt);
      toast.success(`✓ Protocol Executed! +${xpAmt} ${target.pillar} XP`);
    } else {
      audio.playClick();
      updatedTodos = allTodos.map(t => {
        if (t.id !== todoId) return t;
        const newDates = (t.completedDates || []).filter(d => d !== todayStr);
        return {
          ...t,
          completed: rec === 'one-off' ? false : t.completed,
          completedDates: newDates,
        };
      });
    }

    setAllTodos(updatedTodos);
    localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(updatedTodos));
    localStorage.setItem(`quantum_todos_default`, JSON.stringify(updatedTodos));
    localStorage.setItem(`quantum_todos`, JSON.stringify(updatedTodos));
    if (authUserId) {
      localStorage.setItem(`quantum_todos_${authUserId}`, JSON.stringify(updatedTodos));
    }
    window.dispatchEvent(new CustomEvent('quantum_todos_updated', { detail: updatedTodos }));

    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase.from('profiles').select('settings').eq('id', session.user.id).single();
          const currentSettings = data?.settings || {};
          await supabase.from('profiles').update({
            settings: { ...currentSettings, todos: updatedTodos }
          }).eq('id', session.user.id);
        }
      } catch (e) {
        console.warn('Todo sync warning:', e);
      }
    }
  };

  const deleteProtocolTodo = async (todoId: number) => {
    audio.playClick();
    const updated = allTodos.filter(t => t.id !== todoId);
    setAllTodos(updated);
    localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(updated));
    localStorage.setItem(`quantum_todos_default`, JSON.stringify(updated));
    localStorage.setItem(`quantum_todos`, JSON.stringify(updated));
    if (authUserId) {
      localStorage.setItem(`quantum_todos_${authUserId}`, JSON.stringify(updated));
    }
    window.dispatchEvent(new CustomEvent('quantum_todos_updated', { detail: updated }));
    toast.success('Task removed from deck');

    if (supabase && authUserId) {
      try {
        const { data } = await supabase.from('profiles').select('settings').eq('id', authUserId).single();
        const currentSettings = data?.settings || {};
        await supabase.from('profiles').update({
          settings: { ...currentSettings, todos: updated }
        }).eq('id', authUserId);
      } catch (e) {
        console.warn('Delete todo sync error:', e);
      }
    }
  };

  // Sync timeline and todos when config is updated or user logs in
  useEffect(() => {
    const handleSync = () => {
      setTimeline(loadTodayTimeline(authUserId, uid));
      setAllTodos(getSystemTodos(authUserId, uid, state.settings?.todos));
    };

    const handleTodoUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAllTodos(e.detail);
      } else {
        setAllTodos(getSystemTodos(authUserId, uid, state.settings?.todos));
      }
    };

    window.addEventListener('quantum_config_updated', handleSync);
    window.addEventListener('quantum_todos_updated', handleTodoUpdate);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('quantum_config_updated', handleSync);
      window.removeEventListener('quantum_todos_updated', handleTodoUpdate);
      window.removeEventListener('storage', handleSync);
    };
  }, [authUserId, uid, state.settings?.todos]);

  useEffect(() => {
    if (authUserId) {
      setTimeline(loadTodayTimeline(authUserId, uid));
      setAllTodos(getSystemTodos(authUserId, uid, state.settings?.todos));
    }
  }, [authUserId, uid, state.settings?.todos]);



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

  const protocolDeckStats = useMemo(() => {
    const total = todayTodos.length;
    const completed = todayTodos.filter(t => isTodoDoneToday(t, todayStr)).length;
    const pct = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, pct };
  }, [todayTodos, todayStr]);

  // Real combined daily focus (habits + scheduled execution blocks + daily protocol deck tasks)
  const todayFocus = useMemo(() => {
    const totalActions = todayHabitsStats.total + timelineStats.total + protocolDeckStats.total;
    const completedActions = todayHabitsStats.completed + timelineStats.completed + protocolDeckStats.completed;
    const pct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
    return {
      completedActions,
      totalActions,
      pct,
      habitsCompleted: todayHabitsStats.completed,
      habitsTotal: todayHabitsStats.total,
      timelineCompleted: timelineStats.completed,
      timelineTotal: timelineStats.total,
      protocolDeckCompleted: protocolDeckStats.completed,
      protocolDeckTotal: protocolDeckStats.total,
    };
  }, [todayHabitsStats, timelineStats, protocolDeckStats]);

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

  // ── Row 3: 7-Day Completion Bars & 28-Day Heatmap Data (Real App Telemetry) ─
  const weeklyCompletionBars = useMemo(() => {
    return currentWeekDays.map(day => {
      let done = 0;
      let total = 0;

      // 1. Habits
      habits.forEach(h => {
        total++;
        const val = habitLogs[`${h.id}_${day.dateStr}`] || 0;
        const req = h.habitType === 'counter' ? h.dailyGoal : 1;
        if (val >= req) done++;
      });

      // 2. Timetable blocks
      timeline.forEach(b => {
        total++;
        if (b.completedDates?.includes(day.dateStr)) done++;
      });

      // 3. Protocol deck todos
      const dayOfWeekNum = new Date(day.dateStr + 'T12:00:00').getDay();
      const todosForDay = allTodos.filter(t => {
        const rec = t.recurrence || (t.isOneOff ? 'one-off' : 'weekly');
        if (rec === 'daily' || rec === 'monthly') return true;
        if (rec === 'one-off') return t.completedDates?.includes(day.dateStr) || !t.completed;
        return t.dayOfWeek === undefined || Number(t.dayOfWeek) === dayOfWeekNum;
      });
      todosForDay.forEach(t => {
        total++;
        if (t.completedDates?.includes(day.dateStr)) done++;
      });

      // 4. Focus session execution logs from settings
      const execLogs = (state.settings?.execution_logs || []).filter((l: any) => l.date === day.dateStr && l.status === 'completed');
      done += execLogs.length;

      // 5. Database activity logs from Supabase
      const dbInfo = dbActivityMap[day.dateStr] || { count: 0, xp: 0 };

      let pct = 0;
      if (total > 0) {
        pct = Math.min(100, Math.round((done / total) * 100));
      }
      // If no tasks were scheduled or completed, but user had real DB activity (XP / questions / logins)
      if (pct === 0 && (dbInfo.count > 0 || dbInfo.xp > 0)) {
        pct = Math.min(100, Math.max(30, Math.min(100, dbInfo.count * 20, Math.round(dbInfo.xp / 5))));
      }

      return {
        short: day.short,
        dateStr: day.dateStr,
        pct,
        done,
        total,
        dbCount: dbInfo.count,
        dbXp: dbInfo.xp,
        details: `${done}/${total} protocols done${dbInfo.xp > 0 ? ` · +${dbInfo.xp} XP` : ''}`
      };
    });
  }, [currentWeekDays, habits, habitLogs, timeline, allTodos, state.settings?.execution_logs, dbActivityMap]);

  const last28Days = useMemo(() => {
    const list: { dateStr: string; pct: number; details: string }[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = addDays(today, -i);
      const dStr = toDateStr(d);
      const dayOfWeekNum = d.getDay();

      let done = 0;
      let total = 0;

      habits.forEach(h => {
        total++;
        const val = habitLogs[`${h.id}_${dStr}`] || 0;
        const req = h.habitType === 'counter' ? h.dailyGoal : 1;
        if (val >= req) done++;
      });

      timeline.forEach(b => {
        total++;
        if (b.completedDates?.includes(dStr)) done++;
      });

      const todosForDay = allTodos.filter(t => {
        const rec = t.recurrence || (t.isOneOff ? 'one-off' : 'weekly');
        if (rec === 'daily' || rec === 'monthly') return true;
        if (rec === 'one-off') return t.completedDates?.includes(dStr) || !t.completed;
        return t.dayOfWeek === undefined || Number(t.dayOfWeek) === dayOfWeekNum;
      });
      todosForDay.forEach(t => {
        total++;
        if (t.completedDates?.includes(dStr)) done++;
      });

      const execLogs = (state.settings?.execution_logs || []).filter((l: any) => l.date === dStr && l.status === 'completed');
      done += execLogs.length;

      const dbInfo = dbActivityMap[dStr] || { count: 0, xp: 0 };

      let pct = 0;
      if (total > 0) {
        pct = Math.min(100, Math.round((done / total) * 100));
      }
      if (pct === 0 && (dbInfo.count > 0 || dbInfo.xp > 0)) {
        pct = Math.min(100, Math.max(30, Math.min(100, dbInfo.count * 20, Math.round(dbInfo.xp / 5))));
      }

      list.push({
        dateStr: dStr,
        pct,
        details: `${dStr}: ${pct}% velocity (${done}/${total} tasks · ${dbInfo.count} activities · +${dbInfo.xp} XP)`
      });
    }
    return list;
  }, [habits, habitLogs, timeline, allTodos, state.settings?.execution_logs, dbActivityMap]);

  // Real actual streak count (truthful, matches Engagement Hub exactly)
  const actualStreak = engagementStats.currentLoginStreak || state.streakCount || 0;

  // Streak shields: stored in profile settings or computed from streak (max 3)
  const streakShields = state.settings?.streakShields !== undefined
    ? Math.min(3, Math.max(0, Number(state.settings.streakShields)))
    : Math.min(3, Math.floor(actualStreak / 7));

  // Filtered habits by pillar
  const displayedHabits = useMemo(() => {
    if (pillarFilter === 'All') return habits;
    return habits.filter(h => h.pillar === pillarFilter);
  }, [habits, pillarFilter]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-28 md:pb-8 scrollbar-none">
      {/* ─── TOP COMMAND BAR ─── */}
      <div className="glass-panel p-4 md:p-5 rounded-3xl border border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Operator Rank, Level & Streak Shields */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full xl:w-auto">
          <button
            type="button"
            onClick={() => {
              audio.playClick();
              if (onNavigate) onNavigate('rank');
            }}
            className="h-10 flex-1 sm:flex-initial sm:min-w-[140px] px-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider cursor-pointer hover:border-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            title="View Ascension Rank & AI Counsel"
          >
            <Trophy size={14} className="text-primary shrink-0" />
            <span className="truncate">Lv.{state.totalLevel} {state.rank}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playClick();
              if (onNavigate) onNavigate('engagement');
            }}
            className="h-10 flex-1 sm:flex-initial sm:min-w-[130px] px-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-black cursor-pointer hover:border-orange-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            title="View Streak & Activity in Engagement Hub"
          >
            <Flame size={14} className="shrink-0" />
            <span className="truncate">{actualStreak}d Streak</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playClick();
              setShieldModalOpen(true);
            }}
            className={`h-10 flex-1 sm:flex-initial sm:min-w-[150px] px-3.5 rounded-xl border text-xs font-black cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap ${
              streakShields > 0
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-white/5 border-white/10 text-textMuted hover:text-white hover:bg-white/10'
            }`}
            title="Open Streak Shield Defense Matrix"
          >
            <Shield size={14} className={`shrink-0 ${streakShields > 0 ? 'text-cyan-400' : 'text-textMuted'}`} />
            <span className="truncate">{streakShields}/3 Shields</span>
          </button>
        </div>

        {/* Right: AI Assistant & Energy Mode Switcher */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full xl:w-auto">
          <button
            type="button"
            onClick={() => {
              audio.playClick();
              window.dispatchEvent(new CustomEvent('quantum_open_ai_command'));
            }}
            className="h-10 flex-1 sm:flex-initial sm:min-w-[140px] px-4 rounded-xl bg-gradient-to-r from-primary/20 via-blue-600/20 to-purple-600/20 hover:from-primary/30 hover:to-purple-600/30 text-white border border-primary/35 text-xs font-black uppercase tracking-wider cursor-pointer hover:border-primary hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] flex items-center justify-center gap-2 group whitespace-nowrap"
            title="Tell AI to automate your schedule, todos, habits, or themes (Ctrl + K)"
          >
            <Sparkles size={14} className="text-amber-300 shrink-0 animate-spin-slow group-hover:rotate-12 transition-transform" />
            <span>AI Co-Pilot</span>
            <span className="hidden sm:inline text-[9px] font-mono opacity-60 bg-white/10 px-1 py-0.5 rounded">Ctrl+K</span>
          </button>

          <div className="h-10 flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 flex-1 sm:flex-initial">
            {([
              { id: 'peak', label: '🔥 Peak (1.2x)', shortLabel: '🔥 Peak', active: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
              { id: 'normal', label: '⚡ Normal', shortLabel: '⚡ Normal', active: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
              { id: 'survival', label: '🛡️ Busy / Survival', shortLabel: '🛡️ Busy', active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
            ] as const).map(m => (
              <button
                key={m.id}
                onClick={() => {
                  audio.playClick();
                  setEnergyMode(m.id);
                }}
                className={`h-full flex-1 sm:flex-initial px-3 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all flex items-center justify-center whitespace-nowrap ${
                  energyMode === m.id ? m.active : 'border-transparent text-textMuted hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── DAILY THOUGHT PROTOCOL (BELOW BTNS & ABOVE THE ENGINE) ─── */}
      <div 
        onClick={() => {
          audio.playClick();
          if (onNavigate) onNavigate('thoughts');
        }}
        className="glass-panel p-4 md:p-5 rounded-3xl border border-white/10 hover:border-primary/40 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-primary/30 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Lightbulb className="text-primary" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/15 px-2 py-0.5 rounded-md border border-primary/30">
                  Daily Thought Protocol
                </span>
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                  • {todayThought.category}
                </span>
                {todayThought.author && (
                  <span className="text-[10px] text-textMuted/70 italic">
                    — {todayThought.author}
                  </span>
                )}
              </div>
              <p className="text-sm md:text-base font-semibold text-textMain/95 italic leading-snug group-hover:text-white transition-colors">
                "{todayThought.quote}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audio.playSuccess();
                navigator.clipboard.writeText(`"${todayThought.quote}" - ${todayThought.author || 'Quantum Axiom'}`);
                toast.success('Thought copied to clipboard! 📋');
              }}
              title="Copy quote"
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-textMuted hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
            >
              <Copy size={13} />
              <span className="hidden sm:inline">Copy</span>
            </button>
            <span className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
              <span>All Thoughts</span>
              <span className="text-xs">→</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── ROW 1: 3 RADIAL RINGS + THE ENGINE (ROUTINE FOCUS TIMER) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* The Engine (Real-Time Routine Timer & Execution Engine) — shown first on mobile */}
        <div className="order-first lg:order-last lg:col-span-7 glass-panel rounded-3xl border border-white/10 overflow-hidden min-h-[380px] flex flex-col">
          <EngineCard />
        </div>

        {/* 3 Radial Progress Rings */}
        <div className="order-last lg:order-first lg:col-span-5 glass-panel p-5 rounded-3xl border border-white/10 flex flex-col justify-between gap-4">
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

      {/* ─── ROW 3: LIVE DAY TIMELINE BLOCKS & TODAY'S PROTOCOL DECK ─── */}
      <div className="glass-panel bg-[#11131e] p-5 sm:p-6 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Calendar size={16} className="text-primary" /> Daily Execution Timeline
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Scheduled protocol blocks and today's active tasks from System Configuration
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                audio.playClick();
                if (onNavigate) onNavigate('strategic_control');
              }}
              className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-blue-300 transition-colors bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              title="Configure Timetable & Protocols in System Config"
            >
              Configure System <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* 1. Scheduled Time Blocks from System Config Timetable */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block opacity-70">
              Scheduled Time Blocks ({timeline.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  window.dispatchEvent(new CustomEvent('quantum_open_ai_command'));
                }}
                className="text-[9px] font-black uppercase text-primary hover:text-blue-300 bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                title="Tell AI to auto-schedule or reschedule execution blocks"
              >
                <Sparkles size={11} className="text-amber-300" />
                <span>AI Re-Schedule</span>
              </button>
              <span className="text-[9px] font-mono text-zinc-500">
                {timeline.filter(b => b.completedDates.includes(todayStr)).length}/{timeline.length} done
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {timeline.map(block => {
              const done = block.completedDates.includes(todayStr);
              const pCfg = PILLAR_CONFIG[block.pillar] || PILLAR_CONFIG.Study;
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

        {/* 2. Today's Tasks from Daily Protocol Deck */}
        <div className="pt-5 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 opacity-80">
                <Clock size={13} className="text-primary" /> Today's Protocol Deck Tasks ({todayTodos.length})
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][todayDay]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  window.dispatchEvent(new CustomEvent('quantum_open_ai_command'));
                }}
                className="text-[9px] font-black uppercase text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                title="Tell AI to schedule a new task to your protocol deck"
              >
                <Sparkles size={11} />
                <span>+ AI Add Task</span>
              </button>
              <button
                onClick={() => {
                  audio.playClick();
                  if (onNavigate) onNavigate('strategic_control');
                }}
                className="text-[9px] font-bold text-primary hover:underline flex items-center gap-1"
                title="Manage and edit all days' tasks in System Configuration"
              >
                Manage in Config →
              </button>
            </div>
          </div>

          {todayTodos.length > 0 ? (
            <div className="space-y-2.5">
              {todayTodos.map(todo => {
                const rec = todo.recurrence || (todo.isOneOff ? 'one-off' : 'weekly');
                const done = isTodoDoneToday(todo, todayStr);
                const pCfg = PILLAR_CONFIG[todo.pillar] || PILLAR_CONFIG.Study;
                const xpAmt = todo.task_target === 'High' ? 100 : todo.task_target === 'Low' ? 40 : 60;
                return (
                  <div
                    key={todo.id}
                    onClick={() => toggleProtocolTodo(todo.id)}
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
                          {todo.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 flex items-center gap-2">
                          <span className={pCfg.text}>{todo.pillar}</span>
                          <span>•</span>
                          <span>{todo.time ? `⏰ ${todo.time}` : '📅 Day Task'}</span>
                          <span>•</span>
                          <span className="capitalize">{rec}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-300">
                        +{xpAmt} XP
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.playClick();
                          if (onNavigate) onNavigate('strategic_control');
                        }}
                        className="p-1 text-zinc-500 hover:text-primary transition-colors"
                        title="Edit or reassign task in System Config"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProtocolTodo(todo.id);
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Remove from deck"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 px-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] space-y-2">
              <p className="text-xs text-zinc-300 font-semibold">
                No tasks scheduled for today ({['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][todayDay]}).
              </p>
              {allTodos.length > 0 && (
                <p className="text-[10px] text-zinc-400">
                  You have {allTodos.length} protocol {allTodos.length === 1 ? 'task' : 'tasks'} configured across the week.
                </p>
              )}
              <button
                onClick={() => {
                  audio.playClick();
                  if (onNavigate) onNavigate('strategic_control');
                }}
                className="mt-2 text-xs font-black uppercase tracking-wider text-primary hover:text-blue-300 inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-xl transition-all hover:scale-105"
              >
                <Pencil size={12} />
                <span>Manage & Edit in System Config →</span>
              </button>
            </div>
          )}
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
                  title={`${bar.short} (${bar.dateStr}): ${bar.pct}% velocity (${bar.details}). Click to view Engagement Hub.`}
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
                    title={`${item.details}. Click to view Engagement Hub.`}
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
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-black uppercase tracking-wider">
                  Health Lv. {state.level?.Health || 1}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black uppercase tracking-wider">
                  {healthReadinessScore}% Ready
                </span>
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
              <div className="flex items-center justify-between text-[9px] text-textMuted pt-0.5">
                <span>💧 {bio.waterLiters.toFixed(1)}L water</span>
                <span>🌙 {bio.sleepHours.toFixed(1)}h sleep</span>
                <span>❤️ {completedHealthHabits.length}/{healthHabits.length} habits</span>
                {todayHealthFocusMins > 0 && <span>⚡ {todayHealthFocusMins}m focus</span>}
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
                <div className="text-base font-black text-white">{bio.waterLiters.toFixed(1)} / 3.5L</div>
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => handleUpdateBio('waterLiters', 0.25)}
                    className="flex-1 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[9px] font-black text-cyan-300 transition-colors"
                  >
                    +0.25
                  </button>
                  <button
                    onClick={() => handleUpdateBio('waterLiters', 0.5)}
                    className="flex-1 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[9px] font-black text-cyan-300 transition-colors"
                  >
                    +0.5
                  </button>
                  <button
                    onClick={() => handleUpdateBio('waterLiters', 1.0)}
                    className="flex-1 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-[9px] font-black text-cyan-200 transition-colors"
                  >
                    +1.0
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

            {/* Live Today's Health Habits Protocols */}
            {healthHabits.length > 0 && (
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse size={12} className="text-emerald-400" />
                    <span>Active Bio Protocols ({completedHealthHabits.length}/{healthHabits.length})</span>
                  </span>
                  <span className="text-emerald-400 font-black">
                    {Math.round((completedHealthHabits.length / Math.max(1, healthHabits.length)) * 100)}% Done
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {healthHabits.map(h => {
                    const isDone = (habitLogs[`${h.id}_${todayStr}`] || 0) >= getGoalForHabit(h);
                    return (
                      <button
                        key={h.id}
                        onClick={() => toggleHabitDay(h, todayStr)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 shrink-0 hover:scale-[1.02] active:scale-95 ${
                          isDone
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-white/5 border-white/5 text-textMuted hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color || '#10b981' }} />
                        <span className="truncate max-w-[100px]">{h.name}</span>
                        {isDone && <Check size={10} className="text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* ─── ROW 5: ACTIVE BIO-OPTIMIZATION PROTOCOLS (HEALTH TASKS) ─── */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <HeartPulse size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-textMain">
                  Active Bio-Optimization Protocols
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black">
                  {protocols.filter(p => p.completed).length}/{protocols.length} Done
                </span>
              </div>
              <p className="text-[11px] text-textMuted">
                Daily physical conditioning, recovery, and cognitive vitality tasks synced with Health Lab
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddProtocol}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <Plus size={14} />
              <span>New Protocol</span>
            </button>
            <button
              onClick={() => {
                audio.playClick();
                if (onNavigate) onNavigate('lab');
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-textMuted hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <span>Full Lab →</span>
            </button>
          </div>
        </div>

        {/* Protocols Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {protocols.map(p => {
            const isCompleted = p.completed;
            const diffColor =
              p.difficulty === 'Hard' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
              p.difficulty === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
              'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

            return (
              <div
                key={p.id}
                onClick={() => handleToggleProtocol(p.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group select-none ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'border-white/20 bg-white/5 text-transparent group-hover:border-emerald-400/50'
                    }`}
                  >
                    <Check size={14} className={isCompleted ? 'text-black stroke-[3]' : 'opacity-0'} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate transition-colors ${
                      isCompleted ? 'line-through text-textMuted' : 'text-textMain group-hover:text-emerald-300'
                    }`}>
                      {p.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-textMuted mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} />
                        {p.time}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                        <Sparkles size={10} />
                        +{p.xp} XP
                      </span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${diffColor}`}>
                        {p.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleOpenEditProtocol(p, e)}
                    title="Edit Protocol"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProtocol(p.id, e)}
                    title="Delete Protocol"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-textMuted hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
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

      {/* ─── MODAL: ADD / EDIT HEALTH PROTOCOL ─── */}
      {protocolModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11131e] border border-white/20 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <HeartPulse size={16} className="text-emerald-400" />
                <span>{editingProtocol ? 'Edit Health Protocol' : 'New Health Protocol'}</span>
              </h3>
              <button onClick={() => setProtocolModalOpen(false)} className="text-textMuted hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                  Protocol Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zone 2 Cardio 40m, Cold Shower 3m..."
                  value={protocolForm.title}
                  onChange={e => setProtocolForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                    Target Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15 min, 30 min..."
                    value={protocolForm.time}
                    onChange={e => setProtocolForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                    Health XP Reward
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={150}
                    value={protocolForm.xp}
                    onChange={e => setProtocolForm(prev => ({ ...prev, xp: parseInt(e.target.value, 10) || 30 }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1.5">
                  Difficulty Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setProtocolForm(prev => ({ ...prev, difficulty: d }))}
                      className={`py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        protocolForm.difficulty === d
                          ? d === 'Hard' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                            d === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                            'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-white/5 text-textMuted border-white/5 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setProtocolModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProtocol}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  {editingProtocol ? 'Update Protocol' : 'Save Protocol'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: STREAK SHIELD DEFENSE MATRIX ─── */}
      {shieldModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11131e] border border-cyan-500/30 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Streak Shield Defense Matrix
                  </h3>
                  <p className="text-[10px] text-textMuted uppercase font-semibold">
                    Automated Inactivity Protection
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShieldModalOpen(false)}
                className="text-textMuted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* 3 Shield Chamber Slots */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((slot) => {
                const isArmed = slot <= streakShields;
                return (
                  <div
                    key={slot}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isArmed
                        ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                        : 'bg-white/[0.02] border-dashed border-white/10 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isArmed
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/40'
                          : 'bg-white/5 text-textMuted border border-white/10'
                      }`}
                    >
                      <Shield size={20} className={isArmed ? 'fill-cyan-400/30' : ''} />
                    </div>
                    <div>
                      <p className={`text-[11px] font-black uppercase ${isArmed ? 'text-cyan-300' : 'text-textMuted'}`}>
                        Slot {slot}
                      </p>
                      <p className="text-[9px] text-textMuted">
                        {isArmed ? 'Armed & Ready' : 'Depleted'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Defense Status & Rules */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-textMuted uppercase tracking-wider">Defense Status:</span>
                <span className={streakShields > 0 ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                  {streakShields > 0 ? '● Active Failsafe Armed' : '○ Defense Disarmed (No Shields)'}
                </span>
              </div>
              <p className="text-[11px] text-textMuted leading-relaxed">
                If you miss a day of protocol execution, an armed Streak Shield automatically absorbs the gap so your active {actualStreak}-day streak will <strong className="text-white">not reset to 0</strong>.
              </p>
              <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-textMuted">
                <span>Next Free Shield:</span>
                <span className="text-cyan-400 font-bold">
                  {7 - (actualStreak % 7)} days of consistency remaining
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {streakShields < 3 ? (
                <button
                  onClick={async () => {
                    audio.playClick();
                    await refuelStreakShield(100);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={14} />
                  <span>Refuel Streak Shield (Cost: 100 XP)</span>
                </button>
              ) : (
                <div className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center text-xs font-bold uppercase">
                  ✓ Shield Matrix Full (3/3 Armed)
                </div>
              )}

              <button
                onClick={() => {
                  audio.playClick();
                  setShieldModalOpen(false);
                  if (onNavigate) onNavigate('engagement');
                }}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                View Streak & Velocity in Engagement Hub →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandDeck;
