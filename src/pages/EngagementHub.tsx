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

export function EngagementHub({ onNavigateToRank }: { onNavigateToRank?: () => void }) {
  const { stats, refresh, loadMore } = useEngagement();
  const { state: { totalXp, totalLevel, rank, settings } } = useProgression();
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

  // Focus Session Calculations
  const executionLogs = settings?.execution_logs || [];
  
  // Total focused hours
  const totalMinutesFocused = executionLogs.reduce((sum: number, log: any) => sum + (log.duration_spent || 0), 0);
  const totalHoursFocused = (totalMinutesFocused / 60).toFixed(1);

  // Session completion rate
  const totalStartedSessions = executionLogs.length;
  const completedSessions = executionLogs.filter((log: any) => log.status === 'completed').length;
  const sessionCompletionRate = totalStartedSessions > 0 ? Math.round((completedSessions / totalStartedSessions) * 100) : 0;

  // Today's attempted vs scheduled timetable tasks
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDow = new Date().getDay();
  const todayAttemptedSessions = executionLogs.filter((log: any) => log.date === todayStr).length;
  const todayTimetableTasksCount = (settings?.timetable || []).filter((t: any) => {
    const d = t.dayOfWeek !== undefined ? t.dayOfWeek : t.day_of_week;
    return d === undefined || d === todayDow;
  }).length || 5; // fallback to default 5

  // Pillar time spent distribution (in minutes)
  const pillarDurations: Record<string, number> = { Study: 0, Health: 0, Finance: 0, Mind: 0 };
  executionLogs.forEach((log: any) => {
    const p = log.pillar || 'Mind';
    if (pillarDurations[p] !== undefined) {
      pillarDurations[p] += (log.duration_spent || 0);
    }
  });

  // Smart rule-based AI Discipline Analyst Insights
  const generateAiInsights = () => {
    if (executionLogs.length === 0) {
      return [
        "AI Advisor: System initialization is complete, but no active focus logs are recorded yet.",
        "Tip: Start an Action Protocol session in 'The Engine' to begin generating discipline analytics.",
        "Recommendation: Aim to log a 30-minute Study block tomorrow to verify database sync."
      ];
    }

    const insights = [];
    
    // Check midway drops
    const midwayLogs = executionLogs.filter((log: any) => log.status === 'left_midway');
    if (midwayLogs.length > 0) {
      const percentageMidway = Math.round((midwayLogs.length / executionLogs.length) * 100);
      if (percentageMidway >= 20) {
        insights.push(`AI Advisor: We detected that ${percentageMidway}% of focus sessions were terminated midway. This suggests a pattern of split attention. Consider breaking study sessions into shorter 25m Pomodoros.`);
      } else {
        insights.push(`AI Advisor: You completed most of your started sessions. Keep using detailed justifications for early endings to refine focus metrics.`);
      }
    } else {
      insights.push(`AI Advisor: Outstanding discipline! 100% of your started sessions reached completion without midway cancellations.`);
    }

    // Check most focused pillar
    let topPillar = 'Study';
    let maxMinutes = 0;
    Object.entries(pillarDurations).forEach(([p, mins]) => {
      if (mins > maxMinutes) {
        maxMinutes = mins;
        topPillar = p;
      }
    });

    if (maxMinutes > 0) {
      insights.push(`Pillar Analysis: Your highest focus volume is in the '${topPillar}' pillar (${Math.round(maxMinutes)} minutes). Ensure you balance study blocks with recovery protocols in 'Mind'.`);
    }

    // Check average session length
    const avgSessionLength = Math.round(totalMinutesFocused / executionLogs.length);
    if (avgSessionLength < 25) {
      insights.push(`Efficiency Alert: Your average focus duration is ${avgSessionLength} mins. Shorter sessions are useful, but extending continuous focus blocks to 45m will trigger deeper cognitive consolidation.`);
    } else {
      insights.push(`Focus Range: Your average focus block duration is ${avgSessionLength} mins. This is within the optimal cognitive window for deep work.`);
    }

    return insights;
  };

  const aiInsights = generateAiInsights();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full w-full relative z-10 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-10 md:pb-8 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* Page Header */}
          <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <Zap className="text-primary animate-pulse" size={22} />
                <h1 className="text-xl md:text-2xl font-black text-textMain tracking-tight uppercase">Engagement Hub</h1>
              </div>
              <p className="text-[10px] md:text-xs text-textMuted uppercase tracking-widest font-medium opacity-60">
                Neural Activity · Persistence Logic
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

          <div className="lg:col-span-3">
            <StatCard
              title="Streak"
              value={stats.loading ? '—' : String(stats.currentLoginStreak)}
              unit="Days"
              icon={<Flame className="text-orange-500" size={18} />}
              sub={stats.lastLoginDate
                ? `Last: ${format(parseISO(stats.lastLoginDate), 'MMM d')}`
                : 'None'}
              color="orange"
            />
          </div>
          <div className="lg:col-span-3">
            <StatCard
              title="Best"
              value={stats.loading ? '—' : String(stats.longestLoginStreak)}
              unit="Days"
              icon={<Trophy className="text-amber-500" size={18} />}
              color="amber"
            />
          </div>
          <div className="lg:col-span-3">
            <StatCard
              title="Total"
              value={stats.loading ? '—' : String(stats.totalLoginDays)}
              unit="Days"
              icon={<Calendar className="text-primary" size={18} />}
              color="blue"
            />
          </div>
          <div className="lg:col-span-3">
            <StatCard
              title="Stability"
              value={stats.loading ? '—' : String(consistencyPct)}
              unit="%"
              icon={<ShieldCheck className="text-emerald-500" size={18} />}
              color="emerald"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
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
                <div 
                  className="flex flex-col items-center justify-center p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl min-w-[120px] relative overflow-hidden group cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => onNavigateToRank && onNavigateToRank()}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Trophy className="text-amber-500 mb-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)] group-hover:scale-110 transition-transform" size={20} />
                  <p className="text-[10px] text-amber-500/60 uppercase tracking-[0.2em] font-black mb-1 group-hover:text-amber-500/80 transition-colors">Current Rank</p>
                  <p className="text-lg font-black text-amber-400 tracking-tight group-hover:text-amber-300 transition-colors">{rank}</p>
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

          {/* ─── Focus Session Metrics & logs ────────────────────── */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Focus Metrics Panel */}
            <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-primary/10 flex flex-col justify-between space-y-4">
              <h4 className="text-[10px] font-black text-textMuted uppercase tracking-widest flex items-center">
                <Target size={14} className="mr-2 text-primary" /> Focus Statistics
              </h4>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                <div>
                  <p className="text-3xl font-black text-textMain">{totalHoursFocused} hrs</p>
                  <p className="text-[10px] text-textMuted uppercase">Total Time Focused</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-primary">{sessionCompletionRate}%</p>
                  <p className="text-[10px] text-textMuted uppercase">Session Completion Rate</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-emerald-400">{todayAttemptedSessions} / {todayTimetableTasksCount}</p>
                  <p className="text-[10px] text-textMuted uppercase">Protocols Attempted Today</p>
                </div>
              </div>
            </div>

            {/* Pillar Focus Distribution Chart */}
            <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-primary/10 space-y-4">
              <h4 className="text-[10px] font-black text-textMuted uppercase tracking-widest flex items-center">
                <Activity size={14} className="mr-2 text-emerald-400" /> Pillar Focus Volume
              </h4>
              <div className="space-y-3.5 pt-2">
                {[
                  { name: 'Study', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/20' },
                  { name: 'Health', color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/20' },
                  { name: 'Finance', color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/20' },
                  { name: 'Mind', color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/20' },
                ].map(pillar => {
                  const mins = pillarDurations[pillar.name] || 0;
                  const pct = totalMinutesFocused > 0 ? Math.round((mins / totalMinutesFocused) * 100) : 0;
                  return (
                    <div key={pillar.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className={pillar.text}>{pillar.name}</span>
                        <span className="text-textMuted">{Math.round(mins)} mins ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-surfaceHighlight rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full ${pillar.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Discipline Analyst Insights */}
            <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-primary/10 space-y-4 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center">
                🤖 AI Discipline Analyst
              </h4>
              <div className="space-y-3 pt-2">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-[11px] leading-relaxed text-textMain">
                    <span className="text-primary mt-0.5">•</span>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Focus Execution Logs Feed */}
          <div className="lg:col-span-12 space-y-3">
            <h3 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center px-1">
              <Clock size={15} className="mr-2 text-primary animate-pulse" /> Focus Protocol Execution Logs
            </h3>
            
            <div className="glass-panel rounded-2xl border border-primary/5 overflow-hidden">
              <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-surfaceHighlight">
                {executionLogs.length === 0 ? (
                  <div className="p-8 text-center text-textMuted text-xs uppercase tracking-wider">
                    No active focus sessions logged yet. Log sessions in the Engine card to view focus logs.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-surfaceHighlight/30 text-[9px] uppercase tracking-wider text-textMuted font-bold">
                        <th className="p-3">Protocol Task</th>
                        <th className="p-3">Pillar</th>
                        <th className="p-3">Focused Duration</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">XP Earned</th>
                        <th className="p-3">Justification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executionLogs.map((log: any, idx: number) => {
                        const dateStr = log.date ? format(new Date(log.date), 'MMM d, yyyy') : 'Recent';
                        return (
                          <tr key={log.id || idx} className="border-b border-white/5 hover:bg-surfaceHighlight/20 transition-colors">
                            <td className="p-3 font-bold text-textMain">
                              <div>{log.title}</div>
                              <div className="text-[9px] text-textMuted font-medium">{dateStr} · {log.scheduled_start || '--'} - {log.scheduled_end || '--'}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 ${
                                log.pillar === 'Study' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                log.pillar === 'Health' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                log.pillar === 'Finance' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}>
                                {log.pillar}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-textMain">
                              {log.duration_spent}m / {log.scheduled_duration || 30}m
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                log.status === 'completed' 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {log.status === 'completed' ? '🎯 Done' : '⚠️ Left Midway'}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-black text-primary">
                              +{log.xp_earned || 0} XP
                            </td>
                            <td className="p-3 text-textMuted max-w-[200px] truncate" title={log.reason}>
                              {log.reason || 'No justification provided'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
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
