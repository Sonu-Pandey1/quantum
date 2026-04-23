import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, AlertTriangle, Image as ImageIcon, X, PauseCircle, CheckCircle, Play, SkipForward, Bell } from 'lucide-react';
import { audio } from '../lib/audio';
import { notifier } from '../lib/notifications';
import { supabase } from '../lib/supabaseClient';
import { useProgression } from '../hooks/useProgression';

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
  { id: 1, start: '05:00', end: '05:45', title: 'Wake Up & Refresh', statusMsg: 'System Initialization...' },
  { id: 2, start: '05:45', end: '07:15', title: 'The Burn (Run 5km + 100 Pushups)', statusMsg: 'Physical Output Maximize...' },
  { id: 3, start: '08:30', end: '17:30', title: 'Office Mission (Work & Communication)', statusMsg: 'Corporate Directive Active...' },
  { id: 4, start: '18:10', end: '21:00', title: 'Deep Study (SAP ABAP Mastery)', statusMsg: 'Logic Building in Progress...' },
  { id: 5, start: '21:00', end: '22:00', title: 'Recovery (Dinner & Night Walk)', statusMsg: 'Nutritional Intake & Decompression...' },
  { id: 6, start: '22:00', end: '23:59', title: 'Final Grind & System Review', statusMsg: 'Protocol Review & Shut Down...' },
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

  // Load state on mount
  useEffect(() => {
    const todayStr = getTodayString();

    // Load skips
    const skipsStr = localStorage.getItem('quantum_skips');
    if (skipsStr) {
      const skips: SkipRecord[] = JSON.parse(skipsStr);
      if (skips.some(s => s.date === todayStr)) {
        setIsSkippedToday(true);
      }
    }

    // Load executed
    const loadExecutions = async () => {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('executions')
            .select('task_id')
            .eq('date_string', todayStr);

          if (data && data.length > 0) {
            setExecutedTaskIds(data.map(d => d.task_id));
            return;
          }
        } catch (e) {
          console.error("Supabase sync failed, falling back to local.");
        }
      }
      // Fallback
      const execStr = localStorage.getItem(`quantum_exec_${todayStr}`);
      if (execStr) {
        setExecutedTaskIds(JSON.parse(execStr));
      }
    };

    loadExecutions();
  }, []);

  // Time loop
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Find active task
      const current = SCHEDULE.find(task => {
        const start = parseTime(task.start);
        const end = parseTime(task.end);
        return now >= start && now <= end;
      });

      if (current) {
        setActiveTask(current);
        const start = parseTime(current.start).getTime();
        const end = parseTime(current.end).getTime();
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
          const previousTasks = SCHEDULE.filter(t => parseTime(t.end) < now);
          const missedPrevious = previousTasks.some(t => !executedTaskIds.includes(t.id));
          setSystemState(missedPrevious ? 'behind' : 'optimal');
        }
      } else {
        setActiveTask(null);
        setProgress(0);
        setTimeRemaining('Awaiting next sequence...');

        const previousTasks = SCHEDULE.filter(t => parseTime(t.end) < now);
        const missedPrevious = previousTasks.some(t => !executedTaskIds.includes(t.id));
        setSystemState(missedPrevious ? 'behind' : 'idle');
      }

    }, 1000);
    return () => clearInterval(timer);
  }, [executedTaskIds]);

  // Handle task change notifications
  useEffect(() => {
    if (activeTask) {
      const storedLast = localStorage.getItem('quantum_last_notified_task');
      if (storedLast !== activeTask.id.toString()) {
        notifier.send(
          "Protocol Shift",
          `Commencing: ${activeTask.title}`
        );
        localStorage.setItem('quantum_last_notified_task', activeTask.id.toString());
      }
    }
  }, [activeTask]);

  const handleComplete = async () => {
    audio.playSuccess();
    if (!activeTask) return;

    addXp('Mind', `Routine Task: ${activeTask.title}`, 5);

    const todayStr = getTodayString();
    const updated = [...executedTaskIds, activeTask.id];
    setExecutedTaskIds(updated);

    // Local fallback
    localStorage.setItem(`quantum_exec_${todayStr}`, JSON.stringify(updated));

    // Supabase Sync
    if (supabase) {
      try {
        await supabase.from('executions').insert([{
          task_id: activeTask.id,
          date_string: todayStr
        }]);
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
    const skipsStr = localStorage.getItem('quantum_skips');
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
    localStorage.setItem('quantum_skips', JSON.stringify([...skips, newSkip]));

    setIsSkippedToday(true);
    setSkipModalOpen(false);
  };

  const isSunday = new Date().getDay() === 0;

  // Sunday Rest View
  if (isSunday) {
    return (
      <div className="glass-panel col-span-1 md:col-span-2 lg:col-span-3 row-span-2 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden bg-emerald-950/20">
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
      <div className="glass-panel col-span-1 md:col-span-2 lg:col-span-3 row-span-2 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden bg-amber-950/20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-400 opacity-50" />
        <AlertTriangle size={64} className="text-amber-500 mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-textMain mb-2">Protocol Skipped</h2>
        <p className="text-amber-400 font-medium mb-1">System Override Logged</p>
        <p className="text-sm text-textMuted">Rest day utilized. Return stronger tomorrow.</p>
      </div>
    );
  }

  const isCompleted = activeTask ? executedTaskIds.includes(activeTask.id) : false;

  return (
    <div className={`h-full p-6 flex flex-col relative overflow-hidden transition-all duration-500 ${activeTask && !isCompleted ? 'animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}>

      {/* Decorative Icon */}
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Target size={150} />
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
              <CheckCircle2 size={100} className="text-emerald-500" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start mb-6 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary/20 rounded-xl relative">
            <Target className="text-primary" size={24} />
            {activeTask && !isCompleted && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-textMain">The Engine</h2>
            <p className="text-xs text-primary font-medium tracking-wide mt-1 uppercase">Action-First Protocol</p>
          </div>
        </div>

        {/* System Tags */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              audio.playClick();
              notifier.requestPermission();
            }}
            className="px-2 py-1 bg-surfaceHighlight hover:bg-surface border border-border rounded-md text-textMuted hover:text-textMain flex items-center transition-colors"
            title="Enable Notifications"
          >
            <Bell size={14} />
          </button>
          {systemState === 'optimal' && (
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-md flex items-center">
              <CheckCircle size={14} className="mr-1.5" /> System Optimal
            </div>
          )}
          {systemState === 'behind' && (
            <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-md flex items-center">
              <AlertTriangle size={14} className="mr-1.5" /> Critical Delay
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end z-10 relative">
        <div className="space-y-4">

          <div className="flex flex-col mb-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-textMuted mb-1">
                Status: <span className="text-textMain">{activeTask ? activeTask.statusMsg : 'Idle / Off-Duty'}</span>
              </span>
              <div className="font-mono text-3xl font-bold text-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.9)] tracking-wider">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-textMain">{activeTask ? activeTask.title : 'No Active Task'}</h3>
            <p className="text-lg font-bold text-primary animate-pulse mt-2 bg-primary/10 inline-block px-3 py-1 rounded-md w-max border border-primary/20">
              {timeRemaining}
            </p>
          </div>

          <div className="w-full bg-surfaceHighlight rounded-full h-4 mb-2 overflow-hidden relative shadow-inner">
            <motion.div
              className="bg-primary h-4 rounded-full relative shadow-[0_0_20px_rgba(59,130,246,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "linear" }}
            >
              {activeTask && !isCompleted && (
                <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-white/60 animate-pulse" />
              )}
            </motion.div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
            <div>
              <p className="text-3xl font-bold text-textMain">{Math.floor(progress)}%</p>
              <p className="text-sm text-textMuted mt-1">Current Protocol Progress</p>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={handleComplete}
                onMouseEnter={() => audio.playClick()}
                disabled={!activeTask || isCompleted}
                className={`flex-1 py-3 px-4 sm:px-6 text-sm sm:text-base rounded-xl font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${isCompleted
                    ? 'bg-surfaceHighlight text-textMuted cursor-not-allowed border border-border'
                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:border-blue-500/60 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                  }`}
              >
                <Play size={18} className="mr-2" /> {isCompleted ? 'Executed' : 'Execute'}
              </button>

              <button
                onClick={() => setSkipModalOpen(true)}
                onMouseEnter={() => audio.playClick()}
                className="px-6 py-3 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-textMuted hover:text-textMain border border-border hover:border-textMuted rounded-xl font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                <SkipForward size={18} />
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
