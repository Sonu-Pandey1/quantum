import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Settings, Clock, Target, Plus, Trash2, Dumbbell, 
  BookOpen, Briefcase, Brain, Pencil, Check, X, RotateCcw,
  Cpu, Sparkles, Eye, EyeOff, ExternalLink, Loader2, Key,
  CheckCircle2, BrainCircuit
} from 'lucide-react';
import toast from 'react-hot-toast';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';
import { cn } from '../lib/utils';
import { useProgression } from '../hooks/useProgression';
import { getGeminiApiKey, setGeminiApiKey, testGeminiApiKey } from '../lib/aiService';

interface TimetableTask {
  id: number;
  title: string;
  start: string;
  end: string;
  icon?: string;
  statusMsg?: string;
  dayOfWeek?: number;   // 0=Sun … 6=Sat (undefined = applies to all days)
  category?: string;   // 'gym' | 'study' | 'work' | 'mind' | 'other'
  isWeekend?: boolean; // marks as optional weekend bonus task
  task_target?: 'High' | 'Medium' | 'Low';
  pillar?: string;
}

interface HabitTask {
  id: number;
  title: string;
  icon: string;
}

interface RoadmapPhase {
  id: number;
  phase: string;
  title: string;
  desc: string;
  status: string;
  type: 'partial' | 'current' | 'locked';
}

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

const defaultTasks: TimetableTask[] = [
  { id: 1, start: '06:00', end: '07:00', title: 'Morning Routine & Movement', statusMsg: 'System Initialization...', icon: 'Sun' },
  { id: 2, start: '09:00', end: '12:00', title: 'Deep Work Block 1', statusMsg: 'Maximum Focus...', icon: 'Briefcase' },
  { id: 3, start: '13:00', end: '17:00', title: 'Deep Work Block 2 & Communications', statusMsg: 'Executing Objectives...', icon: 'Activity' },
  { id: 4, start: '18:00', end: '20:00', title: 'Skill Development', statusMsg: 'Learning & Growth...', icon: 'Book' },
  { id: 5, start: '20:00', end: '22:00', title: 'Decompression & Review', statusMsg: 'Recovery Protocol...', icon: 'Moon' },
];

const defaultHabits: HabitTask[] = [
  { id: 1, title: 'Read 10 Pages', icon: 'Book' },
  { id: 2, title: 'Exercise 30 mins', icon: 'Dumbbell' }
];

const defaultRoadmap: RoadmapPhase[] = [
  { id: 1, phase: 'Phase 1', title: 'Foundations', desc: 'Core principles and basics', status: '60% Complete', type: 'partial' },
  { id: 2, phase: 'Phase 2', title: 'Intermediate Concepts', desc: 'Advanced topics and projects', status: 'CURRENT FOCUS', type: 'current' },
  { id: 3, phase: 'Phase 3', title: 'Mastery', desc: 'Expert level execution', status: 'LOCKED', type: 'locked' }
];

const THEMES = [
  { id: 'quantum', label: 'Quantum Blue',   color: 'bg-blue-500' },
  { id: 'emerald', label: 'Emerald Matrix', color: 'bg-emerald-500' },
  { id: 'purple',  label: 'Cyber Purple',   color: 'bg-purple-500' },
  { id: 'gold',    label: 'Vanguard Gold',  color: 'bg-yellow-500' },
  { id: 'rose',    label: 'Rose Neon',      color: 'bg-rose-500' },
  { id: 'cyan',    label: 'Cyber Cyan',     color: 'bg-cyan-400' },
  { id: 'orange',  label: 'Solar Orange',   color: 'bg-orange-500' },
  { id: 'indigo',  label: 'Deep Indigo',    color: 'bg-indigo-500' },
];

export function ControlRoom() {
  const { resetProgression, state, updateProfile, setTheme } = useProgression();
  const [userName, setUserName] = useState(state.displayName);
  const [goals, setGoals] = useState<string[]>(state.goals || []);
  const [newGoal, setNewGoal] = useState('');
  const [baselineLevel, setBaselineLevel] = useState(state.baselineLevel || 0);

  useEffect(() => {
    if (state.displayName && !userName) setUserName(state.displayName);
  }, [state.displayName]);

  useEffect(() => {
    if (state.goals && state.goals.length > 0 && goals.length === 0) setGoals(state.goals);
  }, [state.goals]);

  useEffect(() => {
    if (state.baselineLevel !== undefined && baselineLevel === 0) setBaselineLevel(state.baselineLevel);
  }, [state.baselineLevel]);

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };
  const [tasks, setTasks]         = useState<TimetableTask[]>(defaultTasks);
  const [habits, setHabits]       = useState<HabitTask[]>(defaultHabits);
  const [roadmap, setRoadmap]     = useState<RoadmapPhase[]>(defaultRoadmap);
  const [weightGoal, setWeightGoal] = useState('70');
  const [sapTarget, setSapTarget] = useState('Master Core Skills');
  const [sundayRest, setSundayRest] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');
  const [userId, setUserId]       = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay()); // 0=Sun…6=Sat
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPillar, setNewPillar] = useState<'Study' | 'Health' | 'Finance' | 'Mind'>('Study');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('09:45');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPillar, setNewTodoPillar] = useState<'Study' | 'Health' | 'Finance' | 'Mind'>('Study');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [newTodoRecurrence, setNewTodoRecurrence] = useState<'daily' | 'weekly' | 'monthly' | 'one-off'>('weekly');
  const [newTodoPriority, setNewTodoPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [geminiKey, setGeminiKey] = useState<string>(() => getGeminiApiKey());
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiKeySavedNotice, setAiKeySavedNotice] = useState(false);

  useEffect(() => {
    async function loadUserConfig() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      
      let uid = 'default';
      if (session?.user) {
        uid = session.user.id;
        setUserId(uid);
      }
      
      // 1. Try Database First (if logged in)
      if (uid !== 'default') {
        try {
          const { data, error } = await supabase.from('profiles').select('settings').eq('id', uid).single();
          if (error) throw error;

          if (data && data.settings) {
            const s = data.settings;
            
            // 1. Timetable loading
            if (s.timetable) {
              setTasks(s.timetable);
              localStorage.setItem(`quantum_timetable_${uid}`, JSON.stringify(s.timetable));
            } else {
              const t = localStorage.getItem(`quantum_timetable_${uid}`);
              if (t && t !== "undefined") { try { setTasks(JSON.parse(t)); } catch(e){} }
            }

            // 2. Habits loading
            if (s.habits) {
              setHabits(s.habits);
              localStorage.setItem(`quantum_habits_${uid}`, JSON.stringify(s.habits));
            } else {
              const h = localStorage.getItem(`quantum_habits_${uid}`);
              if (h && h !== "undefined") { try { setHabits(JSON.parse(h)); } catch(e){} }
            }

            // 3. Roadmap loading
            if (s.roadmap) {
              setRoadmap(s.roadmap);
              localStorage.setItem(`quantum_roadmap_${uid}`, JSON.stringify(s.roadmap));
            } else {
              const r = localStorage.getItem(`quantum_roadmap_${uid}`);
              if (r && r !== "undefined") { try { setRoadmap(JSON.parse(r)); } catch(e){} }
            }

            // 4. Todos loading - Crucial fallback to prevent losing newly created todos
            if (s.todos) {
              setTodos(s.todos);
              localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(s.todos));
            } else {
              const td = localStorage.getItem(`quantum_todos_${uid}`);
              if (td && td !== "undefined") { try { setTodos(JSON.parse(td)); } catch(e){} }
            }

            // 5. Weight Goal loading
            if (s.weightGoal) {
              setWeightGoal(s.weightGoal.toString());
              localStorage.setItem(`quantum_weight_goal_${uid}`, s.weightGoal.toString());
            } else {
              const w = localStorage.getItem(`quantum_weight_goal_${uid}`);
              if (w) setWeightGoal(w);
            }

            // 6. Big Goal loading
            if (s.sapTarget) {
              setSapTarget(s.sapTarget);
              localStorage.setItem(`quantum_sap_target_${uid}`, s.sapTarget);
            } else {
              const sg = localStorage.getItem(`quantum_sap_target_${uid}`);
              if (sg) setSapTarget(sg);
            }

            // 7. Sunday Rest loading
            if (s.sundayRest !== undefined) {
              setSundayRest(s.sundayRest);
              localStorage.setItem(`quantum_sunday_rest_${uid}`, s.sundayRest.toString());
            } else {
              const sr = localStorage.getItem(`quantum_sunday_rest_${uid}`);
              if (sr) setSundayRest(sr !== 'false');
            }

            // 8. Gemini API Key loading
            if (s.geminiApiKey) {
              setGeminiKey(s.geminiApiKey);
              setGeminiApiKey(s.geminiApiKey);
            } else {
              const k = getGeminiApiKey();
              if (k) setGeminiKey(k);
            }
            return;
          }
        } catch (e) {
          console.warn("Supabase settings fetch failed, trying local fallback.", e);
        }
      }

      // 2. Local Fallback (for guests or failed DB fetch)
      const t = localStorage.getItem(`quantum_timetable_${uid}`);
      if (t && t !== "undefined") { try { setTasks(JSON.parse(t)); } catch(e){} }

      const h = localStorage.getItem(`quantum_habits_${uid}`);
      if (h && h !== "undefined") { try { setHabits(JSON.parse(h)); } catch(e){} }

      const r = localStorage.getItem(`quantum_roadmap_${uid}`);
      if (r && r !== "undefined") { try { setRoadmap(JSON.parse(r)); } catch(e){} }

      const td = localStorage.getItem(`quantum_todos_${uid}`);
      if (td && td !== "undefined") { try { setTodos(JSON.parse(td)); } catch(e){} }

      const w = localStorage.getItem(`quantum_weight_goal_${uid}`);
      if (w) setWeightGoal(w);

      const s = localStorage.getItem(`quantum_sap_target_${uid}`);
      if (s) setSapTarget(s);

      const sr = localStorage.getItem(`quantum_sunday_rest_${uid}`);
      if (sr) setSundayRest(sr !== 'false');

      const k = getGeminiApiKey();
      if (k) setGeminiKey(k);
    }
    loadUserConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSavedMessage('Synchronizing...');
      
      // Validation
      tasks.forEach((t, i) => { if(!t.title || !t.start || !t.end) throw new Error(`Task #${i+1} is incomplete`); });
      habits.forEach((h, i) => { if(!h.title) throw new Error(`Habit #${i+1} is missing title`); });

      let currentUid = userId;
      if (!currentUid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          currentUid = session.user.id;
          setUserId(currentUid);
        }
      }

      const uid = currentUid || 'default';
      
      // Save Locally
      localStorage.setItem(`quantum_timetable_${uid}`, JSON.stringify(tasks));
      localStorage.setItem(`quantum_timetable_default`, JSON.stringify(tasks));
      localStorage.setItem(`quantum_habits_${uid}`, JSON.stringify(habits));
      localStorage.setItem(`quantum_habits_default`, JSON.stringify(habits));
      localStorage.setItem(`quantum_roadmap_${uid}`, JSON.stringify(roadmap));
      localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(todos));
      localStorage.setItem(`quantum_todos_default`, JSON.stringify(todos));
      localStorage.setItem(`quantum_weight_goal_${uid}`, weightGoal);
      localStorage.setItem(`quantum_sap_target_${uid}`, sapTarget);
      localStorage.setItem(`quantum_sunday_rest_${uid}`, sundayRest.toString());
      if (userName) {
        localStorage.setItem(`quantum_timetable_${userName}`, JSON.stringify(tasks));
        localStorage.setItem(`quantum_todos_${userName}`, JSON.stringify(todos));
      }
      setGeminiApiKey(geminiKey);

      // Save Profile & Identity
      await updateProfile({
        display_name: userName,
        goals: goals,
        settings: {
          theme: state.theme,
          baselineLevel: baselineLevel,
          timetable: tasks,
          habits: habits,
          roadmap: roadmap,
          todos: todos,
          weightGoal,
          sapTarget,
          sundayRest,
          geminiApiKey: geminiKey
        }
      });

      // Save sequentially to timetable_tasks table
      if (currentUid && supabase) {
        // Generate database-insertable rows from tasks
        const rowsToSave: any[] = [];
        tasks.forEach((t, idx) => {
          const days = t.dayOfWeek !== undefined ? [t.dayOfWeek] : [0, 1, 2, 3, 4, 5, 6];
          days.forEach(day => {
            const sh = t.start;
            const eh = t.end;
            let duration = 30;
            try {
              const [shHrs, shMins] = sh.split(':').map(Number);
              const [ehHrs, ehMins] = eh.split(':').map(Number);
              duration = (ehHrs * 60 + ehMins) - (shHrs * 60 + shMins);
              if (duration <= 0) duration = 30;
            } catch (e) {}

            const categoryMap: Record<string, string> = {
              gym: 'gym', study: 'study', work: 'work', mind: 'mind', other: 'other',
              Health: 'gym', Study: 'study', Finance: 'work', Mind: 'mind'
            };
            const category = categoryMap[t.category || ''] || categoryMap[t.pillar || ''] || 'other';

            rowsToSave.push({
              user_id: currentUid,
              name: t.title,
              category: category,
              pillar: t.pillar || (category === 'gym' ? 'Health' : category === 'study' ? 'Study' : category === 'work' ? 'Finance' : 'Mind'),
              duration_minutes: duration,
              day_of_week: day,
              is_weekend: day === 0 || day === 6,
              order_index: idx,
              start_time: t.start,
              task_target: t.task_target || 'Medium'
            });
          });
        });

        setSavedMessage('Matching existing schedule entries...');
        const { data: existingTasks } = await supabase
          .from('timetable_tasks')
          .select('id, name, start_time, day_of_week')
          .eq('user_id', currentUid);

        const existingMap = new Map<string, string>();
        if (existingTasks) {
          existingTasks.forEach(et => {
            const key = `${et.name.trim().toLowerCase()}_${et.start_time}_${et.day_of_week}`;
            existingMap.set(key, et.id);
          });
        }

        // Attach existing ID if found to preserve foreign keys
        rowsToSave.forEach(row => {
          const key = `${row.name.trim().toLowerCase()}_${row.start_time}_${row.day_of_week}`;
          if (existingMap.has(key)) {
            row.id = existingMap.get(key);
          }
        });

        if (rowsToSave.length > 0) {
          setSavedMessage(`Synchronizing ${rowsToSave.length} schedule entries non-destructively...`);
          const { error: upsertError } = await supabase
            .from('timetable_tasks')
            .upsert(rowsToSave, { onConflict: 'id' });
          if (upsertError) {
            console.error("Supabase Upsert Error:", upsertError);
            throw new Error(`Failed to synchronize timetable tasks: ${upsertError.message}`);
          }
        }

        setSavedMessage('Finished');
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Save to profiles settings column
      if (currentUid && supabase) {
        const { error } = await supabase.from('profiles').update({
          display_name: userName,
          goals: goals,
          settings: {
            theme: state.theme,
            baselineLevel: baselineLevel,
            timetable: tasks,
            habits: habits,
            roadmap: roadmap,
            todos: todos,
            weightGoal,
            sapTarget,
            sundayRest,
            geminiApiKey: geminiKey
          }
        }).eq('id', currentUid);

        if (error) {
          console.error("Supabase Save Error:", error);
          throw new Error(`Cloud Sync Failed: ${error.message}`);
        }
      }

      window.dispatchEvent(new CustomEvent('quantum_config_updated'));
      audio.playSuccess();
      setSavedMessage('System Configuration Synchronized');
      toast.success('System Configuration & Strategic Alignment Synchronized');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (e: any) {
      audio.playClick();
      setSavedMessage(`Error: ${e.message}`);
      toast.error(`Save Error: ${e.message}`);
      setTimeout(() => setSavedMessage(''), 5000);
    }
  };

  const handleTaskChange = (id: number, field: keyof TimetableTask, value: string | number | boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const getDuration = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return diff > 0 ? `${diff} min` : 'Custom';
    } catch (e) {
      return 'Custom';
    }
  };

  const handleAddTask = () => {
    if (!newName.trim()) return;

    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const isWknd = activeDay === 0 || activeDay === 6;

    const pillarToCategory: Record<'Study' | 'Health' | 'Finance' | 'Mind', string> = {
      'Study': 'study',
      'Health': 'gym',
      'Finance': 'work',
      'Mind': 'mind'
    };

    const derivedCategory = pillarToCategory[newPillar];

    const todayTasks = tasks.filter(t => t.dayOfWeek === activeDay);
    let defaultStart = '09:00';
    if (todayTasks.length > 0) {
      const sorted = [...todayTasks].sort((a,b) => a.end.localeCompare(b.end));
      defaultStart = sorted[sorted.length - 1].end;
    }

    const [hours, minutes] = defaultStart.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + 45, 0, 0);
    const defaultEnd = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const newTask: TimetableTask = {
      id: newId,
      title: newName.trim(),
      start: newStart || defaultStart,
      end: newEnd || defaultEnd,
      dayOfWeek: activeDay,
      category: derivedCategory,
      pillar: newPillar,
      isWeekend: isWknd,
      task_target: newPriority || 'Medium',
      statusMsg: 'Executing Protocol...'
    };

    setTasks([...tasks, newTask]);
    setNewName('');
    setNewStart('09:00');
    setNewEnd('09:45');
    setNewPriority('Medium');
    setShowAddForm(false);
    audio.playSuccess();
  };

  const removeTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  /*
  const handleHabitChange = (id: number, field: keyof HabitTask, value: string) => {
    setHabits(habits.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const addHabit = () => {
    const newId = habits.length > 0 ? Math.max(...habits.map(h => h.id)) + 1 : 1;
    setHabits([...habits, { id: newId, title: 'New Habit', icon: 'Check' }]);
  };

  const removeHabit = (id: number) => {
    setHabits(habits.filter(h => h.id !== id));
  };
  */





  const persistTodos = async (updated: TodoItem[]) => {
    setTodos(updated);
    const uid = userId || 'default';
    localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(updated));
    localStorage.setItem(`quantum_todos_default`, JSON.stringify(updated));
    localStorage.setItem(`quantum_todos`, JSON.stringify(updated));
    if (userName) {
      localStorage.setItem(`quantum_todos_${userName}`, JSON.stringify(updated));
    }
    if (state.displayName) {
      localStorage.setItem(`quantum_todos_${state.displayName}`, JSON.stringify(updated));
    }

    // Broadcast across entire app
    window.dispatchEvent(new CustomEvent('quantum_config_updated'));
    window.dispatchEvent(new CustomEvent('quantum_todos_updated', { detail: updated }));

    if (uid !== 'default' && supabase) {
      try {
        const { data } = await supabase.from('profiles').select('settings').eq('id', uid).single();
        const currentSettings = data?.settings || {};
        const updatedSettings = {
          ...currentSettings,
          todos: updated,
        };
        await supabase.from('profiles').update({ settings: updatedSettings }).eq('id', uid);
      } catch (e) {
        console.error("Auto-save todo failed:", e);
      }
    }
  };

  const addTodo = async () => {
    if (!newTodoTitle.trim()) return;
    const newId = todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1;
    const item: TodoItem = {
      id: newId,
      title: newTodoTitle.trim(),
      dayOfWeek: activeDay,
      pillar: newTodoPillar,
      isOneOff: newTodoRecurrence === 'one-off',
      recurrence: newTodoRecurrence,
      completed: false,
      completedDates: [],
      xpAwarded: false,
      xpAwardedDates: [],
      task_target: newTodoPriority,
      time: newTodoTime || undefined
    };
    const updated = [...todos, item];
    await persistTodos(updated);
    
    setNewTodoTitle('');
    setNewTodoTime('');
    audio.playSuccess();
    toast.success('Task scheduled to Protocol Deck!');
  };

  const removeTodo = async (id: number) => {
    const updated = todos.filter(t => t.id !== id);
    await persistTodos(updated);
    audio.playClick();
    toast.success('Task removed from Protocol Deck');
  };

  const handleUpdateTodo = async (id: number, field: keyof TodoItem, value: any) => {
    const updated = todos.map(t => t.id === id ? { ...t, [field]: value } : t);
    await persistTodos(updated);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col h-full overflow-y-auto scrollbar-thin p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 pb-32 md:pb-12"
    >
      {/* ─── TOP HEADER ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center space-x-3.5 text-textMain">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <BrainCircuit size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase italic">System Configuration & Strategic Control</h1>
            <p className="text-[10px] text-textMuted font-medium uppercase tracking-widest">Unified Neural OS Architecture • Identity, Growth Matrix & Protocols</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <button 
            type="button"
            onClick={() => {
              audio.playClick();
              window.dispatchEvent(new CustomEvent('quantum_open_ai_command'));
            }}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600/20 to-primary/20 hover:from-purple-600/30 hover:to-primary/30 text-purple-200 border border-purple-500/35 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)]"
            title="Ask AI to automate schedules, manage habits, or switch themes (Ctrl+K)"
          >
            <Sparkles size={15} className="text-amber-300 animate-spin-slow" />
            <span>AI Co-Pilot</span>
          </button>

          <button 
            type="button"
            onClick={handleSave}
            className="flex items-center justify-center space-x-2 bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Save size={16} />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className={`p-4 rounded-xl border font-bold ${savedMessage.includes('Error') ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'}`}>
          {savedMessage}
        </div>
      )}

      {/* ─── #1 TOP OF PAGE: PROTOCOL TIMETABLE BUILDER (FULL WIDTH) ─── */}
      <div className="glass-panel p-6 sm:p-8 flex flex-col space-y-6 rounded-3xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-primary">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Clock size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-textMain tracking-tight">Protocol Timetable Builder</h2>
              <p className="text-xs text-textMuted">Modify the exact execution blocks that drive The Engine & Daily Execution Timeline.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                audio.playClick();
                window.dispatchEvent(new CustomEvent('quantum_open_ai_command'));
              }}
              className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3.5 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              title="Tell AI to auto-schedule or adjust routine blocks"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>AI Auto-Plan</span>
            </button>
            <button 
              type="button"
              onClick={() => { audio.playClick(); setShowAddForm(!showAddForm); }}
              className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={16} /> <span>{showAddForm ? 'Close' : 'Add Task'}</span>
            </button>
          </div>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 bg-surfaceHighlight/35 rounded-2xl border border-primary/20 space-y-4 my-2">
                <div>
                  <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-2 opacity-50">Task Name (What you do)</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => {
                      const val = e.target.value;
                      setNewName(val);
                      
                      // Real-time AI keyword heuristic
                      const lower = val.toLowerCase();
                      if (/gym|run|workout|cardio|sleep|eat|movement|stretch|swim|lift/i.test(lower)) {
                        setNewPillar('Health');
                      } else if (/study|code|read|learn|abap|react|practice|write|course|lecture/i.test(lower)) {
                        setNewPillar('Study');
                      } else if (/work|finance|ledger|stock|money|invest|buy|sell|budget|bill/i.test(lower)) {
                        setNewPillar('Finance');
                      } else if (/meditate|mind|mindful|yoga|breathe|relax|reflect|journal/i.test(lower)) {
                        setNewPillar('Mind');
                      }
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    placeholder="Task name (e.g. Gym workout, Studying react, Focus block)..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-textMain focus:border-primary outline-none placeholder:text-white/20"
                  />
                </div>

                {newName.trim() && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10 w-fit text-[10px] text-primary font-black uppercase tracking-wider animate-pulse">
                    <span>🤖 Auto-Predicted Pillar:</span>
                    <span className="text-white bg-primary/20 px-2 py-0.5 rounded">{newPillar}</span>
                  </div>
                )}

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-textMuted uppercase tracking-widest block opacity-40">Quick Presets</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { title: '💪 Gym Workout', pillar: 'Health' },
                      { title: '📚 Code Practice', pillar: 'Study' },
                      { title: '💼 Ledger Audit', pillar: 'Finance' },
                      { title: '🧘 Mindful Meditation', pillar: 'Mind' },
                    ].map(preset => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => {
                          setNewName(preset.title.substring(3)); // Strip emoji
                          setNewPillar(preset.pillar as any);
                          audio.playClick();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-surfaceHighlight/50 border border-white/5 text-[10px] font-bold text-textMuted hover:text-textMain hover:border-primary/30 transition-all cursor-pointer"
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block opacity-50">Related Pillar</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'Study',   label: 'Study',   icon: BookOpen,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
                      { id: 'Health',  label: 'Health',  icon: Dumbbell,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                      { id: 'Finance', label: 'Finance', icon: Briefcase,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
                      { id: 'Mind',    label: 'Mind',    icon: Brain,      color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setNewPillar(p.id as any); audio.playClick(); }}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all ${
                          newPillar === p.id
                            ? `${p.bg} ${p.border} ${p.color} ring-1 ring-white/10 scale-[1.02] shadow-lg`
                            : 'bg-background border-white/5 text-textMuted hover:border-white/10'
                        }`}
                      >
                        <p.icon size={18} className="mb-1.5" />
                        <span className="text-[10px] font-black tracking-widest uppercase leading-none">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-50">Start Time</label>
                    <input
                      type="time"
                      value={newStart}
                      onChange={e => setNewStart(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-50">End Time</label>
                    <input
                      type="time"
                      value={newEnd}
                      onChange={e => setNewEnd(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-50">Priority / XP</label>
                    <select
                      value={newPriority}
                      onChange={e => setNewPriority(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-textMain font-bold outline-none focus:border-primary"
                    >
                      <option value="High">🔴 High Priority (100 XP)</option>
                      <option value="Medium">🟡 Medium Priority (60 XP)</option>
                      <option value="Low">🔵 Low Priority (40 XP)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-[10px] font-black uppercase text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button onClick={handleAddTask} className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Add Task</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Day tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
            const isWknd = i === 0 || i === 6;
            const count = tasks.filter(t => t.dayOfWeek === i || t.dayOfWeek === undefined).length;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveDay(i)}
                className={`shrink-0 flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                  activeDay === i
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                    : 'bg-surfaceHighlight/50 border-border text-textMuted hover:border-white/20'
                } ${isWknd ? 'ring-1 ring-amber-500/20' : ''}`}
              >
                <span>{d}</span>
                {count > 0 && <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 opacity-80">{count}</span>}
                {isWknd && <span className="text-[9px] text-amber-400 font-mono">2×</span>}
              </button>
            );
          })}
        </div>
        {(activeDay === 0 || activeDay === 6) && (
          <p className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2">
            ⚡ Weekend — optional bonus day. Tasks completed earn 2× XP.
          </p>
        )}
        
        {/* Task Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          <AnimatePresence>
            {tasks
              .filter(t => t.dayOfWeek === activeDay || t.dayOfWeek === undefined)
              .map((task) => {
                const isEditing = editingTaskId === task.id;
                
                const categoryConfig: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
                  gym:   { icon: Dumbbell,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Health' },
                  study: { icon: BookOpen,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    label: 'Study'  },
                  work:  { icon: Briefcase,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: 'Finance' },
                  mind:  { icon: Brain,      color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  label: 'Mind'   },
                  other: { icon: Target,     color: 'text-gray-400',    bg: 'bg-white/5',        border: 'border-white/10',       label: 'Other'  }
                };

                let catKey = task.category || 'other';
                if (!task.category && task.pillar) {
                  const pillarToCat: Record<string, string> = {
                    'Study': 'study', 'Health': 'gym', 'Finance': 'work', 'Mind': 'mind'
                  };
                  catKey = pillarToCat[task.pillar] || 'other';
                }
                
                const config = categoryConfig[catKey] || categoryConfig.other;
                const durationStr = getDuration(task.start, task.end);

                if (!isEditing) {
                  return (
                    <motion.div 
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surfaceHighlight/30 border border-border p-4 rounded-2xl flex flex-col justify-between gap-3 relative group hover:border-white/20 transition-all duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2.5 rounded-xl border shrink-0", config.bg, config.border, config.color)}>
                          <config.icon size={18} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-textMain truncate leading-snug">{task.title}</h4>
                            {task.isWeekend && (
                              <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded tracking-wider shrink-0">
                                2× Wknd
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center text-[10px] text-textMuted uppercase font-bold tracking-wider">
                            <span>{task.start} - {task.end}</span>
                            <span className="opacity-30">•</span>
                            <span>{durationStr}</span>
                            <span className="opacity-30">•</span>
                            <span className={config.color}>{config.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            audio.playClick();
                            const next: Record<string, 'High' | 'Medium' | 'Low'> = { 'High': 'Medium', 'Medium': 'Low', 'Low': 'High' };
                            const nextPriority = next[task.task_target || 'Medium'];
                            handleTaskChange(task.id, 'task_target', nextPriority);
                          }}
                          className={cn(
                            "text-[9px] font-black uppercase px-2.5 py-1 rounded-xl border transition-all hover:scale-105 active:scale-95",
                            task.task_target === 'High' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                            task.task_target === 'Medium' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                            'text-blue-400 border-blue-500/20 bg-blue-500/10'
                          )}
                        >
                          {task.task_target === 'High' ? '100 XP' : task.task_target === 'Medium' ? '60 XP' : '40 XP'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { audio.playClick(); setEditingTaskId(task.id); }}
                            className="p-1.5 text-textMuted hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                            title="Edit task"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => { audio.playClick(); removeTask(task.id); }}
                            className="p-1.5 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                } else {
                  return (
                    <motion.div 
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-surfaceHighlight border border-primary/30 p-4 sm:p-5 rounded-2xl flex flex-col gap-3 relative md:col-span-2"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Editing Task Protocol</span>
                        <button
                          type="button"
                          onClick={() => { audio.playClick(); setEditingTaskId(null); }}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-textMuted hover:text-textMain"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-textMuted font-bold uppercase tracking-wider block mb-1">Task Title</label>
                          <input 
                            type="text" 
                            value={task.title}
                            onChange={(e) => handleTaskChange(task.id, 'title', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-textMain outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-textMuted font-bold uppercase tracking-wider block mb-1">Pillar & Category</label>
                          <select
                            value={task.pillar || config.label}
                            onChange={(e) => {
                              const selectedPillar = e.target.value as 'Study' | 'Health' | 'Finance' | 'Mind';
                              const pToCat: Record<string, string> = {
                                'Study': 'study', 'Health': 'gym', 'Finance': 'work', 'Mind': 'mind'
                              };
                              handleTaskChange(task.id, 'pillar', selectedPillar);
                              handleTaskChange(task.id, 'category', pToCat[selectedPillar]);
                            }}
                            className="w-full bg-background border border-border rounded-lg px-2 py-2 text-xs text-textMain outline-none focus:border-primary font-bold text-textMain"
                          >
                            <option value="Study">📚 Study Pillar</option>
                            <option value="Health">💪 Health Pillar</option>
                            <option value="Finance">💼 Finance Pillar</option>
                            <option value="Mind">🧘 Mind Pillar</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                        <div>
                          <label className="text-[9px] text-textMuted font-bold uppercase tracking-wider block mb-1">Start Time</label>
                          <input 
                            type="time" 
                            value={task.start}
                            onChange={(e) => handleTaskChange(task.id, 'start', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-textMain outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-textMuted font-bold uppercase tracking-wider block mb-1">End Time</label>
                          <input 
                            type="time" 
                            value={task.end}
                            onChange={(e) => handleTaskChange(task.id, 'end', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-textMain outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-textMuted font-bold uppercase tracking-wider block mb-1">Priority / XP</label>
                          <select
                            value={task.task_target || 'Medium'}
                            onChange={(e) => handleTaskChange(task.id, 'task_target', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-primary text-textMain"
                          >
                            <option value="High">High (100 XP)</option>
                            <option value="Medium">Medium (60 XP)</option>
                            <option value="Low">Low (40 XP)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 justify-end border-t border-white/5 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            audio.playClick();
                            handleTaskChange(task.id, 'isWeekend', !(task.isWeekend));
                          }}
                          className={cn(
                            "w-full sm:w-auto text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all sm:mr-auto text-center",
                            task.isWeekend
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'bg-surfaceHighlight border-border text-textMuted hover:border-white/20'
                          )}
                        >
                          {task.isWeekend ? '⚡ Weekend 2× Active' : 'Mark Weekend 2×'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => { audio.playSuccess(); setEditingTaskId(null); }}
                          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary/20 border border-primary/50 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/30 transition-all"
                        >
                          <Check size={12} /> Apply Changes
                        </button>
                      </div>
                    </motion.div>
                  );
                }
              })}
          </AnimatePresence>
        </div>
        {tasks.filter(t => t.dayOfWeek === activeDay || t.dayOfWeek === undefined).length === 0 && (
          <div className="text-center p-8 text-textMuted text-sm border border-dashed border-border rounded-xl">
            No protocols for this day. Click "Add Protocol Task" to create one.
          </div>
        )}
      </div>

      {/* ─── #2 NEXT: DAILY TODO PROTOCOL DECK (FULL WIDTH) ─── */}
      <div className="glass-panel p-6 sm:p-8 space-y-6 rounded-3xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-primary">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-textMain tracking-tight">Daily Todo Protocol Deck</h2>
              <p className="text-xs text-textMuted">Add one-off or day-based specific tasks to execute. They reset daily or archive when done, directly feeding into your Dashboard Timeline.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                audio.playClick();
                window.dispatchEvent(new CustomEvent('quantum_open_ai_command'));
              }}
              className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3.5 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              title="Tell AI to generate or queue today's todos"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>AI Quick Add</span>
            </button>
          </div>
        </div>

        {/* Todo Creation deck */}
        <div className="p-5 bg-surfaceHighlight/30 rounded-2xl border border-border space-y-4">
          <div>
            <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-60">Todo Description</label>
            <input 
              type="text" 
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="e.g. Complete math workbook, Fix ledger audit, Review pull request..."
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary placeholder:text-white/20"
              onKeyDown={(e) => e.key === 'Enter' && newTodoTitle.trim() && addTodo()}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-60">Time (Optional)</label>
              <input 
                type="time" 
                value={newTodoTime}
                onChange={(e) => setNewTodoTime(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-60">Related Pillar</label>
              <select
                value={newTodoPillar}
                onChange={(e) => setNewTodoPillar(e.target.value as any)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-textMain font-bold outline-none focus:border-primary"
              >
                <option value="Study">📚 Study</option>
                <option value="Health">💪 Health</option>
                <option value="Finance">💼 Finance</option>
                <option value="Mind">🧘 Mind</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-60">Priority / XP</label>
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as any)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-textMain font-bold outline-none focus:border-primary"
              >
                <option value="High">🔴 High (100 XP)</option>
                <option value="Medium">🟡 Medium (60 XP)</option>
                <option value="Low">🔵 Low (40 XP)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-background/50 border border-border rounded-xl">
            <div>
              <p className="text-xs font-bold text-textMain">Recurrence Protocol</p>
              <p className="text-[9px] text-textMuted uppercase font-medium">
                {newTodoRecurrence === 'one-off' ? 'Check off once and archive.' :
                 newTodoRecurrence === 'daily' ? 'Repeats every single day.' :
                 newTodoRecurrence === 'monthly' ? 'Resets and repeats monthly.' :
                 `Repeats every ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][activeDay]}.`}
              </p>
            </div>
            <select
              value={newTodoRecurrence}
              onChange={(e) => { audio.playClick(); setNewTodoRecurrence(e.target.value as any); }}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-textMain font-bold outline-none focus:border-primary"
            >
              <option value="weekly">📅 Weekly ({['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][activeDay]})</option>
              <option value="daily">⚡ Daily (Every Day)</option>
              <option value="one-off">🎯 One-Off (Once)</option>
              <option value="monthly">🌙 Monthly</option>
            </select>
          </div>

          <button
            type="button"
            onClick={addTodo}
            disabled={!newTodoTitle.trim()}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          >
            <Plus size={15} /> <span>Schedule Todo to Deck</span>
          </button>
        </div>

        {/* Todo List for activeDay */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-textMuted uppercase tracking-widest block opacity-70">
              Active Todos ({['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][activeDay]})
            </span>
            <span className="text-[10px] text-textMuted font-mono">
              {todos.filter(t => {
                const rec = t.recurrence || (t.isOneOff ? 'one-off' : 'weekly');
                if (rec === 'daily' || rec === 'monthly' || rec === 'one-off') return true;
                return t.dayOfWeek === activeDay;
              }).length} tasks scheduled
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {todos
                .filter(t => {
                  const rec = t.recurrence || (t.isOneOff ? 'one-off' : 'weekly');
                  if (rec === 'daily' || rec === 'monthly' || rec === 'one-off') return true;
                  return t.dayOfWeek === activeDay;
                })
                .map(todo => {
                  const rec = todo.recurrence || (todo.isOneOff ? 'one-off' : 'weekly');
                  const pillarColors: Record<string, string> = {
                    Study: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                    Health: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    Finance: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    Mind: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                  };

                  if (editingTodoId === todo.id) {
                    return (
                      <motion.div
                        key={todo.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-surfaceHighlight/50 border border-primary/40 p-4 rounded-2xl flex flex-col gap-3 shadow-[0_0_15px_rgba(59,130,246,0.15)] col-span-1 md:col-span-2 lg:col-span-3"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                            <Pencil size={12} /> Edit Protocol Todo
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingTodoId(null)}
                            className="text-textMuted hover:text-white p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Title</label>
                            <input
                              type="text"
                              value={todo.title}
                              onChange={e => handleUpdateTodo(todo.id, 'title', e.target.value)}
                              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-textMain outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Time (Optional)</label>
                            <input
                              type="time"
                              value={todo.time || ''}
                              onChange={e => handleUpdateTodo(todo.id, 'time', e.target.value)}
                              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-textMain outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Pillar</label>
                            <select
                              value={todo.pillar}
                              onChange={e => handleUpdateTodo(todo.id, 'pillar', e.target.value as any)}
                              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-textMain font-bold outline-none focus:border-primary"
                            >
                              <option value="Study">📚 Study</option>
                              <option value="Health">💪 Health</option>
                              <option value="Finance">💼 Finance</option>
                              <option value="Mind">🧘 Mind</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Priority / XP</label>
                            <select
                              value={todo.task_target || 'Medium'}
                              onChange={e => handleUpdateTodo(todo.id, 'task_target', e.target.value as any)}
                              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-textMain font-bold outline-none focus:border-primary"
                            >
                              <option value="High">🔴 High (100 XP)</option>
                              <option value="Medium">🟡 Medium (60 XP)</option>
                              <option value="Low">🔵 Low (40 XP)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Recurrence</label>
                            <select
                              value={rec}
                              onChange={e => {
                                const newRec = e.target.value;
                                handleUpdateTodo(todo.id, 'recurrence', newRec);
                                handleUpdateTodo(todo.id, 'isOneOff', newRec === 'one-off');
                              }}
                              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-textMain font-bold outline-none focus:border-primary"
                            >
                              <option value="weekly">📅 Weekly</option>
                              <option value="daily">⚡ Daily</option>
                              <option value="one-off">🎯 One-Off</option>
                              <option value="monthly">🌙 Monthly</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Day Assigned</label>
                            <select
                              value={todo.dayOfWeek !== undefined ? todo.dayOfWeek : activeDay}
                              onChange={e => handleUpdateTodo(todo.id, 'dayOfWeek', Number(e.target.value))}
                              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-textMain font-bold outline-none focus:border-primary"
                            >
                              {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((dName, idx) => (
                                <option key={idx} value={idx}>{dName}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => { audio.playClick(); removeTodo(todo.id); }}
                            className="px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors mr-auto"
                          >
                            Delete Task
                          </button>
                          <button
                            type="button"
                            onClick={() => { audio.playSuccess(); setEditingTodoId(null); }}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-600 transition-all"
                          >
                            <Check size={12} /> Apply Changes
                          </button>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-3 p-3.5 bg-surfaceHighlight/30 border border-border rounded-xl relative group hover:border-white/20 transition-all duration-300"
                    >
                      <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase border shrink-0", pillarColors[todo.pillar])}>
                        {todo.pillar}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-textMain truncate leading-snug">{todo.title}</p>
                        <p className="text-[9px] text-textMuted font-medium uppercase tracking-wider">
                          {todo.time ? `⏰ ${todo.time}` : '📅 Day Task'} · {
                            rec === 'daily' ? '⚡ Daily' :
                            rec === 'monthly' ? '🌙 Monthly' :
                            rec === 'one-off' ? '🎯 One-off' :
                            '📅 Weekly'
                          }
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded border shrink-0",
                          todo.task_target === 'High' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                          todo.task_target === 'Low' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' :
                          'text-amber-400 border-amber-500/20 bg-amber-500/10'
                        )}>
                          {todo.task_target === 'High' ? '100 XP' : todo.task_target === 'Low' ? '40 XP' : '60 XP'}
                        </span>
                        <button
                          type="button"
                          onClick={() => { audio.playClick(); setEditingTodoId(todo.id); }}
                          className="p-1.5 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                          title="Edit todo"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTodo(todo.id)}
                          className="p-1.5 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          title="Delete todo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
          {todos.filter(t => {
            const rec = t.recurrence || (t.isOneOff ? 'one-off' : 'weekly');
            if (rec === 'daily' || rec === 'monthly' || rec === 'one-off') return true;
            return t.dayOfWeek === activeDay;
          }).length === 0 && (
            <div className="text-center py-8 text-textMuted text-xs border border-dashed border-border rounded-xl">
              No custom todos scheduled for this day. Use the deck above to schedule one.
            </div>
          )}
        </div>
      </div>

      {/* ─── #3 NEXT: IDENTITY PROFILE & NEURAL INTERFACE THEME ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Identity Profile & Calibration */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 rounded-3xl border border-white/10">
          <h3 className="text-xs font-black text-textMain uppercase tracking-[0.2em] flex items-center">
            <Settings size={18} className="mr-2 text-primary" /> Identity Profile
          </h3>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-textMuted uppercase tracking-widest mb-2">Display Name</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary outline-none transition-all placeholder:text-white/20"
                placeholder="Enter operator name..."
              />
            </div>

            {/* <div>
              <label className="block text-[10px] font-black text-textMuted uppercase tracking-widest mb-2">Active Archetype</label>
              <div className="grid grid-cols-1 gap-2">
                {['Technical Elite', 'Wealth Architect', 'Vitality Vanguard'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setArchetype(a as Archetype)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      state.archetype === a 
                        ? 'bg-primary/20 border-primary text-textMain shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' 
                        : 'bg-white/5 border-white/10 text-textMuted hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${state.archetype === a ? 'bg-primary/20 text-primary' : 'bg-white/5 text-textMuted'}`}>
                        {a === 'Technical Elite' && <TrendingUp size={16} />}
                        {a === 'Wealth Architect' && <Briefcase size={16} />}
                        {a === 'Vitality Vanguard' && <Activity size={16} />}
                      </div>
                      <span className="text-xs font-bold">{a}</span>
                    </div>
                    {state.archetype === a && <CheckCircle2 size={16} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div> */}

            {/* Life Baseline Calibration */}
            {/* <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-textMuted uppercase tracking-widest flex items-center">
                  <Target size={12} className="mr-1.5 text-primary" /> Life Baseline Calibration
                </label>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${baselineLevel < 0 ? 'bg-red-500/10 text-red-400' : baselineLevel > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surfaceHighlight text-textMuted'}`}>
                  {baselineLevel > 0 ? '+' : ''}{baselineLevel}
                </span>
              </div>
              <p className="text-[9px] text-textMuted mb-3 leading-relaxed opacity-80">
                Calibrate your baseline level. Negative baselines represent overcoming hardship (-500), while positive represents advanced foundations (+500).
              </p>
              <input 
                type="range" 
                min="-500" 
                max="500" 
                value={baselineLevel}
                onChange={(e) => setBaselineLevel(Number(e.target.value))}
                className="w-full accent-primary bg-surfaceHighlight h-2 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[8px] font-bold text-textMuted uppercase mt-2">
                <span>-500 (Abyss)</span>
                <span>0 (Neutral)</span>
                <span>+500 (Apex)</span>
              </div>
            </div> */}

            {/* Active Buffs */}
            {/* <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Active Buffs</h4>
              <div className="space-y-2">
                {state.buffs.length > 0 ? state.buffs.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] font-bold text-textMain">{b.name}</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-black">x{b.multiplier}</span>
                  </div>
                )) : (
                  <p className="text-[10px] text-textMuted italic">No active buffs detected.</p>
                )}
              </div>
            </div> */}
          </div>
        </div>

        {/* Right: Neural Interface Theme & Objectives */}
        <div className="space-y-6">
          {/* Neural Interface Theme */}
          <div className="glass-panel p-6 sm:p-8 space-y-4 rounded-3xl border border-white/10">
            <h3 className="text-xs font-black text-textMain uppercase tracking-[0.2em] flex items-center">
              <Sparkles size={16} className="mr-2 text-primary" /> Neural Interface Theme
            </h3>
            <p className="text-[10px] text-textMuted font-medium uppercase tracking-wider">Select system color matrix & glow signature</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                    state.theme === t.id 
                      ? 'bg-white/10 border-primary text-textMain shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                      : 'bg-white/5 border-white/5 text-textMuted hover:border-white/20'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full ${t.color} shrink-0`} />
                  <span className="text-[10px] font-bold truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Strategic Mission Objectives */}
          <div className="glass-panel p-6 sm:p-8 space-y-4 rounded-3xl border border-white/10">
            <h3 className="text-xs font-black text-textMain uppercase tracking-[0.2em] flex items-center">
              <Target size={16} className="mr-2 text-primary" /> Strategic Mission Objectives
            </h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Define new objective..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-textMain focus:border-primary outline-none transition-all placeholder:text-white/20"
                  onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                />
                <button 
                  type="button"
                  onClick={addGoal}
                  className="aspect-square bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center min-w-[42px]"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {goals.map((goal, index) => (
                  <div 
                    key={index}
                    className="group flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-xs font-bold text-textMain truncate">{goal}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="p-1.5 text-textMuted hover:text-red-500 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {goals.length === 0 && (
                  <div className="text-center py-4 text-xs text-textMuted italic border border-dashed border-white/10 rounded-xl">
                    No strategic objectives active.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── #4 NEXT: NEURAL AI ENGINE & ADVANCED PROTOCOLS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Neural AI Engine (Google Gemini) */}
        <div className="glass-panel p-6 sm:p-8 space-y-6 relative overflow-hidden border border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-transparent rounded-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 text-purple-400 font-bold">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Cpu size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-textMain flex items-center gap-2">
                  Neural AI Engine (Google Gemini)
                  <Sparkles size={16} className="text-purple-400 animate-pulse" />
                </h2>
                <p className="text-[10px] text-textMuted uppercase tracking-wider font-semibold">Powers AI Arena Grading & Strategic Counsel</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {geminiKey ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Key Required
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-textMuted leading-relaxed">
            Provide your Google Gemini API Key to enable instant AI code grading in <strong className="text-textMain">The Arena</strong>, real-time <strong className="text-textMain">Strategic AI Counsel</strong>, and personalized biometric protocols. Your key is stored in your private browser vault and synced to your encrypted account profile.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-textMuted font-black uppercase tracking-widest flex items-center gap-1.5">
                <Key size={12} className="text-purple-400" />
                Gemini API Key
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                <span>Get Free API Key (Google AI Studio)</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <div className="relative">
              <input 
                type={showGeminiKey ? "text" : "password"} 
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setAiTestResult(null);
                }}
                placeholder="Paste your Gemini API key (AIzaSy...)"
                className="w-full bg-surfaceHighlight border border-border rounded-xl pl-4 pr-11 py-3 text-sm text-textMain outline-none focus:border-purple-500 font-mono transition-all"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain p-1 transition-colors"
              >
                {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {aiTestResult && (
              <div className={cn(
                "p-3 rounded-xl border text-xs font-semibold flex items-center gap-2",
                aiTestResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
              )}>
                <span>{aiTestResult.success ? "✓" : "⚠"}</span>
                <span>{aiTestResult.message}</span>
              </div>
            )}

            {aiKeySavedNotice && (
              <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <Check size={14} />
                <span>Gemini API Key saved and initialized successfully!</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                disabled={testingAi || !geminiKey.trim()}
                onClick={async () => {
                  setTestingAi(true);
                  setAiTestResult(null);
                  audio.playClick();
                  const res = await testGeminiApiKey(geminiKey);
                  setAiTestResult(res);
                  setTestingAi(false);
                  if (res.success) {
                    audio.playSuccess();
                    setGeminiApiKey(geminiKey);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{testingAi ? 'Testing Neural Link...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                disabled={!geminiKey.trim()}
                onClick={() => {
                  setGeminiApiKey(geminiKey);
                  audio.playSuccess();
                  setAiKeySavedNotice(true);
                  setTimeout(() => setAiKeySavedNotice(false), 3000);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                <span>Save AI Key</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Vitality & System Protocols */}
        <div className="space-y-6">

          {/* Vitality Parameters (Commented out as requested) */}
          {/* <div className="glass-panel p-6 sm:p-8 space-y-6 rounded-3xl border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-500 font-bold">
                <Activity size={20} />
                <h2>Vitality Parameters</h2>
              </div>
              <button 
                type="button"
                onClick={addHabit}
                className="flex items-center space-x-1 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-all"
              >
                <Plus size={14} /> <span>Add Habit</span>
              </button>
            </div>
            
            <div>
              <label className="text-xs text-textMuted font-bold uppercase tracking-wider mb-2 block">Target Weight (kg)</label>
              <input 
                type="number" 
                value={weightGoal}
                onChange={(e) => setWeightGoal(e.target.value)}
                className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3 text-textMain outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs text-textMuted font-bold uppercase tracking-wider mb-2 block">Daily Habits Tracking</label>
              <AnimatePresence>
                {habits.map((habit) => (
                  <motion.div 
                    key={habit.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-2 items-center"
                  >
                    <input 
                      type="text" 
                      value={habit.title}
                      placeholder="Habit Title"
                      onChange={(e) => handleHabitChange(habit.id, 'title', e.target.value)}
                      className="flex-1 bg-surfaceHighlight border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-emerald-500"
                    />
                    <button 
                      type="button"
                      onClick={() => removeHabit(habit.id)}
                      className="p-2 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div> */}

          {/* System Protocols */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 rounded-3xl border border-white/10">
            <div className="flex items-center space-x-2 text-primary font-bold">
              <Clock size={20} />
              <h2>System Protocols</h2>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <div>
                <p className="text-sm font-bold text-red-400">Reset All Progress</p>
                <p className="text-[10px] text-textMuted uppercase">Wipe all XP, levels, and logs (start fresh from 0)</p>
              </div>
              <button 
                type="button"
                onClick={async () => {
                  const confirmReset = window.confirm("Are you absolutely sure you want to reset all progress to 0 XP? This cannot be undone.");
                  if (confirmReset) {
                    audio.playClick();
                    await resetProgression();
                  }
                }}
                className="flex items-center space-x-1 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/30 transition-all"
              >
                <RotateCcw size={14} /> <span>Reset to 0 XP</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
