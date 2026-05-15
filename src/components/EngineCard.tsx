import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, AlertTriangle, Image as ImageIcon, X, PauseCircle, CheckCircle, SkipForward, Bell } from 'lucide-react';
import { audio } from '../lib/audio';
import { notifier } from '../lib/notifications';
import { supabase } from '../lib/supabaseClient';
import { useProgression } from '../hooks/useProgression';
import { Skeleton } from './Skeleton';

// Types
interface Task {
  id: number;
  start: string;
  end: string;
  title: string;
  statusMsg: string;
}

interface SkipRecord {
  date: string;
  reason: string;
  image?: string;
}

const SCHEDULE: Task[] = [
  { id: 1, start: '06:00', end: '07:00', title: 'Morning Routine & Movement', statusMsg: 'System Initialization...' },
  { id: 2, start: '09:00', end: '12:00', title: 'Deep Work Block 1', statusMsg: 'Maximum Focus...' },
  { id: 3, start: '13:00', end: '17:00', title: 'Deep Work Block 2 & Communications', statusMsg: 'Executing Objectives...' },
  { id: 4, start: '18:00', end: '20:00', title: 'Skill Development', statusMsg: 'Learning & Growth...' },
  { id: 5, start: '20:00', end: '22:00', title: 'Decompression & Review', statusMsg: 'Recovery Protocol...' },
];

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const date = parseTime(startTime);
  date.setMinutes(date.getMinutes() + durationMinutes);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function EngineCard() {
  const { addXp } = useProgression();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');

  const [showCheckmark, setShowCheckmark] = useState(false);
  const [systemState, setSystemState] = useState<'optimal' | 'behind' | 'idle'>('idle');

  // Skip Modal State
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipError, setSkipError] = useState('');
  const [isSkippedToday, setIsSkippedToday] = useState(false);

  // Executed tasks for today (store IDs)
  const [executedTaskIds, setExecutedTaskIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [sundayRest] = useState(true);
  const [userId, setUserId] = useState<string>('default');

  const [schedule, setSchedule] = useState<Task[]>(SCHEDULE);

  // Load state on mount
  useEffect(() => {
    const todayStr = getTodayString();

    const loadExecutions = async () => {
      let uid: string = 'default';
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          uid = session.user.id;
          setUserId(uid);
          
          // Try to get timetable from timetable_tasks table first
          try {
            const todayDow = new Date().getDay();
            const { data: dbTasks } = await supabase
              .from('timetable_tasks')
              .select('*')
              .eq('user_id', uid)
              .eq('day_of_week', todayDow)
              .order('order_index');

            if (dbTasks && dbTasks.length > 0) {
              const mappedTasks: Task[] = dbTasks.map((t: any) => ({
                id: t.id,
                start: t.start_time || '00:00',
                end: calculateEndTime(t.start_time || '00:00', t.duration_minutes || 30),
                title: t.name,
                statusMsg: t.task_target ? `${t.task_target} Priority Protocol` : 'Executing Protocol...',
                task_target: t.task_target,
                pillar: t.pillar
              }));
              setSchedule(mappedTasks);
            } else {
              // Fallback to profile settings or local
              const { data } = await supabase.from('profiles').select('settings').eq('id', uid).single();
              if (data?.settings?.timetable) {
                setSchedule(data.settings.timetable);
              } else {
                const customTimetable = localStorage.getItem(`quantum_timetable_${uid}`);
                if (customTimetable && customTimetable !== "undefined") setSchedule(JSON.parse(customTimetable));
              }
            }
          } catch (e) {
            console.error("Failed to load timetable from DB", e);
          }
        }
        
        try {
          const { data } = await supabase
            .from('executions')
            .select('*')
            .eq('date_string', todayStr);

          if (data && data.length > 0) {
            // Filter by user_id if available, otherwise scoped local storage
            const userExecs = data.filter(d => (d as any).user_id === uid);
            if (userExecs.length > 0) {
              setExecutedTaskIds(userExecs.map(d => d.task_id));
            } else {
              const execStr = localStorage.getItem(`quantum_exec_${uid}_${todayStr}`);
              if (execStr) setExecutedTaskIds(JSON.parse(execStr));
            }
          } else {
            const execStr = localStorage.getItem(`quantum_exec_${uid}_${todayStr}`);
            if (execStr) setExecutedTaskIds(JSON.parse(execStr));
          }
        } catch (e) {
          console.error("Supabase sync failed, falling back to local.");
          const execStr = localStorage.getItem(`quantum_exec_${uid}_${todayStr}`);
          if (execStr) setExecutedTaskIds(JSON.parse(execStr));
        }
      } else {
        const execStr = localStorage.getItem(`quantum_exec_${uid}_${todayStr}`);
        if (execStr) setExecutedTaskIds(JSON.parse(execStr));
      }
      
      // Load skips scoped to uid
      const skipsStr = localStorage.getItem(`quantum_skips_${uid}`);
      if (skipsStr) {
        const skips: SkipRecord[] = JSON.parse(skipsStr);
        if (skips.some(s => s.date === todayStr)) {
          setIsSkippedToday(true);
        }
      }

      // Fallback if no uid
      if (uid === 'default') {
        const fallbackTimetable = localStorage.getItem('quantum_timetable_default') || localStorage.getItem('quantum_timetable');
        if (fallbackTimetable) {
          try {
            setSchedule(JSON.parse(fallbackTimetable));
          } catch (e) {
            console.error("Failed to parse custom timetable", e);
          }
        }
      }
    };

    loadExecutions().finally(() => setLoading(false));
  }, []);

  // Time loop
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Find active task
      const current = schedule.find(t => {
        const tStart = (t as any).start || (t as any).timeStart;
        const tEnd = (t as any).end || (t as any).timeEnd;
        if (!tStart || !tEnd) return false;
        const start = parseTime(tStart);
        const end = parseTime(tEnd);
        return now >= start && now <= end;
      });

      if (current) {
        setActiveTask(current);
        const tStart = (current as any).start || (current as any).timeStart;
        const tEnd = (current as any).end || (current as any).timeEnd;
        const start = parseTime(tStart).getTime();
        const end = parseTime(tEnd).getTime();
        const total = end - start;
        const passed = now.getTime() - start;
        const prct = Math.min(100, Math.max(0, (passed / total) * 100));
        setProgress(prct);

        const msLeft = end - now.getTime();
        const minsLeft = Math.floor(msLeft / 60000);
        setTimeRemaining(`${minsLeft} minutes remaining in current protocol`);

        // Check if executed early
        if (executedTaskIds.includes(current.id)) {
          setSystemState('optimal');
        } else {
          // If we are more than 50% through and not executed, maybe we are just 'idle' or running.
          // Let's mark as optimal if we are keeping up, behind if we missed a previous one.
          const previousTasks = schedule.filter(t => {
             const tE = (t as any).end || (t as any).timeEnd;
             return tE ? parseTime(tE) < now : false;
          });
          const missedPrevious = previousTasks.some(t => !executedTaskIds.includes(t.id));
          setSystemState(missedPrevious ? 'behind' : 'optimal');
        }
      } else {
        setActiveTask(null);
        setProgress(0);
        setTimeRemaining('Awaiting next sequence...');

        const previousTasks = schedule.filter(t => {
             const tE = (t as any).end || (t as any).timeEnd;
             return tE ? parseTime(tE) < now : false;
        });
        const missedPrevious = previousTasks.some(t => !executedTaskIds.includes(t.id));
        setSystemState(missedPrevious ? 'behind' : 'idle');
      }

    }, 1000);
    return () => clearInterval(timer);
  }, [executedTaskIds, schedule]);

  // Handle task change notifications
  useEffect(() => {
    if (activeTask) {
      const storedLast = localStorage.getItem(`quantum_last_notified_task_${userId}`);
      if (storedLast !== activeTask.id.toString()) {
        notifier.send(
          "Protocol Shift",
          `Commencing: ${activeTask.title}`
        );
        localStorage.setItem(`quantum_last_notified_task_${userId}`, activeTask.id.toString());
      }
    }
  }, [activeTask, userId]);

  const handleComplete = async () => {
    audio.playSuccess();
    if (!activeTask) return;

    let xpAmount = 5; // Fallback
    const tTarget = (activeTask as any).task_target;
    if (tTarget === 'High') xpAmount = 100;
    else if (tTarget === 'Medium') xpAmount = 60;
    else if (tTarget === 'Low') xpAmount = 40;
    else xpAmount = 30;

    addXp((activeTask as any).pillar || 'Mind', `Routine Task: ${activeTask.title}`, xpAmount);

    const todayStr = getTodayString();
    const updated = [...executedTaskIds, activeTask.id];
    setExecutedTaskIds(updated);

    // Local fallback scoped
    localStorage.setItem(`quantum_exec_${userId}_${todayStr}`, JSON.stringify(updated));

    // Supabase Sync
    if (supabase) {
      try {
        const payload: any = {
          task_id: activeTask.id,
          date_string: todayStr
        };
        if (userId !== 'default') payload.user_id = userId;
        await supabase.from('executions').insert([payload]);
      } catch (e) {
        console.error("Failed to sync execution to cloud.");
      }
    }

    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 2000);
  };

  const attemptSkip = () => {
    audio.playClick();
    if (skipReason.trim().length < 5) {
      setSkipError('A valid reason is required for system override.');
      return;
    }

    const todayStr = getTodayString();
    const skipsStr = localStorage.getItem(`quantum_skips_${userId}`);
    const skips: SkipRecord[] = skipsStr ? JSON.parse(skipsStr) : [];

    // Validation rules
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const skippedYesterday = skips.some(s => s.date === yesterdayStr);
    if (skippedYesterday) {
      setSkipError('CRITICAL: Cannot skip two consecutive days.');
      return;
    }

    // Check last 7 days count
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSkips = skips.filter(s => new Date(s.date) >= sevenDaysAgo);

    if (recentSkips.length >= 2) {
      setSkipError('CRITICAL: Maximum overrides (2) per week reached.');
      return;
    }

    // Commit skip
    const newSkip: SkipRecord = { date: todayStr, reason: skipReason };
    localStorage.setItem(`quantum_skips_${userId}`, JSON.stringify([...skips, newSkip]));

    setIsSkippedToday(true);
    setSkipModalOpen(false);
  };

  const isSunday = new Date().getDay() === 0;

  // Sunday Rest View
  if (isSunday && sundayRest) {
    return (
      <div className="h-full p-6 flex flex-col justify-center items-center text-center relative overflow-hidden bg-emerald-950/20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-50" />
        <PauseCircle size={64} className="text-emerald-500 mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-textMain mb-2">System Offline</h2>
        <p className="text-emerald-400 font-medium mb-1">Rest & Recovery Protocol Active</p>
        <p className="text-sm text-textMuted max-w-md">
          "Sunday is outside of the time. Enjoy and reflect here based on mood and history."
        </p>
      </div>
    );
  }

  // Skipped View
  if (isSkippedToday) {
    return (
      <div className="h-full p-6 flex flex-col justify-center items-center text-center relative overflow-hidden bg-amber-950/20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-400 opacity-50" />
        <AlertTriangle size={64} className="text-amber-500 mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-textMain mb-2">Protocol Skipped</h2>
        <p className="text-amber-400 font-medium mb-1">System Override Logged</p>
        <p className="text-sm text-textMuted">Rest day utilized. Return stronger tomorrow.</p>
      </div>
    );
  }

  const isCompleted = activeTask ? executedTaskIds.includes(activeTask.id) : false;

  if (loading) {
    return (
      <div className="h-full p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <Skeleton variant="rectangle" className="w-12 h-12" />
            <div className="space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-2" />
            </div>
          </div>
          <Skeleton className="w-24 h-8" />
        </div>
        <div className="flex-1 flex flex-col justify-end space-y-4">
          <div className="space-y-2">
            <Skeleton className="w-1/3 h-3" />
            <Skeleton className="w-1/2 h-8" />
          </div>
          <Skeleton className="w-full h-4" />
          <div className="flex justify-between items-end">
            <Skeleton className="w-24 h-12" />
            <Skeleton className="w-32 h-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full p-4 md:p-6 flex flex-col relative overflow-hidden transition-all duration-500 ${activeTask && !isCompleted ? 'animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}>

      {/* Decorative Icon */}
      <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5 pointer-events-none">
        <Target size={100} className="md:w-[150px] md:h-[150px]" />
      </div>

      {/* Checkmark Animation Overlay */}
      <AnimatePresence>
        {showCheckmark && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl"
          >
            <motion.div
              initial={{ rotate: -90, strokeDashoffset: 100 }}
              animate={{ rotate: 0, strokeDashoffset: 0 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <CheckCircle2 size={80} className="text-emerald-500 md:w-[100px] md:h-[100px]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start mb-4 md:mb-6 z-10">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="p-2 md:p-3 bg-primary/20 rounded-xl relative">
            <Target className="text-primary" size={20} />
            {activeTask && !isCompleted && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-textMain">The Engine</h2>
            <p className="text-[10px] text-primary font-medium tracking-wide mt-0.5 uppercase">Action Protocol</p>
          </div>
        </div>

        {/* System Tags */}
        <div className="flex gap-1.5 md:gap-2">
          <button
            onClick={() => {
              audio.playClick();
              notifier.requestPermission();
            }}
            className="p-1.5 md:px-2 md:py-1 bg-surfaceHighlight border border-border rounded-md text-textMuted flex items-center"
          >
            <Bell size={12} className="md:w-[14px] md:h-[14px]" />
          </button>
          {systemState === 'optimal' && (
            <div className="px-2 py-1 md:px-3 md:py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-md flex items-center">
              <CheckCircle size={12} className="mr-1 md:mr-1.5" /> <span className="hidden xs:inline">Optimal</span>
            </div>
          )}
          {systemState === 'behind' && (
            <div className="px-2 py-1 md:px-3 md:py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-md flex items-center">
              <AlertTriangle size={12} className="mr-1 md:mr-1.5" /> <span className="hidden xs:inline">Delay</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end z-10 relative">
        <div className="space-y-3 md:space-y-4">

          <div className="flex flex-col mb-2 md:mb-4">
            <div className="flex justify-between items-start mb-1 md:mb-2">
              <span className="text-[10px] md:text-sm font-medium text-textMuted">
                Status: <span className="text-textMain">{activeTask ? ((activeTask as any).statusMsg || 'Active...') : 'Idle'}</span>
              </span>
              <div className="font-mono text-xl md:text-3xl font-bold text-primary tracking-wider">
                {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-textMain line-clamp-1">{activeTask ? activeTask.title : 'No Active Task'}</h3>
            <p className="text-xs md:text-lg font-bold text-primary animate-pulse mt-1 md:mt-2 bg-primary/10 inline-block px-2 py-0.5 md:px-3 md:py-1 rounded-md w-max border border-primary/20">
              {timeRemaining}
            </p>
          </div>

          <div className="w-full bg-surfaceHighlight rounded-full h-3 md:h-4 mb-1 md:mb-2 overflow-hidden relative shadow-inner">
            <motion.div
              className="bg-primary h-full rounded-full relative"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>

          <div className="flex flex-row justify-between items-end gap-2 pt-1 md:pt-2">
            <div>
              <p className="text-xl md:text-3xl font-black text-textMain">{Math.floor(progress)}%</p>
              <p className="text-[9px] md:text-sm text-textMuted uppercase font-bold tracking-widest">Progress</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleComplete}
                disabled={!activeTask || isCompleted}
                className={`py-2 px-4 md:py-3 md:px-6 text-xs md:text-base rounded-xl font-black uppercase tracking-widest transition-all ${isCompleted
                  ? 'bg-surfaceHighlight text-textMuted'
                  : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                  }`}
              >
                {isCompleted ? 'Done' : 'Execute'}
              </button>

              <button
                onClick={() => setSkipModalOpen(true)}
                className="p-2 md:p-3 bg-surfaceHighlight text-textMuted rounded-xl border border-border"
              >
                <SkipForward size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Skip Modal */}
      <AnimatePresence>
        {skipModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setSkipModalOpen(false)}
                className="absolute top-4 right-4 text-textMuted hover:text-textMain"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-red-500 mb-2 flex items-center">
                <AlertTriangle className="mr-2" /> Override Protocol
              </h3>
              <p className="text-sm text-textMuted mb-6">
                Skipping breaks momentum. Justification is required.
                <br /><span className="text-xs opacity-70">(Max 2 per week. No consecutive days.)</span>
              </p>

              {skipError && (
                <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-500 font-medium">
                  {skipError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Reason for Skipping</label>
                  <textarea
                    value={skipReason}
                    onChange={(e) => setSkipReason(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-3 text-sm text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none h-24"
                    placeholder="Provide detailed justification..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Upload Evidence (Optional)</label>
                  <div className="w-full bg-background border border-border border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-surfaceHighlight transition-colors group">
                    <ImageIcon className="text-textMuted group-hover:text-primary transition-colors mb-2" size={24} />
                    <span className="text-xs text-textMuted">Click to attach image</span>
                  </div>
                </div>

                <button
                  onClick={attemptSkip}
                  className="w-full py-3 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50 rounded-lg font-bold transition-colors mt-4"
                >
                  Confirm Override
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
