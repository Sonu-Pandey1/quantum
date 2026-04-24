import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Trophy, Calendar, Zap, Clock, Activity, Target,
  ShieldCheck, ChevronRight, RefreshCw, Loader2
} from 'lucide-react';
import { Skeleton, ListSkeleton } from '../components/Skeleton';
import { useEngagement } from '../hooks/useEngagement';
import { ActivityGraph } from '../components/ActivityGraph';
import { useProgression } from '../hooks/useProgression';
import { format, parseISO } from 'date-fns';
import { ProgressAnalytics } from '../components/ProgressAnalytics';

export function EngagementHub() {
  const { stats, refresh, loadMore } = useEngagement();
  const { state: { totalXp, totalLevel, rank } } = useProgression();
  const [refreshing, setRefreshing] = useState(false);
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && stats.hasMore && !stats.loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [stats.hasMore, stats.loadingMore, loadMore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const consistencyPct =
    stats.totalLoginDays > 0
      ? Math.min(100, Math.round((stats.currentLoginStreak / stats.totalLoginDays) * 100))
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full w-full relative z-10 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-8 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          
          {/* Page Header */}
          <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <Zap className="text-primary animate-pulse" size={26} />
                <h1 className="text-2xl font-black text-textMain tracking-tight">Engagement Hub</h1>
              </div>
              <p className="text-xs text-textMuted uppercase tracking-widest font-medium">
                Real-time activity · Login streaks · Contribution graph
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>

          {/* ─── Streak & Engagement Cards ─────────────────────────── */}
          <div className="lg:col-span-3">
            <StatCard
              title="Login Streak"
              value={stats.loading ? '—' : String(stats.currentLoginStreak)}
              unit="Days"
              icon={<Flame className="text-orange-500" size={22} />}
              sub={stats.lastLoginDate
                ? `Last: ${format(parseISO(stats.lastLoginDate), 'MMM d')}`
                : 'No logins yet'}
              color="orange"
            />
          </div>
          <div className="lg:col-span-3">
            <StatCard
              title="Longest Streak"
              value={stats.loading ? '—' : String(stats.longestLoginStreak)}
              unit="Days"
              icon={<Trophy className="text-amber-500" size={22} />}
              color="amber"
            />
          </div>
          <div className="lg:col-span-3">
            <StatCard
              title="Total Login Days"
              value={stats.loading ? '—' : String(stats.totalLoginDays)}
              unit="Days"
              icon={<Calendar className="text-primary" size={22} />}
              color="blue"
            />
          </div>
          <div className="lg:col-span-3">
            <StatCard
              title="Consistency"
              value={stats.loading ? '—' : String(consistencyPct)}
              unit="%"
              icon={<ShieldCheck className="text-emerald-500" size={22} />}
              color="emerald"
            />
          </div>

          {/* ─── Neural Progress Analytics ────────────────────────── */}
          <div className="lg:col-span-12">
            <ProgressAnalytics />
          </div>

          {/* XP Summary */}
          <div className="lg:col-span-12 glass-panel p-4 md:p-6 border border-primary/10 rounded-2xl flex flex-col md:flex-row flex-wrap gap-4 md:items-center">
            {stats.loading ? (
              <>
                <div className="flex items-center space-x-3">
                  <Skeleton variant="rectangle" className="w-10 h-10" />
                  <div className="space-y-2">
                    <Skeleton className="w-20 h-2" />
                    <Skeleton className="w-12 h-6" />
                  </div>
                </div>
                <div className="h-10 w-px bg-border hidden sm:block" />
                <div className="space-y-2">
                  <Skeleton className="w-20 h-2" />
                  <Skeleton className="w-12 h-6" />
                </div>
                <div className="h-10 w-px bg-border hidden sm:block" />
                <Skeleton className="w-32 h-20 rounded-2xl" />
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Target size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-textMuted uppercase tracking-widest">Total XP Earned</p>
                    <p className="text-2xl font-black text-primary">{totalXp.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-10 w-px bg-border hidden sm:block" />
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-widest">Current Level</p>
                  <p className="text-2xl font-black text-textMain">Lvl {totalLevel}</p>
                </div>
                <div className="h-10 w-px bg-border hidden sm:block" />
                <div className="flex flex-col items-center justify-center p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl min-w-[120px] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Trophy className="text-amber-500 mb-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" size={20} />
                  <p className="text-[10px] text-amber-500/60 uppercase tracking-[0.2em] font-black mb-1">Current Rank</p>
                  <p className="text-lg font-black text-amber-400 tracking-tight">{rank}</p>
                </div>
                <div className="h-10 w-px bg-border hidden sm:block" />
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-widest">Active Days</p>
                  <p className="text-2xl font-black text-textMain">{stats.totalActiveDays}</p>
                </div>
              </>
            )}
          </div>

          {/* ─── GitHub-style Heatmap ───────────────────────────────── */}
          <div className="lg:col-span-12 space-y-3">
            <h3 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center px-1">
              <Activity size={15} className="mr-2 text-primary" /> Contribution Graph
            </h3>
            <ActivityGraph />
          </div>

          {/* ─── Recent Activity Feed ───────────────────────────────── */}
          <div className="lg:col-span-12 space-y-4">
            <h3 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center px-1">
              <Clock size={15} className="mr-2 text-purple-400" /> Recent Activity Feed (15d)
            </h3>

            {stats.loading ? (
              <ListSkeleton count={6} />
            ) : stats.recentActivity.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {stats.recentActivity.map((act, idx) => (
                    <motion.div
                      key={`${act.id}-${idx}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-panel p-4 flex items-center justify-between group hover:bg-surfaceHighlight/30 transition-all border border-white/5 rounded-xl"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${
                          act.pillar === 'Study' ? 'bg-blue-500/10 text-blue-400' :
                          act.pillar === 'Health' ? 'bg-emerald-500/10 text-emerald-400' :
                          act.pillar === 'Finance' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-purple-500/10 text-purple-400'
                        }`}>
                          <Target size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-textMain group-hover:text-primary transition-colors">
                            {act.type}
                          </p>
                          {act.breakdown && (
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">
                                {act.breakdown}
                              </span>
                            </div>
                          )}
                          <p className="text-[10px] text-textMuted uppercase tracking-widest mt-1 font-medium">
                            {act.pillar} · {act.relativeTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-xs font-black text-primary">+{act.xp} XP</span>
                        <ChevronRight size={14} className="text-textMuted" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Infinite Scroll Indicator / Sentinel */}
                <div ref={observerTarget} className="py-12 flex flex-col items-center justify-center space-y-2">
                  {stats.hasMore ? (
                    <>
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-[10px] text-textMuted uppercase tracking-widest animate-pulse">Syncing more records...</p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center space-y-1 opacity-50">
                      <div className="h-px w-16 bg-border mb-3" />
                      <p className="text-[10px] text-textMuted uppercase tracking-widest font-black">End of Protocol Logs</p>
                      <p className="text-[9px] text-textMuted uppercase tracking-widest">Showing only last 15 days of activity</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 glass-panel flex flex-col items-center justify-center text-center rounded-2xl border border-white/5">
                <Activity size={48} className="text-textMuted opacity-20 mb-4" />
                <p className="text-sm text-textMain font-bold">No activity detected</p>
                <p className="text-xs text-textMuted mt-1">
                  Complete actions in any section to see them here.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}

// ── Reusable stat card ───────────────────────────────────────────────────────
function StatCard({
  title, value, unit, icon, sub, color,
}: {
  title: string; value: string; unit: string; icon: React.ReactNode; sub?: string; color: string;
}) {
  const palette: Record<string, string> = {
    orange: 'from-orange-500/20  to-orange-500/5  border-orange-500/20  text-orange-400',
    amber: 'from-amber-500/20   to-amber-500/5   border-amber-500/20   text-amber-400',
    blue: 'from-blue-500/20    to-blue-500/5    border-blue-500/20    text-blue-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  };

  return (
    <div className={`glass-panel p-4 bg-gradient-to-br ${palette[color]} border relative overflow-hidden group hover:scale-[1.02] transition-transform rounded-xl min-h-[120px] flex flex-col justify-center`}>
      <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-70 mb-1.5">{title}</p>
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-black">{value}</span>
        <span className="text-[10px] font-bold opacity-60 uppercase">{unit}</span>
      </div>
      {sub && <p className="text-[9px] mt-2 opacity-50 font-medium tracking-wide">{sub}</p>}
    </div>
  );
}
