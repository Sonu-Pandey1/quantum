import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

export interface EngagementStats {
  currentLoginStreak: number;
  longestLoginStreak: number;
  lastLoginDate: string | null;
  totalLoginDays: number;
  totalActiveDays: number;
  recentActivity: RecentActivityItem[];
  loading: boolean;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  pillar: string;
  xp: number;
  timestamp: string;
  relativeTime: string;
}

const EMPTY_STATS: EngagementStats = {
  currentLoginStreak: 0,
  longestLoginStreak: 0,
  lastLoginDate: null,
  totalLoginDays: 0,
  totalActiveDays: 0,
  recentActivity: [],
  loading: true,
};

export function useEngagement() {
  const [stats, setStats] = useState<EngagementStats>(EMPTY_STATS);

  const fetchEngagementData = useCallback(async () => {
    if (!supabase) {
      setStats(s => ({ ...s, loading: false }));
      return;
    }

    // FIX: use getSession() — reads from localStorage, no HTTP call, never 403s
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setStats(s => ({ ...s, loading: false }));
      return;
    }

    try {
      // 1. Profile: login streaks
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_login_streak, longest_login_streak, last_login_date')
        .eq('id', user.id)
        .single();

      // 2. Total unique login days
      const { count: totalLoginDays } = await supabase
        .from('login_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 3. Total days with real activity
      const { count: totalActiveDays } = await supabase
        .from('daily_activity')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('activity_count', 0);

      // 4. Recent activity feed (last 20 items)
      const { data: activityRows } = await supabase
        .from('activity_logs')
        .select('id, action_type, pillar, xp_earned, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const recentActivity: RecentActivityItem[] = (activityRows || []).map(item => ({
        id: item.id,
        type: item.action_type,
        pillar: item.pillar ?? 'General',
        xp: item.xp_earned ?? 0,
        timestamp: item.created_at,
        relativeTime: formatDistanceToNow(parseISO(item.created_at), { addSuffix: true }),
      }));

      setStats({
        currentLoginStreak: profile?.current_login_streak ?? 0,
        longestLoginStreak: profile?.longest_login_streak ?? 0,
        lastLoginDate: profile?.last_login_date ?? null,
        totalLoginDays: totalLoginDays ?? 0,
        totalActiveDays: totalActiveDays ?? 0,
        recentActivity,
        loading: false,
      });
    } catch (err) {
      console.error('[useEngagement] fetch error:', err);
      setStats(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchEngagementData();
  }, [fetchEngagementData]);

  return { stats, refresh: fetchEngagementData };
}

/**
 * Records today's login via the Supabase RPC.
 * Called from App.tsx on auth state change.
 * Safe to call multiple times — the RPC is idempotent (ON CONFLICT DO NOTHING).
 */
export async function recordLoginToday(userId: string): Promise<void> {
  if (!supabase) return;
  const today = format(new Date(), 'yyyy-MM-dd');
  try {
    const { error } = await supabase.rpc('record_user_login', {
      p_user_id: userId,
      p_date: today,
    });
    if (error) console.warn('[recordLoginToday] RPC error:', error.message);
  } catch (err) {
    console.error('[recordLoginToday] threw:', err);
  }
}
