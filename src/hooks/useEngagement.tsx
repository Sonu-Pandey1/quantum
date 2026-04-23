import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatDistanceToNow, parseISO, format, subDays } from 'date-fns';

export interface EngagementStats {
  currentLoginStreak: number;
  longestLoginStreak: number;
  lastLoginDate: string | null;
  totalLoginDays: number;
  totalActiveDays: number;
  recentActivity: RecentActivityItem[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
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
  hasMore: false,
  loadingMore: false,
};

const ITEMS_PER_PAGE = 20;

export function useEngagement() {
  const [stats, setStats] = useState<EngagementStats>(EMPTY_STATS);

  const fetchEngagementData = useCallback(async () => {
    if (!supabase) {
      setStats(s => ({ ...s, loading: false }));
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setStats(s => ({ ...s, loading: false }));
      return;
    }

    try {
      const fifteenDaysAgo = subDays(new Date(), 15).toISOString();

      // Optimize: Use Promise.all to fetch all data in parallel
      const [
        { data: profile },
        { count: totalLoginDays },
        { count: totalActiveDays },
        { data: activityRows }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('current_login_streak, longest_login_streak, last_login_date')
          .eq('id', user.id)
          .single(),
        supabase
          .from('login_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('daily_activity')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gt('activity_count', 0),
        supabase
          .from('activity_logs')
          .select('id, action_type, pillar, xp_earned, created_at')
          .eq('user_id', user.id)
          .gte('created_at', fifteenDaysAgo)
          .order('created_at', { ascending: false })
          .range(0, ITEMS_PER_PAGE - 1)
      ]);

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
        hasMore: (activityRows?.length ?? 0) === ITEMS_PER_PAGE,
        loadingMore: false,
      });
    } catch (err) {
      console.error('[useEngagement] fetch error:', err);
      setStats(s => ({ ...s, loading: false }));
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (stats.loadingMore || !stats.hasMore || !supabase) return;

    setStats(s => ({ ...s, loadingMore: true }));

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setStats(s => ({ ...s, loadingMore: false }));
      return;
    }

    try {
      const fifteenDaysAgo = subDays(new Date(), 15).toISOString();
      const start = stats.recentActivity.length;
      const end = start + ITEMS_PER_PAGE - 1;

      const { data: activityRows } = await supabase
        .from('activity_logs')
        .select('id, action_type, pillar, xp_earned, created_at')
        .eq('user_id', user.id)
        .gte('created_at', fifteenDaysAgo)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (activityRows && activityRows.length > 0) {
        const newItems: RecentActivityItem[] = activityRows.map(item => ({
          id: item.id,
          type: item.action_type,
          pillar: item.pillar ?? 'General',
          xp: item.xp_earned ?? 0,
          timestamp: item.created_at,
          relativeTime: formatDistanceToNow(parseISO(item.created_at), { addSuffix: true }),
        }));

        setStats(s => ({
          ...s,
          recentActivity: [...s.recentActivity, ...newItems],
          hasMore: activityRows.length === ITEMS_PER_PAGE,
          loadingMore: false,
        }));
      } else {
        setStats(s => ({ ...s, hasMore: false, loadingMore: false }));
      }
    } catch (err) {
      console.error('[useEngagement] loadMore error:', err);
      setStats(s => ({ ...s, loadingMore: false }));
    }
  }, [stats.loadingMore, stats.hasMore, stats.recentActivity.length]);

  useEffect(() => {
    fetchEngagementData();
  }, [fetchEngagementData]);

  // Periodic update for relative timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(s => ({
        ...s,
        recentActivity: s.recentActivity.map(item => ({
          ...item,
          relativeTime: formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true }),
        })),
      }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return { stats, refresh: fetchEngagementData, loadMore };
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
