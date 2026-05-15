import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Check, Copy, Zap, Calendar,
  Dumbbell, BookOpen, Briefcase, Brain, Star, ChevronDown
} from 'lucide-react';
import { useTimetable } from '../hooks/useTimetable';
import { useProgression } from '../hooks/useProgression';
import toast from 'react-hot-toast';
import type { DayOfWeek, TaskCategory } from '../hooks/useTimetable';

const DAYS = [
  { label: 'Sun', short: 'S', dow: 0 as DayOfWeek, weekend: true },
  { label: 'Mon', short: 'M', dow: 1 as DayOfWeek, weekend: false },
  { label: 'Tue', short: 'T', dow: 2 as DayOfWeek, weekend: false },
  { label: 'Wed', short: 'W', dow: 3 as DayOfWeek, weekend: false },
  { label: 'Thu', short: 'T', dow: 4 as DayOfWeek, weekend: false },
  { label: 'Fri', short: 'F', dow: 5 as DayOfWeek, weekend: false },
  { label: 'Sat', short: 'S', dow: 6 as DayOfWeek, weekend: true },
];

const CATEGORIES: { id: TaskCategory; label: string; icon: any; pillar: string; color: string }[] = [
  { id: 'gym',   label: 'Gym',   icon: Dumbbell,  pillar: 'Health',  color: 'text-emerald-400' },
  { id: 'study', label: 'Study', icon: BookOpen,   pillar: 'Study',   color: 'text-blue-400'    },
  { id: 'work',  label: 'Work',  icon: Briefcase,  pillar: 'Finance', color: 'text-amber-400'   },
  { id: 'mind',  label: 'Mind',  icon: Brain,      pillar: 'Mind',    color: 'text-purple-400'  },
  { id: 'other', label: 'Other', icon: Star,       pillar: 'Mind',    color: 'text-gray-400'    },
];

const TIER_CONFIG = {
  none:        { label: 'No Bonus',    color: 'text-textMuted',  bg: 'bg-surfaceHighlight' },
  partial:     { label: 'Partial +25%',color: 'text-amber-400',  bg: 'bg-amber-500/10'     },
  disciplined: { label: '80% Bonus!',  color: 'text-blue-400',   bg: 'bg-blue-500/10'      },
  perfect:     { label: '100% Perfect!',color:'text-emerald-400', bg: 'bg-emerald-500/10'   },
};

const BADGE_LABELS: Record<string, string> = {
  disciplined:    '🎯 Disciplined',
  perfectionist:  '⚡ Perfectionist',
  weekend_warrior:'🏆 Weekend Warrior',
  gym_beast:      '💪 Gym Beast',
  scholar:        '📚 Scholar',
  work_titan:     '💼 Work Titan',
  mindful:        '🧘 Mindful',
};

export function TimetableHub() {
  const { state, addXp } = useProgression();

  // Get userId from supabase session via progression context workaround
  const [supaUserId] = useState<string | null>(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('quantum_buffs_'));
    return key ? key.replace('quantum_buffs_', '') : null;
  });

  const {
    tasks, completions, badges, loading, todayStats,
    isWeekend, addTask, deleteTask, copyDayToDay, toggleCompletion, claimDayBonus
  } = useTimetable(supaUserId);

  const [activeDay, setActiveDay] = useState<DayOfWeek>(new Date().getDay() as DayOfWeek);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Add form state
  const [newName, setNewName]           = useState('');
  const [newCategory, setNewCategory]   = useState<TaskCategory>('study');
  const [newDuration, setNewDuration]   = useState(30);

  const dayTasks = tasks.filter(t => t.day_of_week === activeDay);
  const isToday  = activeDay === (new Date().getDay() as DayOfWeek);
  const isActiveWeekend = activeDay === 0 || activeDay === 6;
  const tier     = TIER_CONFIG[todayStats.tier];

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const cat = CATEGORIES.find(c => c.id === newCategory)!;
    await addTask({
      name: newName.trim(),
      category: newCategory,
      pillar: cat.pillar as any,
      duration_minutes: newDuration,
      day_of_week: activeDay,
      is_weekend: isActiveWeekend,
      order_index: dayTasks.length,
    });
    setNewName(''); setShowAddForm(false);
    toast.success('Task added!');
  };

  const handleCopy = async (toDay: DayOfWeek) => {
    await copyDayToDay(activeDay, toDay);
    setShowCopyMenu(false);
    toast.success(`Copied to ${DAYS[toDay].label}`);
  };

  const handleClaim = async () => {
    if (todayStats.tier === 'none') {
      toast.error('Complete at least 50% of tasks to earn a bonus.');
      return;
    }
    setClaiming(true);
    await claimDayBonus(addXp);
    setClaiming(false);
    toast.success(`🎉 ${tier.label} XP claimed!`, { duration: 4000 });
  };

  return (
    <div className="flex-1 h-full flex flex-col p-4 sm:p-6 overflow-y-auto scrollbar-thin">
      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Calendar size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-textMain uppercase tracking-tighter">Timetable Hub</h1>
              <p className="text-[10px] text-textMuted uppercase tracking-widest">Discipline Engine · Daily Mastery</p>
            </div>
          </div>

          {/* Today's bonus status */}
          {isToday && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${tier.bg} border-white/10`}>
              <Zap size={16} className={tier.color} />
              <div>
                <p className={`text-xs font-black ${tier.color}`}>{tier.label}</p>
                <p className="text-[10px] text-textMuted">{todayStats.done}/{todayStats.total} tasks · {todayStats.pct}%</p>
              </div>
              {isWeekend && <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">2× WEEKEND</span>}
              <button
                onClick={handleClaim}
                disabled={claiming || todayStats.tier === 'none'}
                className="ml-2 px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
              >
                {claiming ? '…' : 'Claim'}
              </button>
            </div>
          )}
        </div>

        {/* Day selector */}
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-none">
          {DAYS.map(day => {
            const count = tasks.filter(t => t.day_of_week === day.dow).length;
            const isActive = activeDay === day.dow;
            return (
              <button
                key={day.dow}
                onClick={() => setActiveDay(day.dow)}
                className={`shrink-0 flex flex-col items-center px-3 sm:px-5 py-3 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'bg-surface border-border text-textMuted hover:border-white/20'
                } ${day.weekend ? 'ring-1 ring-amber-500/20' : ''}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{day.label}</span>
                <span className="text-lg font-black">{day.short}</span>
                {count > 0 && <span className="text-[9px] mt-0.5">{count} tasks</span>}
                {day.weekend && <span className="text-[8px] text-amber-400 font-bold">2×</span>}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-textMuted uppercase tracking-widest">
                {DAYS[activeDay].label} Tasks {isActiveWeekend && <span className="text-amber-400">· Optional (2×)</span>}
              </h3>
              <div className="flex gap-2">
                {/* Copy menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowCopyMenu(!showCopyMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-textMuted hover:border-white/20 text-[10px] font-bold transition-all"
                  >
                    <Copy size={12} /> Copy <ChevronDown size={10} />
                  </button>
                  <AnimatePresence>
                    {showCopyMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-xl p-2 flex flex-col gap-1 shadow-xl"
                      >
                        {DAYS.filter(d => d.dow !== activeDay).map(d => (
                          <button
                            key={d.dow}
                            onClick={() => handleCopy(d.dow)}
                            className="px-4 py-1.5 text-left text-xs font-bold text-textMuted hover:text-textMain hover:bg-surfaceHighlight rounded-lg transition-all"
                          >
                            Copy to {d.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                >
                  <Plus size={12} /> Add Task
                </button>
              </div>
            </div>

            {/* Add form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-surface rounded-2xl border border-primary/20 space-y-3">
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      placeholder="Task name (e.g. Morning run, Read 30 mins)..."
                      className="w-full bg-surfaceHighlight border border-white/10 rounded-xl px-4 py-2.5 text-sm text-textMain focus:border-primary outline-none placeholder:text-white/20"
                    />
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setNewCategory(c.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            newCategory === c.id
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-surfaceHighlight border-white/10 text-textMuted hover:border-white/20'
                          }`}
                        >
                          <c.icon size={10} /> {c.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-bold text-textMuted uppercase tracking-widest shrink-0">Duration</label>
                      <input
                        type="range" min="5" max="180" step="5"
                        value={newDuration}
                        onChange={e => setNewDuration(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-xs font-bold text-textMain w-14 text-right">{newDuration} min</span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-[10px] font-black uppercase text-textMuted hover:text-textMain transition-colors">Cancel</button>
                      <button onClick={handleAdd} className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Add</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task list */}
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-surface rounded-2xl border border-border animate-pulse" />)}
              </div>
            ) : dayTasks.length === 0 ? (
              <div className="text-center py-12 text-textMuted">
                <Calendar size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">No tasks for {DAYS[activeDay].label}</p>
                <p className="text-xs opacity-60 mt-1">Click "Add Task" to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayTasks.map(task => {
                  const cat = CATEGORIES.find(c => c.id === task.category) || CATEGORIES[4];
                  const isCompleted = isToday && completions.find(c => c.task_id === task.id && c.completed);
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                        isCompleted
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-surface border-border hover:border-white/10'
                      }`}
                    >
                      {isToday && (
                        <button
                          onClick={() => toggleCompletion(task.id)}
                          className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-border hover:border-emerald-400'
                          }`}
                        >
                          {isCompleted && <Check size={13} />}
                        </button>
                      )}
                      <cat.icon size={16} className={cat.color} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isCompleted ? 'line-through text-textMuted' : 'text-textMain'}`}>
                          {task.name}
                        </p>
                        <p className="text-[10px] text-textMuted">{cat.label} · {task.duration_minutes} min · {task.pillar}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-textMuted hidden sm:block">
                          ~{Math.round(task.duration_minutes * 0.5)} XP base
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-textMuted transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar: Progress + Badges */}
          <div className="space-y-4">
            {/* Today ring */}
            {isToday && (
              <div className="glass-panel p-5 rounded-2xl space-y-3">
                <h4 className="text-[10px] font-black text-textMuted uppercase tracking-widest">Today's Progress</h4>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="5" className="text-surfaceHighlight" />
                      <circle
                        cx="28" cy="28" r="24" fill="none" strokeWidth="5"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - todayStats.pct / 100)}`}
                        className={`${todayStats.pct >= 100 ? 'text-emerald-400' : todayStats.pct >= 80 ? 'text-primary' : 'text-amber-400'} transition-all duration-700`}
                        strokeLinecap="round"
                        stroke="currentColor"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-black text-textMain">{todayStats.pct}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-textMain">{todayStats.done}/{todayStats.total}</p>
                    <p className="text-[10px] text-textMuted">Tasks done</p>
                    <p className={`text-[10px] font-black mt-1 ${tier.color}`}>{tier.label}</p>
                    {isWeekend && <p className="text-[10px] text-amber-400 font-bold">Weekend 2× Active</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Badges */}
            <div className="glass-panel p-5 rounded-2xl">
              <h4 className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-3">Discipline Badges</h4>
              {badges.length === 0 ? (
                <p className="text-[11px] text-textMuted opacity-60">Complete 80%+ of your daily tasks to earn badges!</p>
              ) : (
                <div className="space-y-2">
                  {badges.map(b => (
                    <div key={b.badge_type} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-textMain">{BADGE_LABELS[b.badge_type] || b.badge_type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-textMuted">{b.count}×</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          b.tier === 'platinum' ? 'bg-cyan-500/20 text-cyan-400' :
                          b.tier === 'gold'     ? 'bg-yellow-500/20 text-yellow-400' :
                          b.tier === 'silver'   ? 'bg-gray-400/20 text-gray-300' :
                                                  'bg-amber-700/20 text-amber-600'
                        }`}>{b.tier}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bonus guide */}
            <div className="glass-panel p-5 rounded-2xl">
              <h4 className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-3">Bonus XP Guide</h4>
              <div className="space-y-2 text-[10px]">
                {[
                  { label: '50–79% done', wd: '+25%', we: '+50%', color: 'text-amber-400' },
                  { label: '80–99% done', wd: '+50%', we: '+100%', color: 'text-blue-400' },
                  { label: '100% perfect', wd: '+100%', we: '+200%', color: 'text-emerald-400' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-textMuted">{r.label}</span>
                    <div className="flex gap-2">
                      <span className={`font-black ${r.color}`}>{r.wd}</span>
                      <span className="text-amber-400 font-black">{r.we} wknd</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
