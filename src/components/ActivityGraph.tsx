import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Info, Calendar, Clock, Activity, X, Zap } from 'lucide-react';
import { Skeleton, GraphSkeleton } from './Skeleton';

interface DayActivity {
  date: string;
  count: number;
  level: number; // 0-4
}

interface ActivityLog {
  id: string;
  action_type: string;
  pillar: string;
  xp_earned: number;
  created_at: string;
}

export function ActivityGraph() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [accountCreatedAt, setAccountCreatedAt] = useState<Date | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activityData, setActivityData] = useState<Record<string, DayActivity>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, longestStreak: 0 });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayLogs, setDayLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [currentStreakCount, setCurrentStreakCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch heatmap data from daily_activity ──────────────────────────────
  useEffect(() => {
    fetchHeatmap();
  }, [selectedYear]);

  async function fetchHeatmap() {
    if (!supabase) return;
    // FIX: getSession() reads from localStorage — no HTTP call, no 403
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const startOfYear = `${selectedYear}-01-01`;
    const endOfYear = `${selectedYear}-12-31`;

    const [{ data: dailyRows }, { data: logs }, { data: profile }] = await Promise.all([
      supabase
        .from('daily_activity')
        .select('date, activity_count')
        .eq('user_id', user.id)
        .gte('date', startOfYear)
        .lte('date', endOfYear),
      supabase
        .from('activity_logs')
        .select('created_at, action_type')
        .eq('user_id', user.id)
        .gte('created_at', startOfYear)
        .lte('created_at', endOfYear),
      supabase
        .from('profiles')
        .select('streak_count, created_at')
        .eq('id', user.id)
        .single(),
    ]);

    if (profile?.created_at) {
      const creationDate = parseISO(profile.created_at);
      setAccountCreatedAt(creationDate);
      
      const creationYear = creationDate.getFullYear();
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = currentYear; y >= creationYear; y--) {
        years.push(y);
      }
      setAvailableYears(years);
    }

    if (dailyRows) {
      const map: Record<string, DayActivity> = {};
      let total = 0;

      // Group logs by day for accuracy
      const dailyAccuracy: Record<string, { solved: number; total: number }> = {};
      logs?.forEach(log => {
        const d = log.created_at.split('T')[0];
        if (!dailyAccuracy[d]) dailyAccuracy[d] = { solved: 0, total: 0 };
        dailyAccuracy[d].total++;
        if (!log.action_type?.startsWith('FAILED:')) {
          dailyAccuracy[d].solved++;
        }
      });

      (dailyRows as any[]).forEach((row) => {
        const count = row.activity_count ?? 0;
        total += count;
        let level = 0;
        if (count >= 10) level = 4;
        else if (count >= 5) level = 3;
        else if (count >= 2) level = 2;
        else if (count >= 1) level = 1;

        const accInfo = dailyAccuracy[row.date];
        const accuracy = accInfo ? (accInfo.solved / accInfo.total) * 100 : undefined;
        
        map[row.date] = { date: row.date, count, level, accuracy };
      });

      // Longest activity streak
      const sorted = (dailyRows as any[])
        .filter((d) => (d.activity_count ?? 0) > 0)
        .map((d) => d.date)
        .sort();

      let longest = 0, cur = 0;
      let last: Date | null = null;
      sorted.forEach((ds: string) => {
        const d = parseISO(ds);
        if (!last) { cur = 1; }
        else {
          const diff = Math.round((d.getTime() - last.getTime()) / 86400000);
          cur = diff === 1 ? cur + 1 : 1;
        }
        longest = Math.max(longest, cur);
        last = d;
      });

      setStats({ total, longestStreak: longest });
      setActivityData(map);
    }

    setCurrentStreakCount(profile?.streak_count ?? 0);
    setLoading(false);
  }

  // Scroll to end (most recent)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [activityData]);

  // ── Fetch logs for a clicked day ─────────────────────────────────────────
  const fetchDayLogs = async (date: string) => {
    if (!supabase) return;
    setLoadingLogs(true);
    setSelectedDay(date);
    setDayLogs([]);

    // FIX: getSession() reads from localStorage — no HTTP call, no 403
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoadingLogs(false); return; }

    // Full UTC day range
    const { data } = await supabase
      .from('activity_logs')
      .select('id, action_type, pillar, xp_earned, created_at')
      .eq('user_id', user.id)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`)
      .order('created_at', { ascending: false });

    setDayLogs(data ?? []);
    setLoadingLogs(false);
  };

  // Always generate a full year (53 weeks) for visual consistency and alignment
  const startDate = new Date(selectedYear, 0, 1);
  const calendarStart = startOfWeek(startDate, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let cur = calendarStart;
  
  // 53 columns ensures a standard GitHub-style layout
  for (let w = 0; w < 53; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-white/5 border-white/5 hover:bg-white/10';
      case 1: return 'bg-emerald-900/50 border-emerald-800/30 hover:bg-emerald-900/80';
      case 2: return 'bg-emerald-700/60 border-emerald-600/40 hover:bg-emerald-700/90';
      case 3: return 'bg-emerald-500/80 border-emerald-400/50 hover:bg-emerald-500';
      case 4: return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] border-emerald-300/60 hover:bg-emerald-300';
      default: return 'bg-white/5';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="glass-panel p-3 border border-white/5 rounded-xl flex flex-col items-center justify-center">
          <span className="text-[10px] text-textMuted uppercase tracking-widest mb-1">Total Actions</span>
          <span className="text-xl font-black text-textMain">{stats.total}</span>
        </div>
        <div className="glass-panel p-3 border border-orange-500/20 rounded-xl flex flex-col items-center justify-center bg-orange-500/5">
          <span className="text-[10px] text-orange-400 uppercase tracking-widest mb-1">Current Streak</span>
          <div className="flex items-center space-x-1">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xl font-black text-orange-400">{currentStreakCount}</span>
          </div>
        </div>
        <div className="glass-panel p-3 border border-primary/20 rounded-xl flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-transparent">
          <span className="text-[10px] text-primary uppercase tracking-widest mb-1 font-bold">Best Record</span>
          <span className="text-xl font-black text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">{stats.longestStreak}</span>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main Grid */}
        <div className="glass-panel p-3 md:p-5 border border-white/10 rounded-2xl flex-1">
          {loading ? (
            <GraphSkeleton />
          ) : (
            <>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-xs font-bold text-textMain uppercase tracking-widest flex items-center">
              <Activity size={14} className="mr-2 text-primary" /> Contribution Graph
            </h3>
            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] text-textMuted">Less</span>
              {[0, 1, 2, 3, 4].map(l => (
                <div key={l} className={`w-2.5 h-2.5 rounded-sm border ${getLevelColor(l).split(' hover:')[0]}`} />
              ))}
              <span className="text-[9px] text-textMuted">More</span>
            </div>
          </div>

          {/* Grid Layout */}
          <div ref={scrollRef} className="overflow-x-auto scrollbar-none pb-2">
            <div className="flex flex-col min-w-max p-1">
              
              {/* Month Labels aligned to columns */}
              <div className="flex gap-[3px] mb-2 h-4 relative">
                {weeks.map((week, wi) => {
                  const firstDay = week[0];
                  const monthName = format(firstDay, 'MMM');
                  const prevMonthName = wi > 0 ? format(weeks[wi-1][0], 'MMM') : null;
                  const isNewMonth = monthName !== prevMonthName;
                  
                  // Only show month if the year is correct
                  const isYearMatch = firstDay.getFullYear() === selectedYear;
                  
                  return (
                    <div key={wi} className="w-[12px] md:w-[14px] relative">
                      {isNewMonth && isYearMatch && (
                        <span className="text-[9px] text-textMuted uppercase font-black absolute left-0 whitespace-nowrap opacity-60 tracking-tighter">
                          {monthName}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Main Cells */}
              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px] shrink-0">
                    {week.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const act = activityData[dateStr] ?? { count: 0, level: 0 };
                      const isToday = isSameDay(day, new Date());
                      
                      // Visibility filters
                      const isBeforeCreation = accountCreatedAt && day < startOfWeek(accountCreatedAt, { weekStartsOn: 0 });
                      const isAfterYear = day.getFullYear() > selectedYear;
                      const isFuture = day > new Date();
                      const isOtherYear = day.getFullYear() !== selectedYear;
                      const isVisible = !isBeforeCreation && !isAfterYear && !isOtherYear;
                      
                      return (
                        <div
                          key={dateStr}
                          onClick={() => isVisible && fetchDayLogs(dateStr)}
                          title={isVisible ? `${act.count} action${act.count !== 1 ? 's' : ''}${act.accuracy !== undefined ? ` (${Math.round(act.accuracy)}% accuracy)` : ''} on ${format(day, 'MMM d, yyyy')}` : undefined}
                          className={`
                            w-[12px] h-[12px] md:w-[14px] md:h-[14px] rounded-[2px] border transition-all duration-200
                            ${!isVisible ? 'opacity-0 pointer-events-none' : getLevelColor(act.level)}
                            ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#050505] z-10' : 'border-white/5'}
                            ${isFuture && isVisible ? 'opacity-30 cursor-default' : ''}
                            ${isVisible && act.level > 0 ? 'hover:scale-125 hover:z-50 hover:brightness-125 cursor-pointer' : isVisible ? 'hover:bg-white/20' : ''}
                          `}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-1">
            <p className="text-[10px] text-textMuted font-medium opacity-50 italic">
              Contribution protocol calibrated for {selectedYear}
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] text-textMuted uppercase tracking-widest font-bold">Legend</span>
              <div className="flex gap-1.5 bg-white/5 p-1.5 rounded-lg border border-white/5">
                {[0, 1, 2, 3, 4].map(l => (
                  <div key={l} className={`w-2.5 h-2.5 rounded-sm border ${getLevelColor(l).split(' hover:')[0]}`} title={`Level ${l}`} />
                ))}
              </div>
            </div>
            </div>
          </>
          )}
        </div>

        {/* Year Selector Sidebar */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`
                px-4 py-2 rounded-xl text-xs font-bold transition-all border
                ${selectedYear === year 
                  ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                  : 'bg-white/5 text-textMuted border-white/10 hover:bg-white/10 hover:text-textMain'
                }
              `}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {selectedDay && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-surface border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-border flex justify-between items-center bg-surfaceHighlight/20 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Calendar className="text-primary" size={18} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-textMain">
                      {format(parseISO(selectedDay), 'MMMM d, yyyy')}
                    </h4>
                    <p className="text-[11px] text-textMuted uppercase tracking-widest">
                      {loadingLogs ? 'Loading...' : `${dayLogs.length} action${dayLogs.length !== 1 ? 's' : ''} recorded`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={18} className="text-textMuted" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : dayLogs.length > 0 ? (
                  dayLogs.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-panel p-3.5 border border-white/5 rounded-xl flex items-center justify-between hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          log.pillar === 'Study' ? 'bg-blue-500/10 text-blue-400' :
                          log.pillar === 'Health' ? 'bg-emerald-500/10 text-emerald-400' :
                          log.pillar === 'Finance' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-purple-500/10 text-purple-400'
                        }`}>
                          <Zap size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-textMain group-hover:text-primary transition-colors">
                            {log.action_type}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-textMuted uppercase tracking-wide">{log.pillar}</span>
                            <span className="text-[10px] text-emerald-400 font-bold">+{log.xp_earned} XP</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-textMuted font-mono bg-white/5 px-2 py-1 rounded shrink-0">
                        <Clock size={10} className="inline mr-1" />
                        {format(parseISO(log.created_at), 'HH:mm')}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Info size={32} className="mb-3 text-textMuted opacity-40" />
                    <p className="text-sm text-textMuted opacity-60">No activity recorded for this day.</p>
                    <p className="text-xs text-textMuted opacity-40 mt-1">Complete actions to see them here.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
