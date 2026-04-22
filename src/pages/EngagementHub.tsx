import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Trophy, Calendar, Zap, Clock, Activity, Target,
  ShieldCheck, ChevronRight, RefreshCw,
} from 'lucide-react';
import { useEngagement } from '../hooks/useEngagement';
import { ActivityGraph } from '../components/ActivityGraph';
import { Header } from '../components/Header';
import { useProgression } from '../hooks/useProgression';
import { format, parseISO } from 'date-fns';

export function EngagementHub() {
  const { stats, refresh } = useEngagement();
  const { state: { totalXp, totalLevel, rank } } = useProgression();
  const [refreshing, setRefreshing] = useState(false);

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
      <Header />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-8 space-y-6 scrollbar-none">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
          <StatCard
            title="Longest Streak"
            value={stats.loading ? '—' : String(stats.longestLoginStreak)}
            unit="Days"
            icon={<Trophy className="text-amber-500" size={22} />}
            color="amber"
          />
          <StatCard
            title="Total Login Days"
            value={stats.loading ? '—' : String(stats.totalLoginDays)}
            unit="Days"
            icon={<Calendar className="text-primary" size={22} />}
            color="blue"
          />
          <StatCard
            title="Consistency"
            value={stats.loading ? '—' : String(consistencyPct)}
            unit="%"
            icon={<ShieldCheck className="text-emerald-500" size={22} />}
            color="emerald"
          />
        </div>

        {/* XP Summary */}
        <div className="glass-panel p-4 border border-primary/10 rounded-2xl flex flex-wrap gap-4 items-center">
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
          <div>
            <p className="text-[10px] text-textMuted uppercase tracking-widest">Rank</p>
            <p className="text-base font-bold text-amber-400">{rank}</p>
          </div>
          <div className="h-10 w-px bg-border hidden sm:block" />
          <div>
            <p className="text-[10px] text-textMuted uppercase tracking-widest">Active Days</p>
            <p className="text-2xl font-black text-textMain">{stats.totalActiveDays}</p>
          </div>
        </div>

        {/* ─── GitHub-style Heatmap ───────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center px-1">
            <Activity size={15} className="mr-2 text-primary" /> Contribution Graph
          </h3>
          <ActivityGraph />
        </div>

        {/* ─── Recent Activity Feed ───────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center px-1">
            <Clock size={15} className="mr-2 text-purple-400" /> Recent Activity Feed
          </h3>

          {stats.loading ? (
            <div className="h-40 glass-panel flex items-center justify-center rounded-2xl border border-white/5">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats.recentActivity.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {stats.recentActivity.map((act, idx) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="glass-panel p-4 flex items-center justify-between group hover:bg-surfaceHighlight/30 transition-all border border-white/5 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${
                      act.pillar === 'Study' ? 'bg-blue-500/10 text-blue-400' :
                      act.pillar === 'Health' ? 'bg-emerald-500/10 text-emerald-400' :
                      act.pillar === 'Finance' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-purple-500/10 text-purple-400'
                    }`}>
                      <Target size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-textMain group-hover:text-primary transition-colors">
                        {act.type}
                      </p>
                      <p className="text-[10px] text-textMuted uppercase tracking-widest mt-0.5">
                        {act.pillar} · {act.relativeTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs font-bold text-primary">+{act.xp} XP</span>
                    <ChevronRight size={13} className="text-textMuted" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-14 glass-panel flex flex-col items-center justify-center text-center rounded-2xl border border-white/5">
              <Activity size={36} className="text-textMuted opacity-30 mb-3" />
              <p className="text-sm text-textMuted opacity-60">No activity logged yet.</p>
              <p className="text-xs text-textMuted opacity-40 mt-1">
                Complete actions in any section to see them here.
              </p>
            </div>
          )}
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
    orange:  'from-orange-500/20  to-orange-500/5  border-orange-500/20  text-orange-400',
    amber:   'from-amber-500/20   to-amber-500/5   border-amber-500/20   text-amber-400',
    blue:    'from-blue-500/20    to-blue-500/5    border-blue-500/20    text-blue-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  };

  return (
    <div className={`glass-panel p-4 bg-gradient-to-br ${palette[color]} border relative overflow-hidden group hover:scale-[1.02] transition-transform rounded-xl`}>
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
