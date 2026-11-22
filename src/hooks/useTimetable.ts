import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskCategory = 'gym' | 'study' | 'work' | 'mind' | 'other';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon … 6=Sat

export interface TimetableTask {
  id: string;
  user_id: string;
  name: string;
  pillar: 'Study' | 'Health' | 'Finance' | 'Mind';
  category: TaskCategory;
  duration_minutes: number;
  day_of_week: DayOfWeek;
  is_weekend: boolean;   // true for Sat/Sun — optional bonus days
  order_index: number;
  task_target?: string; // High, Medium, Low
  start_time?: string;  // HH:MM
  created_at: string;
}

export interface DailyCompletion {
  id: string;
  user_id: string;
  date: string;           // YYYY-MM-DD
  task_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface DailyStats {
  date: string;
  total: number;
  done: number;
  pct: number;
  tier: 'none' | 'partial' | 'disciplined' | 'perfect';
  is_weekend: boolean;
  bonus_xp_awarded: boolean;
}

export interface TimetableBadge {
  badge_type: string;
  count: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PILLAR_FOR_CATEGORY: Record<TaskCategory, 'Study' | 'Health' | 'Finance' | 'Mind'> = {
  gym:   'Health',
  study: 'Study',
  work:  'Finance',
  mind:  'Mind',
  other: 'Mind',
};

/** Weekday multipliers for bonus XP */
export const TIER_BONUS: Record<string, { weekday: number; weekend: number }> = {
  partial:     { weekday: 0.25, weekend: 0.5  },
  disciplined: { weekday: 0.50, weekend: 1.0  },
  perfect:     { weekday: 1.00, weekend: 2.0  },
};

/** Badge thresholds by tier */
export const BADGE_THRESHOLDS = {
  bronze:   5,
  silver:   15,
  gold:     30,
  platinum: 100,
};

export const SPECIAL_CATEGORY_THRESHOLDS = {
  bronze:   20,
  silver:   50,
  gold:     100,
  platinum: 200,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function getTier(pct: number): DailyStats['tier'] {
  if (pct >= 100) return 'perfect';
  if (pct >= 80)  return 'disciplined';
  if (pct >= 50)  return 'partial';
  return 'none';
}

export function getBadgeTier(count: number, thresholds = BADGE_THRESHOLDS): TimetableBadge['tier'] | null {
  if (count >= thresholds.platinum) return 'platinum';
  if (count >= thresholds.gold)     return 'gold';
  if (count >= thresholds.silver)   return 'silver';
  if (count >= thresholds.bronze)   return 'bronze';
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTimetable(userId: string | null, settingsTimetable?: any[]) {
  const [tasks, setTasks]                 = useState<TimetableTask[]>([]);
  const [completions, setCompletions]     = useState<DailyCompletion[]>([]);
  const [badges, setBadges]               = useState<TimetableBadge[]>([]);
  const [loading, setLoading]             = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDow = new Date().getDay() as DayOfWeek;
  const isWeekend = todayDow === 0 || todayDow === 6;

  // ── Load tasks ─────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    let loadedData: TimetableTask[] = [];

    // 1. Settings timetable (highest authority)
    if (Array.isArray(settingsTimetable) && settingsTimetable.length > 0) {
      loadedData = settingsTimetable.map((t, idx) => ({
        id: String(t.id || `st-${idx}`),
        user_id: userId || 'default',
        name: t.title || t.name || `Task ${idx + 1}`,
        pillar: t.pillar || 'Mind',
        category: (t.category as TaskCategory) || 'other',
        duration_minutes: Number(t.duration_minutes) || 45,
        day_of_week: (t.dayOfWeek !== undefined ? t.dayOfWeek : (t.day_of_week !== undefined ? t.day_of_week : todayDow)) as DayOfWeek,
        is_weekend: t.is_weekend ?? false,
        order_index: idx,
        task_target: t.task_target || 'Medium',
        start_time: t.start || t.start_time || '09:00',
        created_at: new Date().toISOString()
      }));
    }

    // 2. Supabase if valid UUID
    let activeUid: string | null = isValidUuid(userId) ? userId : null;
    if (!activeUid && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) activeUid = session.user.id;
      } catch {}
    }

    if (loadedData.length === 0 && supabase && activeUid) {
      try {
        const { data, error } = await supabase
          .from('timetable_tasks')
          .select('*')
          .eq('user_id', activeUid)
          .order('day_of_week')
          .order('order_index');
        if (!error && data && data.length > 0) {
          loadedData = data;
        }
      } catch (e) {
        console.warn("Supabase timetable fetch warning:", e);
      }
    }

    // 3. LocalStorage keys fallback
    if (loadedData.length === 0) {
      const keysToTry = [
        userId ? `quantum_timetable_${userId}` : null,
        'quantum_timetable_default',
        'quantum_timetable'
      ].filter(Boolean) as string[];

      for (const k of keysToTry) {
        const cached = localStorage.getItem(k);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedData = parsed.map((t, idx) => ({
                id: String(t.id || `loc-${idx}`),
                user_id: userId || 'default',
                name: t.title || t.name || `Task ${idx + 1}`,
                pillar: t.pillar || 'Mind',
                category: (t.category as TaskCategory) || 'other',
                duration_minutes: Number(t.duration_minutes) || 45,
                day_of_week: (t.dayOfWeek !== undefined ? t.dayOfWeek : (t.day_of_week !== undefined ? t.day_of_week : todayDow)) as DayOfWeek,
                is_weekend: t.is_weekend ?? false,
                order_index: idx,
                task_target: t.task_target || 'Medium',
                start_time: t.start || t.start_time || '09:00',
                created_at: new Date().toISOString()
              }));
              break;
            }
          } catch {}
        }
      }
    }

    setTasks(loadedData);
  }, [userId, settingsTimetable, todayDow]);

  // ── Load today's completions ───────────────────────────────────────────────
  const loadTodayCompletions = useCallback(async () => {
    let localComps: DailyCompletion[] = [];
    const localKey = `quantum_daily_completions_${userId || 'default'}_${today}`;
    const fallbackKey = `quantum_daily_completions_${today}`;

    for (const k of [localKey, fallbackKey]) {
      const cached = localStorage.getItem(k);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localComps = parsed;
            break;
          }
        } catch {}
      }
    }

    if (localComps.length > 0) {
      setCompletions(localComps);
    }

    // Supabase background sync
    try {
      let activeUid: string | null = isValidUuid(userId) ? userId : null;
      if (!activeUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) activeUid = session.user.id;
      }

      if (supabase && activeUid) {
        const { data, error } = await supabase
          .from('daily_completions')
          .select('*')
          .eq('user_id', activeUid)
          .eq('date', today);
        if (!error && data && data.length > 0) {
          const merged = [...data];
          localComps.forEach(lc => {
            if (!merged.some(m => String(m.task_id) === String(lc.task_id))) {
              merged.push(lc);
            }
          });
          setCompletions(merged);
        }
      }
    } catch (e) {
      console.warn("Supabase completions fetch warning:", e);
    }
  }, [userId, today]);

  // ── Load badges ────────────────────────────────────────────────────────────
  const loadBadges = useCallback(async () => {
    const localKey = `quantum_badges_${userId || 'default'}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setBadges(parsed);
      } catch {}
    }

    try {
      let activeUid: string | null = isValidUuid(userId) ? userId : null;
      if (!activeUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) activeUid = session.user.id;
      }

      if (supabase && activeUid) {
        const { data, error } = await supabase
          .from('timetable_badges')
          .select('*')
          .eq('user_id', activeUid);
        if (!error && data) setBadges(data);
      }
    } catch (e) {
      console.warn("Supabase badges fetch warning:", e);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadTasks(), loadTodayCompletions(), loadBadges()])
      .finally(() => setLoading(false));

    const handleUpdate = () => {
      loadTasks();
      loadTodayCompletions();
    };
    window.addEventListener('quantum_timetable_updated', handleUpdate);
    window.addEventListener('quantum_config_updated', handleUpdate);
    return () => {
      window.removeEventListener('quantum_timetable_updated', handleUpdate);
      window.removeEventListener('quantum_config_updated', handleUpdate);
    };
  }, [loadTasks, loadTodayCompletions, loadBadges]);

  // ── Today's tasks ──────────────────────────────────────────────────────────
  const todayTasks = tasks.filter(t => t.day_of_week === todayDow);

  // ── Toggle task completion ─────────────────────────────────────────────────
  const toggleCompletion = useCallback(async (
    taskId: string,
    claimXpFn?: (taskId: string, pillar: 'Study' | 'Health' | 'Finance' | 'Mind', label: string, baseAmount: number) => Promise<any>
  ) => {
    const stringTaskId = String(taskId);
    const existing = completions.find(c => String(c.task_id) === stringTaskId && c.date === today);
    const currentlyCompleted = existing ? existing.completed : false;
    const newCompleted = !currentlyCompleted;

    const updatedItem: DailyCompletion = existing
      ? { ...existing, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
      : {
          id: `local-comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          user_id: userId || 'default',
          date: today,
          task_id: stringTaskId,
          completed: true,
          completed_at: new Date().toISOString()
        };

    // 1. Optimistically update React State
    setCompletions(prev => {
      const idx = prev.findIndex(c => String(c.task_id) === stringTaskId && c.date === today);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedItem;
        return copy;
      }
      return [...prev, updatedItem];
    });

    // 2. Persist to LocalStorage immediately
    try {
      const localKey = `quantum_daily_completions_${userId || 'default'}_${today}`;
      const existingSaved = localStorage.getItem(localKey);
      let parsed: DailyCompletion[] = [];
      if (existingSaved) {
        try { parsed = JSON.parse(existingSaved); } catch {}
      }
      const idx = parsed.findIndex(c => String(c.task_id) === stringTaskId);
      if (idx >= 0) {
        parsed[idx] = updatedItem;
      } else {
        parsed.push(updatedItem);
      }
      localStorage.setItem(localKey, JSON.stringify(parsed));
      localStorage.setItem(`quantum_daily_completions_${today}`, JSON.stringify(parsed));
    } catch (e) {
      console.warn("Failed to write completions to localStorage:", e);
    }

    // 3. Award XP if completing
    if (!currentlyCompleted && claimXpFn) {
      try {
        const task = tasks.find(t => String(t.id) === stringTaskId);
        const getBaseXp = (target?: string) => {
          if (target === 'High') return 100;
          if (target === 'Low') return 40;
          return 60;
        };
        const base = getBaseXp(task?.task_target);
        const result = await claimXpFn(
          stringTaskId,
          task?.pillar || 'Mind',
          `Routine Task: ${task?.name || 'Protocol'}`,
          base
        );

        if (result?.awarded) {
          const xpEarned = result.xpEarned;
          const breakdown = result.breakdown;
          const parts = [`Base: ${base} XP`];
          if (breakdown?.streakBonus > 0) parts.push(`Streak: +${breakdown.streakBonus} XP`);
          if (breakdown?.archetypeBonus > 0) parts.push(`Archetype: +${breakdown.archetypeBonus} XP`);

          import('react-hot-toast').then(({ default: toast }) => {
            toast.success(`🎉 Routine Mastered! +${xpEarned} XP Total (${parts.join(' | ')})`);
          });
        }
      } catch (xpErr) {
        console.warn("Claim XP non-fatal warning:", xpErr);
      }
    }

    // 4. Safely sync to Supabase in background without throwing errors
    try {
      let activeUid: string | null = isValidUuid(userId) ? userId : null;
      if (!activeUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) {
          activeUid = session.user.id;
        }
      }

      if (supabase && activeUid) {
        if (existing && existing.id && !existing.id.startsWith('local-')) {
          await supabase
            .from('daily_completions')
            .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
            .eq('id', existing.id)
            .eq('user_id', activeUid);
        } else {
          const { data: inserted } = await supabase
            .from('daily_completions')
            .insert({ user_id: activeUid, date: today, task_id: stringTaskId, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
            .select()
            .maybeSingle();
          if (inserted) {
            setCompletions(prev => prev.map(c => String(c.task_id) === stringTaskId ? inserted : c));
          }
        }
      }
    } catch (supaErr) {
      console.warn("Supabase completion sync warning (non-fatal):", supaErr);
    }

    window.dispatchEvent(new CustomEvent('quantum_timetable_updated'));
  }, [completions, today, userId, tasks]);

  // ── Today's stats ──────────────────────────────────────────────────────────
  const todayStats: DailyStats = (() => {
    const total = todayTasks.length;
    const done  = todayTasks.filter(t =>
      completions.find(c => String(c.task_id) === String(t.id) && c.date === today && c.completed)
    ).length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    return { date: today, total, done, pct, tier: getTier(pct), is_weekend: isWeekend, bonus_xp_awarded: false };
  })();

  // ── CRUD: Add task ─────────────────────────────────────────────────────────
  const addTask = useCallback(async (
    task: Omit<TimetableTask, 'id' | 'user_id' | 'created_at'>
  ) => {
    const newTask: TimetableTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId || 'default',
      created_at: new Date().toISOString()
    };

    setTasks(prev => {
      const updated = [...prev, newTask];
      try {
        localStorage.setItem(`quantum_timetable_${userId || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`quantum_timetable_default`, JSON.stringify(updated));
        localStorage.setItem(`quantum_timetable`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      let activeUid: string | null = isValidUuid(userId) ? userId : null;
      if (!activeUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) activeUid = session.user.id;
      }
      if (supabase && activeUid) {
        const { data } = await supabase
          .from('timetable_tasks')
          .insert({ ...task, user_id: activeUid })
          .select()
          .maybeSingle();
        if (data) {
          setTasks(prev => prev.map(t => t.id === newTask.id ? data : t));
        }
      }
    } catch (e) {
      console.warn("Supabase add task warning:", e);
    }

    window.dispatchEvent(new CustomEvent('quantum_timetable_updated'));
    return newTask;
  }, [userId]);

  // ── CRUD: Update task ──────────────────────────────────────────────────────
  const updateTask = useCallback(async (id: string, updates: Partial<TimetableTask>) => {
    setTasks(prev => {
      const updated = prev.map(t => String(t.id) === String(id) ? { ...t, ...updates } : t);
      try {
        localStorage.setItem(`quantum_timetable_${userId || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`quantum_timetable_default`, JSON.stringify(updated));
        localStorage.setItem(`quantum_timetable`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      let activeUid: string | null = isValidUuid(userId) ? userId : null;
      if (!activeUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) activeUid = session.user.id;
      }
      if (supabase && activeUid && isValidUuid(id)) {
        await supabase
          .from('timetable_tasks')
          .update(updates)
          .eq('id', id)
          .eq('user_id', activeUid);
      }
    } catch (e) {
      console.warn("Supabase update task warning:", e);
    }

    window.dispatchEvent(new CustomEvent('quantum_timetable_updated'));
  }, [userId]);

  // ── CRUD: Delete task ──────────────────────────────────────────────────────
  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => {
      const updated = prev.filter(t => String(t.id) !== String(id));
      try {
        localStorage.setItem(`quantum_timetable_${userId || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`quantum_timetable_default`, JSON.stringify(updated));
        localStorage.setItem(`quantum_timetable`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      let activeUid: string | null = isValidUuid(userId) ? userId : null;
      if (!activeUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) activeUid = session.user.id;
      }
      if (supabase && activeUid && isValidUuid(id)) {
        await supabase.from('timetable_tasks').delete().eq('id', id).eq('user_id', activeUid);
      }
    } catch (e) {
      console.warn("Supabase delete task warning:", e);
    }

    window.dispatchEvent(new CustomEvent('quantum_timetable_updated'));
  }, [userId]);

  // ── Copy day template ──────────────────────────────────────────────────────
  const copyDayToDay = useCallback(async (fromDay: DayOfWeek, toDay: DayOfWeek) => {
    const sourceTasks = tasks.filter(t => t.day_of_week === fromDay);
    if (!sourceTasks.length) return;
    const isWknd = toDay === 0 || toDay === 6;

    const newTasks: TimetableTask[] = sourceTasks.map(({ id: _id, created_at: _ca, user_id: _uid, ...rest }) => ({
      ...rest,
      id: `task-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      day_of_week: toDay,
      is_weekend: isWknd,
      user_id: userId || 'default',
      created_at: new Date().toISOString()
    }));

    setTasks(prev => {
      const updated = [...prev, ...newTasks];
      try {
        localStorage.setItem(`quantum_timetable_${userId || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`quantum_timetable_default`, JSON.stringify(updated));
        localStorage.setItem(`quantum_timetable`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      let activeUid: string | null = isValidUuid(userId) ? userId : null;
      if (!activeUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) activeUid = session.user.id;
      }
      if (supabase && activeUid) {
        const dbPayload = newTasks.map(({ id: _id, ...r }) => ({ ...r, user_id: activeUid }));
        await supabase.from('timetable_tasks').insert(dbPayload);
      }
    } catch (e) {
      console.warn("Supabase copy day warning:", e);
    }

    window.dispatchEvent(new CustomEvent('quantum_timetable_updated'));
  }, [tasks, userId]);

  // ── Award bonus XP & badges for the day ───────────────────────────────────
  const claimDayBonus = useCallback(async (
    addXpFn: (pillar: 'Study' | 'Health' | 'Finance' | 'Mind', actionType: string, baseAmount: number) => Promise<number>
  ) => {
    const { tier, total } = todayStats;
    if (tier === 'none' || total === 0) return;

    const localClaimKey = `quantum_daily_bonus_${userId || 'default'}_${today}`;
    if (localStorage.getItem(localClaimKey)) {
      return; // Already claimed today
    }

    const multiplier = TIER_BONUS[tier][isWeekend ? 'weekend' : 'weekday'];

    const completedTasks = todayTasks.filter(t =>
      completions.find(c => String(c.task_id) === String(t.id) && c.completed)
    );
    const pillarMap: Record<string, number> = {};
    completedTasks.forEach(t => {
      const pillar = t.pillar;
      let xpForTask = 30;
      if (t.task_target === 'High') xpForTask = 100;
      else if (t.task_target === 'Medium') xpForTask = 60;
      else if (t.task_target === 'Low') xpForTask = 40;

      pillarMap[pillar] = (pillarMap[pillar] || 0) + xpForTask;
    });

    const bonusPromises = Object.entries(pillarMap).map(([pillar, xpAmount]) => {
      const bonus = Math.round(xpAmount * multiplier);
      return addXpFn(pillar as any, `timetable_${tier}`, bonus);
    });
    await Promise.all(bonusPromises);

    try {
      localStorage.setItem(localClaimKey, 'true');
    } catch {}

    try {
      let activeUid: string | null = isValidUuid(userId) ? userId : null;
      if (!activeUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isValidUuid(session.user.id)) activeUid = session.user.id;
      }
      if (supabase && activeUid) {
        await supabase.from('daily_bonus_log').insert({ user_id: activeUid, date: today, tier, bonus_multiplier: multiplier });
      }
    } catch (e) {
      console.warn("Supabase bonus log warning:", e);
    }
  }, [userId, today, todayStats, todayTasks, completions, isWeekend]);

  return {
    tasks, completions, badges, loading, todayStats, todayTasks,
    isWeekend, addTask, updateTask, deleteTask, copyDayToDay, toggleCompletion, claimDayBonus
  };
}
