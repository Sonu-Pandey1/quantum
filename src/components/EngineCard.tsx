import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, AlertTriangle, Image as ImageIcon, X, CheckCircle, SkipForward, Bell } from 'lucide-react';
import { audio } from '../lib/audio';
import { notifier } from '../lib/notifications';
import { supabase } from '../lib/supabaseClient';
import { useProgression } from '../hooks/useProgression';
import { Skeleton } from './Skeleton';
import { cn } from '../lib/utils';

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
  const { state: progressionState, updateProfile, claimTimetableTaskXp } = useProgression();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [showCheckmark, setShowCheckmark] = useState(false);
  const [systemState, setSystemState] = useState<'optimal' | 'behind' | 'idle'>('idle');

  // Skip Modal State
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipError, setSkipError] = useState('');
  const [isSkippedToday, setIsSkippedToday] = useState(false);

  // Active Focus Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endStatus, setEndStatus] = useState<'completed' | 'left_midway'>('completed');
  const [endReason, setEndReason] = useState('');
  const [endError, setEndError] = useState('');

  // Executed tasks for today (store IDs)
  const [executedTaskIds, setExecutedTaskIds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followWeekendTimetable, setFollowWeekendTimetable] = useState(true);
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
          console.log("[EngineCard] Loading executions for user:", uid, "date:", todayStr);
          let execs: string[] = [];
          
          const { data: execData, error: execError } = await supabase
            .from('executions')
            .select('task_id')
            .eq('user_id', uid)
            .eq('date_string', todayStr);

          if (execError) {
            console.error("[EngineCard] Supabase executions fetch failed:", execError);
          } else if (execData) {
            execs = execData.map(d => String(d.task_id));
          }

          const { data: compData, error: compError } = await supabase
            .from('daily_completions')
            .select('task_id')
            .eq('user_id', uid)
            .eq('date', todayStr)
            .eq('completed', true);

          if (compError) {
            console.error("[EngineCard] Supabase daily_completions fetch failed:", compError);
          } else if (compData) {
            const compIds = compData.map(d => String(d.task_id));
            execs = Array.from(new Set([...execs, ...compIds]));
          }

          if (execs.length > 0) {
            console.log("[EngineCard] Loaded merged executions:", execs);
            setExecutedTaskIds(execs);
          } else {
            const execStr = localStorage.getItem(`quantum_exec_${uid}_${todayStr}`);
            console.log("[EngineCard] Loaded executions fallback from local storage:", execStr);
            if (execStr) setExecutedTaskIds(JSON.parse(execStr));
          }
        } catch (e) {
          console.error("Supabase sync failed, falling back to local:", e);
          const execStr = localStorage.getItem(`quantum_exec_${uid}_${todayStr}`);
          if (execStr) setExecutedTaskIds(JSON.parse(execStr));
        }
      } else {
        const execStr = localStorage.getItem(`quantum_exec_${uid}_${todayStr}`);
        if (execStr) setExecutedTaskIds(JSON.parse(execStr));
      }
      
      // Load skips scoped to uid
      let skipsList: SkipRecord[] = [];
      try {
        if (supabase) {
          const { data: profileData } = await supabase.from('profiles').select('settings').eq('id', uid).single();
          const currentDbSettings = profileData?.settings || {};
          if (currentDbSettings.skips) {
            skipsList = currentDbSettings.skips;
            localStorage.setItem(`quantum_skips_${uid}`, JSON.stringify(skipsList));
          } else {
            const skipsStr = localStorage.getItem(`quantum_skips_${uid}`);
            if (skipsStr) skipsList = JSON.parse(skipsStr);
          }
        } else {
          const skipsStr = localStorage.getItem(`quantum_skips_${uid}`);
          if (skipsStr) skipsList = JSON.parse(skipsStr);
        }
      } catch (e) {
        const skipsStr = localStorage.getItem(`quantum_skips_${uid}`);
        if (skipsStr) skipsList = JSON.parse(skipsStr);
      }
      if (skipsList.some(s => s.date === todayStr)) {
        setIsSkippedToday(true);
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

      // Restore active session
      const activeSessionKey = `quantum_active_session_${uid}`;
      const savedSessionStr = localStorage.getItem(activeSessionKey);
      if (savedSessionStr) {
        try {
          const savedSession = JSON.parse(savedSessionStr);
          if (savedSession.date === todayStr) {
            setIsSessionActive(true);
            setSessionStartTime(savedSession.startTime);
            const elapsed = Math.floor((Date.now() - new Date(savedSession.startTime).getTime()) / 1000);
            setElapsedSeconds(elapsed > 0 ? elapsed : 0);
          } else {
            localStorage.removeItem(activeSessionKey);
          }
        } catch (e) {
          console.error("Failed to restore active session", e);
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
      const todayDow = now.getDay();
      const isWknd = todayDow === 0 || todayDow === 6;
      const skipBehindCheck = isWknd && !followWeekendTimetable;

      // Find active task
      const current = schedule.find(t => {
        const tDow = (t as any).dayOfWeek !== undefined ? (t as any).dayOfWeek : (t as any).day_of_week;
        if (tDow !== undefined && tDow !== todayDow) return false;

        const tStart = (t as any).start || (t as any).timeStart;
        const tEnd = (t as any).end || (t as any).timeEnd;
        if (!tStart || !tEnd) return false;
        const start = parseTime(tStart);
        const end = parseTime(tEnd);
        return now >= start && now <= end;
      });

      if (current) {
        setActiveTask(current);
        if (executedTaskIds.some(id => String(id) === String(current.id))) {
          setSystemState('optimal');
        } else {
          if (skipBehindCheck) {
            setSystemState('optimal');
          } else {
            const previousTasks = schedule.filter(t => {
               const tDow = (t as any).dayOfWeek !== undefined ? (t as any).dayOfWeek : (t as any).day_of_week;
               if (tDow !== undefined && tDow !== todayDow) return false;

               const tE = (t as any).end || (t as any).timeEnd;
               return tE ? parseTime(tE) < now : false;
            });
            const missedPrevious = previousTasks.some(t => !executedTaskIds.some(id => String(id) === String(t.id)));
            setSystemState(missedPrevious ? 'behind' : 'optimal');
          }
        }
      } else {
        setActiveTask(null);
        if (skipBehindCheck) {
          setSystemState('idle');
        } else {
          const previousTasks = schedule.filter(t => {
               const tDow = (t as any).dayOfWeek !== undefined ? (t as any).dayOfWeek : (t as any).day_of_week;
               if (tDow !== undefined && tDow !== todayDow) return false;

               const tE = (t as any).end || (t as any).timeEnd;
               return tE ? parseTime(tE) < now : false;
          });
          const missedPrevious = previousTasks.some(t => !executedTaskIds.some(id => String(id) === String(t.id)));
          setSystemState(missedPrevious ? 'behind' : 'idle');
        }
      }

    }, 1000);
    return () => clearInterval(timer);
  }, [executedTaskIds, schedule, followWeekendTimetable]);

  const settingsFollow = progressionState?.settings?.followWeekendTimetable;
  useEffect(() => {
    if (settingsFollow !== undefined) {
      setFollowWeekendTimetable(settingsFollow);
    }
  }, [settingsFollow]);

  const handleToggleWeekendFollow = async (val: boolean) => {
    audio.playClick();
    setFollowWeekendTimetable(val);
    const activeUid = userId || 'default';
    localStorage.setItem(`quantum_weekend_follow_${activeUid}`, val.toString());
    if (activeUid !== 'default' && supabase) {
      await updateProfile({
        settings: {
          ...progressionState.settings,
          followWeekendTimetable: val
        }
      });
    }
  };

  // Session timer counting elapsed seconds
  useEffect(() => {
    let timerId: any = null;
    if (isSessionActive && sessionStartTime) {
      timerId = setInterval(() => {
        const secs = Math.floor((Date.now() - new Date(sessionStartTime).getTime()) / 1000);
        setElapsedSeconds(secs > 0 ? secs : 0);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isSessionActive, sessionStartTime]);

  // Handle task change notifications
  useEffect(() => {
    if (activeTask) {
      const storedLast = localStorage.getItem(`quantum_last_notified_task_${userId}`);
      if (storedLast !== activeTask.id.toString()) {
        const start = parseTime(activeTask.start);
        const timeDiff = Math.abs(Date.now() - start.getTime());
        const isJustStarted = timeDiff <= 120000; // 2 minutes
        const wasTransition = storedLast && storedLast !== "";

        if (isJustStarted || wasTransition) {
          notifier.send(
            "Protocol Shift",
            `Commencing: ${activeTask.title}`
          );
        }
        localStorage.setItem(`quantum_last_notified_task_${userId}`, activeTask.id.toString());
      }
    }
  }, [activeTask, userId]);

  const handleStartSession = () => {
    audio.playClick();
    if (!activeTask) return;
    const startIso = new Date().toISOString();
    setSessionStartTime(startIso);
    setIsSessionActive(true);
    setElapsedSeconds(0);

    const activeSessionKey = `quantum_active_session_${userId}`;
    localStorage.setItem(activeSessionKey, JSON.stringify({
      taskId: activeTask.id,
      startTime: startIso,
      date: getTodayString()
    }));
  };

  const handleComplete = async () => {
    if (!activeTask) return;
    if (endReason.trim().length < 5) {
      setEndError('A valid reason (minimum 5 characters) is required to log the session.');
      return;
    }

    // 1. Calculate Base XP
    let baseXp = 30;
    const tTarget = (activeTask as any).task_target;
    if (tTarget === 'High') baseXp = 100;
    else if (tTarget === 'Medium') baseXp = 60;
    else if (tTarget === 'Low') baseXp = 40;

    // Calculate duration in minutes
    const tStart = (activeTask as any).start || (activeTask as any).timeStart;
    const tEnd = (activeTask as any).end || (activeTask as any).timeEnd;
    const startMs = parseTime(tStart).getTime();
    const endMs = parseTime(tEnd).getTime();
    const scheduledDuration = Math.max(1, Math.round((endMs - startMs) / 60000));
    const durationSpent = Math.max(1, Math.round(elapsedSeconds / 60));

    // Calculate final XP
    let earnedXp = baseXp;
    if (endStatus === 'left_midway') {
      earnedXp = Math.max(10, Math.min(baseXp, Math.round((durationSpent / scheduledDuration) * baseXp)));
    }

    // Weekend 2x points
    const todayDow = new Date().getDay();
    const isWknd = todayDow === 0 || todayDow === 6;
    if (isWknd && followWeekendTimetable) {
      earnedXp = earnedXp * 2;
    }

    audio.playSuccess();

    // 2. Claim Timetable XP
    const { awarded, xpEarned } = await claimTimetableTaskXp(
      String(activeTask.id),
      (activeTask as any).pillar || 'Mind',
      `Routine Task: ${activeTask.title}`,
      earnedXp
    );

    const todayStr = getTodayString();
    
    // Retrieve correct active user ID directly to avoid stale state bugs
    let activeUid = userId || 'default';
    if (supabase && activeUid === 'default') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) activeUid = session.user.id;
    }

    // 3. Log detailed session to profiles settings
    const logEntry = {
      id: Math.random().toString(36).substring(2),
      task_id: String(activeTask.id),
      title: activeTask.title,
      pillar: (activeTask as any).pillar || 'Mind',
      scheduled_start: activeTask.start,
      scheduled_end: activeTask.end,
      scheduled_duration: scheduledDuration,
      started_at: sessionStartTime || new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_spent: durationSpent,
      status: endStatus,
      reason: endReason.trim(),
      xp_earned: awarded ? xpEarned : 0,
      date: todayStr
    };

    const currentLogs = progressionState?.settings?.execution_logs || [];
    await updateProfile({
      settings: {
        ...progressionState.settings,
        execution_logs: [...currentLogs, logEntry]
      }
    });

    const updated = [...executedTaskIds, activeTask.id];
    console.log("[EngineCard] Saving executed task ID:", activeTask.id, "to updated list:", updated);
    setExecutedTaskIds(updated);

    // Scoped storage
    const storageKey = `quantum_exec_${activeUid}_${todayStr}`;
    console.log("[EngineCard] Writing to local storage under key:", storageKey, "value:", updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // Clear active session
    const activeSessionKey = `quantum_active_session_${activeUid}`;
    localStorage.removeItem(activeSessionKey);

    setIsSessionActive(false);
    setSessionStartTime(null);
    setElapsedSeconds(0);
    setShowEndModal(false);
    setEndReason('');
    setEndError('');

    // Supabase Sync
    if (supabase && activeUid !== 'default') {
      const payload: any = {
        task_id: String(activeTask.id),
        date_string: todayStr,
        user_id: activeUid
      };
      console.log("[EngineCard] Syncing execution to Supabase with payload:", payload);
      
      const { error: execErr } = await supabase.from('executions').insert([payload]);
      if (execErr) {
        console.error("[EngineCard] Supabase executions sync failed:", execErr);
      }

      // Sync to daily_completions too so it shows done on TimetableHub!
      try {
        const { error: compErr } = await supabase.from('daily_completions').insert([{
          user_id: activeUid,
          date: todayStr,
          task_id: String(activeTask.id),
          completed: true,
          completed_at: new Date().toISOString()
        }]);
        if (compErr) {
          console.error("[EngineCard] Supabase daily_completions sync failed:", compErr);
        }
      } catch (e) {
        console.error("Failed to sync to daily_completions:", e);
      }
    }

    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 2000);
  };

  const attemptSkip = async () => {
    audio.playClick();
    if (skipReason.trim().length < 5) {
      setSkipError('A valid reason is required for system override.');
      return;
    }

    const todayStr = getTodayString();
    const dbSettings = progressionState?.settings || {};
    let skips: SkipRecord[] = [];
    if (dbSettings.skips) {
      skips = dbSettings.skips;
    } else {
      const skipsStr = localStorage.getItem(`quantum_skips_${userId}`);
      if (skipsStr) {
        try { skips = JSON.parse(skipsStr); } catch (e) {}
      }
    }

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
    const updatedSkips = [...skips, newSkip];
    localStorage.setItem(`quantum_skips_${userId}`, JSON.stringify(updatedSkips));
    if (userId !== 'default' && supabase) {
      await updateProfile({
        settings: {
          ...progressionState.settings,
          skips: updatedSkips
        }
      });
    }

    setIsSkippedToday(true);
    setSkipModalOpen(false);
  };

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

  const isCompleted = activeTask ? executedTaskIds.some(id => String(id) === String(activeTask.id)) : false;

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

  const tStart = activeTask ? ((activeTask as any).start || (activeTask as any).timeStart) : '00:00';
  const tEnd = activeTask ? ((activeTask as any).end || (activeTask as any).timeEnd) : '00:00';
  let scheduledDuration = 30;
  if (activeTask) {
    try {
      const startMs = parseTime(tStart).getTime();
      const endMs = parseTime(tEnd).getTime();
      scheduledDuration = Math.max(1, Math.round((endMs - startMs) / 60000));
    } catch (e) {}
  }
  const durationSpent = Math.max(1, Math.round(elapsedSeconds / 60));

  const nextTask = (() => {
    const now = currentTime;
    const todayDow = now.getDay();
    const todayTasks = schedule.filter(t => {
      const tDow = (t as any).dayOfWeek !== undefined ? (t as any).dayOfWeek : (t as any).day_of_week;
      return tDow === undefined || tDow === todayDow;
    });
    if (todayTasks.length === 0) return null;
    const sorted = [...todayTasks].sort((a, b) => {
      return parseTime(a.start || (a as any).timeStart).getTime() - parseTime(b.start || (b as any).timeStart).getTime();
    });
    const next = sorted.find(t => parseTime(t.start || (t as any).timeStart) > now);
    return next || sorted[0];
  })();

  const progress = isSessionActive 
    ? Math.min(100, (elapsedSeconds / (scheduledDuration * 60)) * 100)
    : 0;

  const timeRemaining = isSessionActive
    ? `Focus Countdown: ${Math.max(0, scheduledDuration - Math.floor(elapsedSeconds / 60))}m remaining`
    : nextTask 
      ? `Next Sequence: ${nextTask.title} at ${nextTask.start || (nextTask as any).timeStart}`
      : 'Awaiting next sequence...';
  
  let baseXp = 30;
  if (activeTask) {
    const tTarget = (activeTask as any).task_target;
    if (tTarget === 'High') baseXp = 100;
    else if (tTarget === 'Medium') baseXp = 60;
    else if (tTarget === 'Low') baseXp = 40;
  }
  
  let projectedXp = baseXp;
  if (endStatus === 'left_midway') {
    projectedXp = Math.max(10, Math.min(baseXp, Math.round((durationSpent / scheduledDuration) * baseXp)));
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

      {/* Weekend Timetable Follow Toggle */}
      {(() => {
        const todayDow = new Date().getDay();
        const isWknd = todayDow === 0 || todayDow === 6;
        if (!isWknd) return null;
        return (
          <div className="mb-4 p-3 bg-surfaceHighlight/30 border border-border rounded-xl flex items-center justify-between z-10">
            <div>
              <p className="text-xs font-bold text-textMain">Weekend Protocol</p>
              <p className="text-[9px] text-textMuted uppercase font-medium">Follow timetable for 2x XP points</p>
            </div>
            <div className="flex gap-1 bg-surfaceHighlight p-1 rounded-lg border border-border">
              <button
                onClick={() => handleToggleWeekendFollow(true)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                  followWeekendTimetable 
                    ? "bg-primary/20 text-primary border border-primary/30" 
                    : "text-textMuted hover:text-textMain border border-transparent"
                )}
              >
                Follow (2x XP)
              </button>
              <button
                onClick={() => handleToggleWeekendFollow(false)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                  !followWeekendTimetable 
                    ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/30" 
                    : "text-textMuted hover:text-textMain border border-transparent"
                )}
              >
                Relax Mode
              </button>
            </div>
          </div>
        );
      })()}

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
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h3 className="text-lg md:text-2xl font-bold text-textMain line-clamp-1">{activeTask ? activeTask.title : 'No Active Task'}</h3>
              {activeTask && (
                <span className="text-[10px] md:text-xs font-mono font-black text-primary px-2.5 py-0.5 bg-primary/10 border border-primary/25 rounded-lg shrink-0">
                  {activeTask.start} - {activeTask.end}
                </span>
              )}
            </div>
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
              {isSessionActive ? (
                <div className="animate-pulse">
                  <p className="text-xl md:text-3xl font-black text-emerald-400 font-mono tracking-widest">
                    {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:
                    {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:
                    {String(elapsedSeconds % 60).padStart(2, '0')}
                  </p>
                  <p className="text-[9px] md:text-sm text-emerald-400/80 uppercase font-bold tracking-widest">Session Timer Active</p>
                </div>
              ) : (
                <div>
                  <p className="text-xl md:text-3xl font-black text-textMain">{Math.floor(progress)}%</p>
                  <p className="text-[9px] md:text-sm text-textMuted uppercase font-bold tracking-widest">Progress</p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isSessionActive ? (
                <button
                  onClick={() => {
                    audio.playClick();
                    setEndReason('');
                    setEndStatus('completed');
                    setShowEndModal(true);
                  }}
                  className="py-2 px-4 md:py-3 md:px-6 text-xs md:text-base rounded-xl font-black uppercase tracking-widest transition-all bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                >
                  End Session
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  disabled={!activeTask || isCompleted}
                  className={`py-2 px-4 md:py-3 md:px-6 text-xs md:text-base rounded-xl font-black uppercase tracking-widest transition-all ${isCompleted
                    ? 'bg-surfaceHighlight text-textMuted border border-white/5 cursor-not-allowed'
                    : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 animate-[pulse_2s_infinite]'
                    }`}
                >
                  {isCompleted ? 'Done' : 'Start Focus'}
                </button>
              )}

              <button
                onClick={() => setSkipModalOpen(true)}
                disabled={isCompleted || isSessionActive}
                className="p-2 md:p-3 bg-surfaceHighlight text-textMuted rounded-xl border border-border disabled:opacity-40"
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
              className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin"
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

      {/* Session Termination Modal */}
      <AnimatePresence>
        {showEndModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <button
                onClick={() => setShowEndModal(false)}
                className="absolute top-4 right-4 text-textMuted hover:text-textMain"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-primary mb-2 flex items-center uppercase tracking-tighter">
                <Target className="mr-2 text-primary animate-pulse" /> Focus Session Log
              </h3>
              <p className="text-xs text-textMuted mb-4">
                Record outcome and log details for cloud progression.
              </p>

              {endError && (
                <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 font-bold">
                  {endError}
                </div>
              )}

              <div className="space-y-4">
                {/* Status Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-textMuted tracking-wider mb-2">Outcome Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { audio.playClick(); setEndStatus('completed'); }}
                      className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                        endStatus === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                          : 'bg-background border-border text-textMuted hover:border-white/10'
                      }`}
                    >
                      🎯 Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => { audio.playClick(); setEndStatus('left_midway'); }}
                      className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                        endStatus === 'left_midway'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : 'bg-background border-border text-textMuted hover:border-white/10'
                      }`}
                    >
                      ⚠️ Left Midway
                    </button>
                  </div>
                </div>

                {/* Session details breakdown card */}
                <div className="p-3 bg-surfaceHighlight/50 border border-border rounded-xl space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-textMuted">Task:</span>
                    <span className="font-bold text-textMain">{activeTask?.title}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-textMuted">Scheduled Time:</span>
                    <span className="font-bold text-textMain">{scheduledDuration} mins</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-textMuted">Time Spent:</span>
                    <span className="font-bold text-textMain font-mono">
                      {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
                    </span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between text-xs items-center">
                    <span className="font-bold text-textMuted uppercase text-[10px]">Projected XP:</span>
                    <span className="font-black text-primary text-sm font-mono">+{projectedXp} XP</span>
                  </div>
                </div>

                {/* Reason justification */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-textMuted tracking-wider mb-1">Session Summary / Reason</label>
                  <textarea
                    value={endReason}
                    onChange={(e) => setEndReason(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none h-20 placeholder:text-white/10"
                    placeholder="Provide details on what you achieved or why you had to leave..."
                  />
                  <p className="text-[9px] text-textMuted uppercase mt-1">Minimum 5 characters required.</p>
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full py-3 bg-primary/20 text-primary hover:bg-primary hover:text-white border border-primary/50 rounded-xl text-xs font-black uppercase tracking-widest transition-all mt-2"
                >
                  Terminate & Sync Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
