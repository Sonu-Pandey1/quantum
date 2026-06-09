import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Sparkles, ExternalLink, ListTodo, Flame, Calendar } from 'lucide-react';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';
import { useProgression } from '../hooks/useProgression';
import { cn } from '../lib/utils';

interface TodoItem {
  id: number;
  title: string;
  dayOfWeek: number; // 0=Sun … 6=Sat
  time?: string;      // optional, e.g. "18:30"
  pillar: 'Study' | 'Health' | 'Finance' | 'Mind';
  isOneOff?: boolean;
  completed?: boolean;
  completedDates?: string[];
  task_target?: 'High' | 'Medium' | 'Low';
  xpAwarded?: boolean;
  xpAwardedDates?: string[];
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'one-off';
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pillarColors: Record<'Study' | 'Health' | 'Finance' | 'Mind', { text: string; bg: string; border: string; glow: string; textHighlight: string }> = {
  Study: {
    text: 'text-blue-400',
    textHighlight: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
  },
  Health: {
    text: 'text-emerald-400',
    textHighlight: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
  },
  Finance: {
    text: 'text-amber-400',
    textHighlight: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  },
  Mind: {
    text: 'text-purple-400',
    textHighlight: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]',
  },
};

export function TodoChecklistCard({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { addXp } = useProgression();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('default');
  const [activeTab, setActiveTab] = useState<string>(new Date().getDay().toString()); // '0'-'6' or 'one-off'
  const containerRef = useRef<HTMLDivElement>(null);

  // Load todos on mount
  useEffect(() => {
    const fetchTodos = async () => {
      let uid = 'default';
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            uid = session.user.id;
            setUserId(uid);
          }
        } catch (e) {
          console.error("Auth check failed:", e);
        }
      }

      // Load from Supabase profiles settings
      if (uid !== 'default' && supabase) {
        try {
          const { data } = await supabase.from('profiles').select('settings').eq('id', uid).single();
          if (data?.settings?.todos) {
            setTodos(data.settings.todos);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Supabase load todos failed:", e);
        }
      }

      // Local storage fallback
      const savedTodos = localStorage.getItem(`quantum_todos_${uid}`);
      if (savedTodos && savedTodos !== "undefined") {
        try {
          setTodos(JSON.parse(savedTodos));
        } catch (e) {
          console.error("Local storage parsing failed:", e);
        }
      }
      setLoading(false);
    };

    fetchTodos();
  }, []);

  // Utility to determine the most recent date of the week for a specific dayOfWeek
  const getMostRecentDateForDay = (targetDayOfWeek: number): string => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0-6
    const diff = currentDayOfWeek - targetDayOfWeek;
    const targetDate = new Date(today);
    if (diff >= 0) {
      targetDate.setDate(today.getDate() - diff);
    } else {
      targetDate.setDate(today.getDate() - (diff + 7));
    }
    return targetDate.toISOString().split('T')[0];
  };

  // Helper to resolve recurrence in a backward-compatible way
  const getRecurrence = (todo: TodoItem): 'daily' | 'weekly' | 'monthly' | 'one-off' => {
    if (todo.recurrence) return todo.recurrence;
    return todo.isOneOff ? 'one-off' : 'weekly';
  };

  // Check if a specific todo is completed
  const isCompleted = (todo: TodoItem): boolean => {
    const rec = getRecurrence(todo);
    if (rec === 'one-off') {
      return !!todo.completed;
    }
    if (rec === 'daily') {
      const todayStr = new Date().toISOString().split('T')[0];
      return !!todo.completedDates?.includes(todayStr);
    }
    if (rec === 'monthly') {
      const thisMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
      return !!todo.completedDates?.some(d => d.startsWith(thisMonthStr));
    }
    // 'weekly' (default)
    const targetDate = getMostRecentDateForDay(todo.dayOfWeek);
    return !!todo.completedDates?.includes(targetDate);
  };

  // Sync to database and localStorage
  const saveTodos = async (updatedTodos: TodoItem[]) => {
    const uid = userId || 'default';
    localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(updatedTodos));

    if (uid !== 'default' && supabase) {
      try {
        const { data } = await supabase.from('profiles').select('settings').eq('id', uid).single();
        const currentSettings = data?.settings || {};
        const updatedSettings = {
          ...currentSettings,
          todos: updatedTodos,
        };
        await supabase.from('profiles').update({ settings: updatedSettings }).eq('id', uid);
      } catch (e) {
        console.error("Failed to sync updated todos to Supabase:", e);
      }
    }
  };

  // Toggle todo completion
  const handleToggle = async (todoId: number) => {
    const todoIndex = todos.findIndex(t => t.id === todoId);
    if (todoIndex === -1) return;

    const todo = todos[todoIndex];
    const currentlyDone = isCompleted(todo);
    const updatedTodos = [...todos];

    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
    const todayDay = new Date().getDay();
    const isWeekend = todayDay === 0 || todayDay === 6;
    const rec = getRecurrence(todo);

    let shouldAwardXp = false;

    // Exploit Protection Logic: 
    // Ensure we only record one XP award per cycle.
    if (!currentlyDone) {
      if (rec === 'one-off') {
        if (!todo.xpAwarded) {
          shouldAwardXp = true;
        }
      } else if (rec === 'daily') {
        const awardedDates = todo.xpAwardedDates ? [...todo.xpAwardedDates] : [];
        if (!awardedDates.includes(todayStr)) {
          shouldAwardXp = true;
        }
      } else if (rec === 'monthly') {
        const awardedDates = todo.xpAwardedDates ? [...todo.xpAwardedDates] : [];
        if (!awardedDates.some(d => d.startsWith(thisMonthStr))) {
          shouldAwardXp = true;
        }
      } else {
        // weekly
        const targetDate = getMostRecentDateForDay(todo.dayOfWeek);
        const awardedDates = todo.xpAwardedDates ? [...todo.xpAwardedDates] : [];
        if (!awardedDates.includes(targetDate)) {
          shouldAwardXp = true;
        }
      }
    }

    if (rec === 'one-off') {
      updatedTodos[todoIndex] = {
        ...todo,
        completed: !currentlyDone,
        xpAwarded: todo.xpAwarded || shouldAwardXp,
      };
    } else if (rec === 'daily') {
      const dates = todo.completedDates ? [...todo.completedDates] : [];
      const awardedDates = todo.xpAwardedDates ? [...todo.xpAwardedDates] : [];
      if (currentlyDone) {
        updatedTodos[todoIndex] = {
          ...todo,
          completedDates: dates.filter(d => d !== todayStr),
        };
      } else {
        updatedTodos[todoIndex] = {
          ...todo,
          completedDates: [...dates, todayStr],
          xpAwardedDates: shouldAwardXp ? [...awardedDates, todayStr] : awardedDates,
        };
      }
    } else if (rec === 'monthly') {
      const dates = todo.completedDates ? [...todo.completedDates] : [];
      const awardedDates = todo.xpAwardedDates ? [...todo.xpAwardedDates] : [];
      if (currentlyDone) {
        updatedTodos[todoIndex] = {
          ...todo,
          completedDates: dates.filter(d => !d.startsWith(thisMonthStr)),
        };
      } else {
        updatedTodos[todoIndex] = {
          ...todo,
          completedDates: [...dates, todayStr],
          xpAwardedDates: shouldAwardXp ? [...awardedDates, todayStr] : awardedDates,
        };
      }
    } else {
      // weekly
      const targetDate = getMostRecentDateForDay(todo.dayOfWeek);
      const dates = todo.completedDates ? [...todo.completedDates] : [];
      const awardedDates = todo.xpAwardedDates ? [...todo.xpAwardedDates] : [];
      
      if (currentlyDone) {
        updatedTodos[todoIndex] = {
          ...todo,
          completedDates: dates.filter(d => d !== targetDate),
        };
      } else {
        updatedTodos[todoIndex] = {
          ...todo,
          completedDates: [...dates, targetDate],
          xpAwardedDates: shouldAwardXp ? [...awardedDates, todayStr] : awardedDates,
        };
      }
    }

    // Update state immediately for optimistic UI
    setTodos(updatedTodos);
    saveTodos(updatedTodos);

    if (!currentlyDone) {
      audio.playSuccess();
      if (shouldAwardXp) {
        const getBaseXp = (target?: string) => {
          if (target === 'High') return 100;
          if (target === 'Low') return 40;
          return 60; // Medium / Default
        };
        const base = getBaseXp(todo.task_target);
        const xpValue = isWeekend ? base * 2 : base;

        await addXp(todo.pillar, `Todo Completed: ${todo.title}`, xpValue);
      } else {
        import('react-hot-toast').then(({ default: toast }) => {
          toast.success("Objective Completed (XP already logged for this cycle)", { id: `dup-xp-${todo.id}`, duration: 2000 });
        });
      }
    } else {
      audio.playClick();
    }
  };

  // Format 24h clock to gorgeous 12h AM/PM
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hourStr, minStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minStr} ${ampm}`;
  };

  // Filter todos according to active tab
  const filteredTodos = todos.filter(todo => {
    const rec = getRecurrence(todo);
    if (activeTab === 'one-off') {
      return rec === 'one-off';
    } else if (activeTab === 'monthly') {
      return rec === 'monthly';
    } else {
      const activeDay = parseInt(activeTab, 10);
      return rec === 'daily' || (rec === 'weekly' && todo.dayOfWeek === activeDay);
    }
  });

  // Calculate statistics
  const totalCount = filteredTodos.length;
  const completedCount = filteredTodos.filter(isCompleted).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Render day tabs
  const renderTab = (dayIdx: number) => {
    const isCurrentDay = new Date().getDay() === dayIdx;
    const isActive = activeTab === dayIdx.toString();
    return (
      <button
        key={dayIdx}
        onClick={() => {
          audio.playClick();
          setActiveTab(dayIdx.toString());
        }}
        className={cn(
          "relative py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-300 shrink-0 select-none flex flex-col items-center justify-center min-w-[42px]",
          isActive ? "text-textMain font-extrabold" : "text-textMuted hover:text-textMain hover:bg-white/5",
          isCurrentDay && !isActive && "border border-primary/20 bg-primary/5"
        )}
      >
        <span>{DAYS_SHORT[dayIdx]}</span>
        {isCurrentDay && (
          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse" />
        )}
        {isActive && (
          <motion.div
            layoutId="activeTodoTab"
            className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-lg -z-10"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
      </button>
    );
  };

  const todayDay = new Date().getDay();
  const isWeekend = todayDay === 0 || todayDay === 6;

  return (
    <div className="h-full p-6 flex flex-col relative overflow-hidden group">
      {/* Glow effect */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary/15 rounded-xl text-primary">
            <ListTodo size={20} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-textMain tracking-tight uppercase flex items-center">
              Protocol Objectives
            </h2>
            <p className="text-[10px] text-textMuted uppercase tracking-wider font-semibold">
              Daily Routines & Checklists
            </p>
          </div>
        </div>

        {/* Edit Button to go to Control Room */}
        <button
          onClick={() => {
            audio.playClick();
            if (onNavigate) onNavigate('control_room');
          }}
          className="flex items-center space-x-1.5 text-xs text-primary hover:text-primary-hover font-bold bg-primary/5 border border-primary/15 hover:border-primary/30 px-3 py-1.5 rounded-lg transition-all duration-300 shadow-sm"
        >
          <span>Sync Room</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Progress Track */}
      <div className="mb-5 bg-white/5 border border-white/5 rounded-xl p-3.5 relative z-10 shadow-inner">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[10px] font-black uppercase text-textMuted tracking-widest">
            {activeTab === 'one-off' ? 'Objective Progress' : activeTab === 'monthly' ? 'Monthly Objectives' : `${DAYS_SHORT[parseInt(activeTab, 10)]} Protocol Progress`}
          </span>
          <span className="text-xs font-black text-primary flex items-center space-x-1 font-mono">
            {completedCount}/{totalCount} ({progressPercent}%)
          </span>
        </div>
        
        {/* Progress Bar Container */}
        <div className="w-full h-2.5 bg-surfaceHighlight rounded-full overflow-hidden shadow-inner relative border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Shimmer/Pulse effect on full completion */}
            {progressPercent === 100 && totalCount > 0 && (
              <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
            )}
          </motion.div>
        </div>

        {/* XP Multiplier Weekend indicator */}
        {isWeekend && (
          <div className="mt-2.5 flex items-center text-[9px] font-black text-amber-400 tracking-wider uppercase space-x-1 animate-pulse">
            <Flame size={10} />
            <span>Weekend Protocol Buff Active: Double XP (+80 Per Completed Target)</span>
          </div>
        )}
      </div>

      {/* Day Navigation Scrollable Tabs Row */}
      <div className="mb-4 relative z-10 border-b border-white/5 pb-2">
        <div 
          ref={containerRef}
          className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full select-none"
        >
          {DAYS_SHORT.map((_, i) => renderTab(i))}
          
          {/* Monthly objectives tab */}
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('monthly');
            }}
            className={cn(
              "relative py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-300 shrink-0 select-none flex items-center space-x-1 min-w-[70px]",
              activeTab === 'monthly' ? "text-textMain font-extrabold" : "text-textMuted hover:text-textMain hover:bg-white/5"
            )}
          >
            <Calendar size={12} className="text-primary" />
            <span>Monthly</span>
            {activeTab === 'monthly' && (
              <motion.div
                layoutId="activeTodoTab"
                className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-lg -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </button>
          
          {/* One off objectives tab */}
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('one-off');
            }}
            className={cn(
              "relative py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-300 shrink-0 select-none flex items-center space-x-1 min-w-[70px]",
              activeTab === 'one-off' ? "text-textMain font-extrabold" : "text-textMuted hover:text-textMain hover:bg-white/5"
            )}
          >
            <Sparkles size={12} className="text-amber-400 animate-pulse" />
            <span>One-Off</span>
            {activeTab === 'one-off' && (
              <motion.div
                layoutId="activeTodoTab"
                className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-lg -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Todo List Area */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent min-h-[220px] max-h-[300px]">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-60">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] uppercase font-black tracking-widest text-textMuted">Syncing Protocols...</p>
          </div>
        ) : filteredTodos.length > 0 ? (
          <div className="space-y-2.5 py-1">
            <AnimatePresence initial={false} mode="popLayout">
              {filteredTodos.map((todo) => {
                const done = isCompleted(todo);
                const colors = pillarColors[todo.pillar] || pillarColors.Study;

                return (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => handleToggle(todo.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden group/item",
                      done 
                        ? "bg-surfaceHighlight/35 border-white/5 opacity-50 hover:opacity-75"
                        : "bg-surface/50 border-white/10 hover:border-white/20 hover:bg-surface/85 shadow-sm"
                    )}
                  >
                    {/* Done background shine effect */}
                    {done && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500/50" />
                    )}

                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {/* Check Box */}
                      <button
                        type="button"
                        className="shrink-0 transition-transform duration-300 hover:scale-110 active:scale-95"
                      >
                        {done ? (
                          <CheckCircle2 className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" size={18} />
                        ) : (
                          <Circle className="text-textMuted group-hover/item:text-primary transition-colors duration-300" size={18} />
                        )}
                      </button>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-xs md:text-sm font-semibold tracking-tight truncate transition-all duration-300",
                          done ? "line-through text-textMuted" : "text-textMain"
                        )}>
                          {todo.title}
                        </p>
                        
                        {/* Meta Tags (Time & Pillar Badge) */}
                        <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                          {/* Time */}
                          {todo.time && (
                            <span className="flex items-center text-[9px] font-black text-textMuted font-mono space-x-1 shrink-0">
                              <Clock size={9} />
                              <span>{formatTime(todo.time)}</span>
                            </span>
                          )}
                          
                          {/* Time separator */}
                          {todo.time && <span className="text-white/10 text-[9px] select-none shrink-0">•</span>}
                          
                          {/* Pillar Badge */}
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border shrink-0",
                            colors.text,
                            colors.bg,
                            colors.border
                          )}>
                            {todo.pillar}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* XP Indicator */}
                    {!done && (() => {
                      const getBaseXp = (target?: string) => {
                        if (target === 'High') return 100;
                        if (target === 'Low') return 40;
                        return 60; // Medium / Default
                      };
                      const base = getBaseXp(todo.task_target);
                      const displayXp = isWeekend ? base * 2 : base;
                      return (
                        <div className="ml-2 py-0.5 px-1.5 bg-primary/10 border border-primary/20 text-[9px] font-black text-primary rounded-md shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                          +{displayXp} XP
                        </div>
                      );
                    })()}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty State Cyber Deck */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center bg-surfaceHighlight/10 border border-dashed border-white/5 rounded-2xl relative overflow-hidden"
          >
            {/* Hologram aesthetic lines */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-10 pointer-events-none" />
            
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse">
              <CheckCircle2 size={24} />
            </div>
            
            <h4 className="text-xs font-black uppercase text-textMain tracking-widest mb-1.5">
              Protocol Shield Optimal
            </h4>
            
            <p className="text-[11px] text-textMuted max-w-[200px] leading-relaxed mb-4">
              All objectives cleared or none scheduled for this cycle. Sync new targets in the Control Room.
            </p>

            <button
              onClick={() => {
                audio.playClick();
                if (onNavigate) onNavigate('control_room');
              }}
              className="py-1.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/45 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300"
            >
              Configure Deck
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
