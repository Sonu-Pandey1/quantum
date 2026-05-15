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

// ─── Helper ──────────────────────────────────────────────────────────────────

function getTier(pct: number): DailyStats['tier'] {
  if (pct >= 100) return 'perfect';
  if (pct >= 80)  return 'disciplined';
  if (pct >= 50)  return 'partial';
  return 'none';
}

function getBadgeTier(count: number, thresholds = BADGE_THRESHOLDS): TimetableBadge['tier'] | null {
  if (count >= thresholds.platinum) return 'platinum';
  if (count >= thresholds.gold)     return 'gold';
  if (count >= thresholds.silver)   return 'silver';
  if (count >= thresholds.bronze)   return 'bronze';
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTimetable(userId: string | null) {
  const [tasks, setTasks]         = useState<TimetableTask[]>([]);
  const [completions, setCompletions] = useState<DailyCompletion[]>([]);
  const [badges, setBadges]       = useState<TimetableBadge[]>([]);
  const [loading, setLoading]     = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDow = new Date().getDay() as DayOfWeek;
  const isWeekend = todayDow === 0 || todayDow === 6;

  // ── Load tasks ─────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from('timetable_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week')
      .order('order_index');
    if (!error && data) setTasks(data);
  }, [userId]);

  // ── Load today's completions ───────────────────────────────────────────────
  const loadTodayCompletions = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from('daily_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);
    if (!error && data) setCompletions(data);
  }, [userId, today]);

  // ── Load badges ────────────────────────────────────────────────────────────
  const loadBadges = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from('timetable_badges')
      .select('*')
      .eq('user_id', userId);
    if (!error && data) setBadges(data);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([loadTasks(), loadTodayCompletions(), loadBadges()])
      .finally(() => setLoading(false));
  }, [userId, loadTasks, loadTodayCompletions, loadBadges]);

  // ── Today's tasks ──────────────────────────────────────────────────────────
  const todayTasks = tasks.filter(t => t.day_of_week === todayDow);

  // ── Toggle task completion ─────────────────────────────────────────────────
  const toggleCompletion = useCallback(async (taskId: string) => {
    if (!supabase || !userId) return;

    const existing = completions.find(c => c.task_id === taskId && c.date === today);

    if (existing) {
      // Toggle off
      const newCompleted = !existing.completed;
      await supabase
        .from('daily_completions')
        .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
        .eq('id', existing.id);
      setCompletions(prev => prev.map(c =>
        c.id === existing.id ? { ...c, completed: newCompleted } : c
      ));
    } else {
      // Insert new
      const { data } = await supabase
        .from('daily_completions')
        .insert({ user_id: userId, date: today, task_id: taskId, completed: true, completed_at: new Date().toISOString() })
        .select()
        .single();
      if (data) setCompletions(prev => [...prev, data]);
    }
  }, [completions, today, userId]);

  // ── Today's stats ──────────────────────────────────────────────────────────
  const todayStats: DailyStats = (() => {
    const total = todayTasks.length;
    const done  = todayTasks.filter(t =>
      completions.find(c => c.task_id === t.id && c.date === today && c.completed)
    ).length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    return { date: today, total, done, pct, tier: getTier(pct), is_weekend: isWeekend, bonus_xp_awarded: false };
  })();

  // ── CRUD: Add task ─────────────────────────────────────────────────────────
  const addTask = useCallback(async (
    task: Omit<TimetableTask, 'id' | 'user_id' | 'created_at'>
  ) => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from('timetable_tasks')
      .insert({ ...task, user_id: userId })
      .select()
      .single();
    if (!error && data) setTasks(prev => [...prev, data]);
    return data;
  }, [userId]);

  // ── CRUD: Update task ──────────────────────────────────────────────────────
  const updateTask = useCallback(async (id: string, updates: Partial<TimetableTask>) => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from('timetable_tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (!error && data) setTasks(prev => prev.map(t => t.id === id ? data : t));
  }, [userId]);

  // ── CRUD: Delete task ──────────────────────────────────────────────────────
  const deleteTask = useCallback(async (id: string) => {
    if (!supabase || !userId) return;
    await supabase.from('timetable_tasks').delete().eq('id', id).eq('user_id', userId);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [userId]);

  // ── Copy day template ──────────────────────────────────────────────────────
  const copyDayToDay = useCallback(async (fromDay: DayOfWeek, toDay: DayOfWeek) => {
    if (!supabase || !userId) return;
    const sourceTasks = tasks.filter(t => t.day_of_week === fromDay);
    if (!sourceTasks.length) return;
    const isWknd = toDay === 0 || toDay === 6;
    const newTasks = sourceTasks.map(({ id: _id, created_at: _ca, user_id: _uid, ...rest }) => ({
      ...rest,
      day_of_week: toDay,
      is_weekend: isWknd,
      user_id: userId,
    }));
    const { data, error } = await supabase.from('timetable_tasks').insert(newTasks).select();
    if (!error && data) setTasks(prev => [...prev, ...data]);
  }, [tasks, userId]);

  // ── Award bonus XP & badges for the day ───────────────────────────────────
  const claimDayBonus = useCallback(async (
    addXpFn: (pillar: 'Study' | 'Health' | 'Finance' | 'Mind', actionType: string, baseAmount: number) => Promise<number>
  ) => {
    if (!supabase || !userId) return;
    const { tier, total } = todayStats;
    if (tier === 'none' || total === 0) return;

    // Check already claimed
    const { data: existing } = await supabase
      .from('daily_bonus_log')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    if (existing) return; // Already claimed today

    const multiplier = TIER_BONUS[tier][isWeekend ? 'weekend' : 'weekday'];

    // Group completed tasks by pillar and award XP
    const completedTasks = todayTasks.filter(t =>
      completions.find(c => c.task_id === t.id && c.completed)
    );
    const pillarMap: Record<string, number> = {};
    completedTasks.forEach(t => {
      const pillar = t.pillar;
      // XP based on target/priority
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

    // Log the bonus award to prevent double-claiming
    await supabase.from('daily_bonus_log').insert({ user_id: userId, date: today, tier, bonus_multiplier: multiplier });

    // ── Badge checks ────────────────────────────────────────────────────────
    await updateBadgeCounts({ tier, completedTasks });

  }, [userId, today, todayStats, todayTasks, completions]);

  const updateBadgeCounts = useCallback(async ({
    tier, completedTasks
  }: { tier: string; completedTasks: TimetableTask[] }) => {
    if (!supabase || !userId) return;

    const bump = async (badgeType: string, thresholds = BADGE_THRESHOLDS) => {
      if (!supabase) return;
      const { data: current } = await supabase
        .from('timetable_badges')
        .select('*')
        .eq('user_id', userId)
        .eq('badge_type', badgeType)
        .maybeSingle();

      const newCount = (current?.count || 0) + 1;
      const newTier = getBadgeTier(newCount, thresholds) || 'bronze';

      if (current) {
        await supabase.from('timetable_badges')
          .update({ count: newCount, tier: newTier })
          .eq('id', current.id);
      } else {
        await supabase.from('timetable_badges')
          .insert({ user_id: userId, badge_type: badgeType, count: newCount, tier: newTier });
      }
    };

    // Overall Consistency
    if (tier === 'perfect' || tier === 'disciplined') await bump('consistency');
    
    // Category specific
    const gymCount = completedTasks.filter(t => t.category === 'gym').length;
    if (gymCount >= 1) await bump('gym_mastery', SPECIAL_CATEGORY_THRESHOLDS);

    const studyCount = completedTasks.filter(t => t.category === 'study').length;
    if (studyCount >= 1) await bump('scholar_rank', SPECIAL_CATEGORY_THRESHOLDS);

    const workCount = completedTasks.filter(t => t.category === 'work').length;
    if (workCount >= 1) await bump('executor_prime', SPECIAL_CATEGORY_THRESHOLDS);
  }, [userId]);

  return {
    tasks, completions, badges, loading, todayStats, todayTasks,
    isWeekend, addTask, updateTask, deleteTask, copyDayToDay, toggleCompletion, claimDayBonus
  };
}
