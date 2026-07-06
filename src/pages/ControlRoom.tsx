import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Settings, Clock, Activity, Target, Plus, Trash2, Dumbbell, BookOpen, Briefcase, Brain, Pencil, Check, X, RotateCcw } from 'lucide-react';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';
import { cn } from '../lib/utils';
import { useProgression } from '../hooks/useProgression';

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

export function ControlRoom() {
  const { resetProgression } = useProgression();
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
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPillar, setNewTodoPillar] = useState<'Study' | 'Health' | 'Finance' | 'Mind'>('Study');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [newTodoRecurrence, setNewTodoRecurrence] = useState<'daily' | 'weekly' | 'monthly' | 'one-off'>('one-off');
  const [newTodoPriority, setNewTodoPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

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
      localStorage.setItem(`quantum_habits_${uid}`, JSON.stringify(habits));
      localStorage.setItem(`quantum_roadmap_${uid}`, JSON.stringify(roadmap));
      localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(todos));
      localStorage.setItem(`quantum_weight_goal_${uid}`, weightGoal);
      localStorage.setItem(`quantum_sap_target_${uid}`, sapTarget);
      localStorage.setItem(`quantum_sunday_rest_${uid}`, sundayRest.toString());

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

        setSavedMessage('Clearing existing schedule...');
        const { error: deleteError } = await supabase.from('timetable_tasks').delete().eq('user_id', currentUid);
        if (deleteError) {
          console.error("Supabase Timetable Clear Error:", deleteError);
          throw new Error(`Failed to clear timetable tasks: ${deleteError.message}`);
        }

        if (rowsToSave.length > 0) {
          setSavedMessage(`Synchronizing ${rowsToSave.length} schedule entries...`);
          const { error: insertError } = await supabase.from('timetable_tasks').insert(rowsToSave);
          if (insertError) {
            console.error("Supabase Bulk Insert Error:", insertError);
            throw new Error(`Failed to synchronize timetable tasks: ${insertError.message}`);
          }
        }

        setSavedMessage('Finished');
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Save to profiles settings column
      if (currentUid && supabase) {
        const { error } = await supabase.from('profiles').update({
          settings: {
            timetable: tasks,
            habits: habits,
            roadmap: roadmap,
            todos: todos,
            weightGoal,
            sapTarget,
            sundayRest
          }
        }).eq('id', currentUid);

        if (error) {
          console.error("Supabase Save Error:", error);
          throw new Error(`Cloud Sync Failed: ${error.message}`);
        }
      }

      audio.playSuccess();
      setSavedMessage('System Configuration Synchronized');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (e: any) {
      audio.playClick();
      setSavedMessage(`Error: ${e.message}`);
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
      start: defaultStart,
      end: defaultEnd,
      dayOfWeek: activeDay,
      category: derivedCategory,
      pillar: newPillar,
      isWeekend: isWknd,
      task_target: 'Medium',
      statusMsg: 'Executing Protocol...'
    };

    setTasks([...tasks, newTask]);
    setNewName('');
    setShowAddForm(false);
    audio.playSuccess();
  };

  const removeTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

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

  const handleRoadmapChange = (id: number, field: keyof RoadmapPhase, value: string) => {
    setRoadmap(roadmap.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRoadmapPhase = () => {
    const newId = roadmap.length > 0 ? Math.max(...roadmap.map(r => r.id)) + 1 : 1;
    setRoadmap([...roadmap, { id: newId, phase: `Phase ${newId}`, title: 'New Topic', desc: '...', status: 'LOCKED', type: 'locked' }]);
  };

  const removeRoadmapPhase = (id: number) => {
    setRoadmap(roadmap.filter(r => r.id !== id));
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
    setTodos(updated);
    
    // Auto-save immediately to prevent missing tasks in the Bento Checklist
    const uid = userId || 'default';
    localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(updated));
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
    
    setNewTodoTitle('');
    setNewTodoTime('');
    setNewTodoRecurrence('one-off');
    setNewTodoPriority('Medium');
    audio.playSuccess();
  };

  const removeTodo = async (id: number) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    
    // Auto-save immediately to prevent missing tasks in the Bento Checklist
    const uid = userId || 'default';
    localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(updated));
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
        console.error("Auto-save remove todo failed:", e);
      }
    }
    
    audio.playClick();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col h-full overflow-y-auto scrollbar-thin p-6 md:p-10 space-y-8"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-textMain">
          <Settings size={32} className="text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">The Control Room</h1>
        </div>
        
        <button 
          type="button"
          onClick={handleSave}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-primary/20 hover:bg-primary/30 text-primary px-6 py-3 rounded-xl font-bold transition-all border border-primary/50"
        >
          <Save size={18} />
          <span>Save Changes</span>
        </button>
      </div>

      {savedMessage && (
        <div className={`p-4 rounded-xl border font-bold ${savedMessage.includes('Error') ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'}`}>
          {savedMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Timetable Configuration */}
        <div className="glass-panel p-6 flex flex-col space-y-4 min-h-[600px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-primary font-bold">
              <Clock size={20} />
              <h2>Protocol Timetable Builder</h2>
            </div>
            <button 
              onClick={() => { audio.playClick(); setShowAddForm(!showAddForm); }}
              className="flex items-center space-x-1 text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg border border-primary/30 transition-all"
            >
              <Plus size={14} /> <span>{showAddForm ? 'Close panel' : 'Add Task'}</span>
            </button>
          </div>
          <p className="text-xs text-textMuted">Modify the exact execution blocks that drive The Engine.</p>

          {/* Add Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-surfaceHighlight/35 rounded-2xl border border-primary/20 space-y-4 my-2">
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

                  <div className="flex gap-2 justify-end pt-2">
                    <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-[10px] font-black uppercase text-textMuted hover:text-textMain transition-colors">Cancel</button>
                    <button onClick={handleAddTask} className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Add Task</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Day tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
              const isWknd = i === 0 || i === 6;
              const count = tasks.filter(t => t.dayOfWeek === i || t.dayOfWeek === undefined).length;
              return (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeDay === i
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-surfaceHighlight border-border text-textMuted hover:border-white/20'
                  } ${isWknd ? 'ring-1 ring-amber-500/20' : ''}`}
                >
                  <span>{d}</span>
                  {count > 0 && <span className="text-[8px] mt-0.5 opacity-60">{count}</span>}
                  {isWknd && <span className="text-[8px] text-amber-400">2×</span>}
                </button>
              );
            })}
          </div>
          {(activeDay === 0 || activeDay === 6) && (
            <p className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-1.5">
              ⚡ Weekend — optional bonus day. Tasks completed earn 2× XP.
            </p>
          )}
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
            <AnimatePresence>
              {tasks
                .filter(t => t.dayOfWeek === activeDay || t.dayOfWeek === undefined)
                .map((task) => {
                  const isEditing = editingTaskId === task.id;
                  
                  // Category configuration mapping
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
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-surfaceHighlight/30 border border-border p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative group hover:border-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Pillar Icon Badge */}
                          <div className={cn("p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border shrink-0", config.bg, config.border, config.color)}>
                            <config.icon size={18} className="sm:w-5 sm:h-5" />
                          </div>

                          {/* Task Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-xs sm:text-sm font-bold text-textMain truncate leading-snug">{task.title}</h4>
                              {task.isWeekend && (
                                <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded tracking-wider shrink-0">
                                  2× Wknd
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center text-[9px] sm:text-[10px] text-textMuted uppercase font-bold tracking-wider">
                              <span>{task.start} - {task.end}</span>
                              <span className="opacity-30">•</span>
                              <span>{durationStr}</span>
                              <span className="opacity-30">•</span>
                              <span className={config.color}>{config.label}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right side controls */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2.5 sm:pt-0 border-t border-white/5 sm:border-t-0">
                          {/* Priority XP shifting */}
                          <button
                            onClick={() => {
                              audio.playClick();
                              const next: Record<string, 'High' | 'Medium' | 'Low'> = { 'High': 'Medium', 'Medium': 'Low', 'Low': 'High' };
                              const nextPriority = next[task.task_target || 'Medium'];
                              handleTaskChange(task.id, 'task_target', nextPriority);
                            }}
                            className={cn(
                              "text-[8px] sm:text-[9px] font-black uppercase px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border transition-all hover:scale-105 active:scale-95",
                              task.task_target === 'High' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                              task.task_target === 'Medium' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                              'text-blue-400 border-blue-500/20 bg-blue-500/10'
                            )}
                          >
                            {task.task_target === 'High' ? '100 XP' : task.task_target === 'Medium' ? '60 XP' : '40 XP'}
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Inline Edit Pencil */}
                            <button
                              onClick={() => { audio.playClick(); setEditingTaskId(task.id); }}
                              className="p-1.5 sm:p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                              title="Edit all fields"
                            >
                              <Pencil size={14} className="sm:w-[15px] sm:h-[15px]" />
                            </button>

                            {/* Delete Button */}
                            <button 
                              onClick={() => { audio.playClick(); removeTask(task.id); }}
                              className="p-1.5 sm:p-2 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <Trash2 size={14} className="sm:w-[15px] sm:h-[15px]" />
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
                        className="bg-surfaceHighlight border border-primary/30 p-4 sm:p-5 rounded-2xl flex flex-col gap-3 sm:gap-4 relative"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Editing Task Protocol</span>
                          <button
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
                            onClick={() => { audio.playSuccess(); setEditingTaskId(null); }}
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary/20 border border-primary/50 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/30 transition-all animate-none"
                          >
                            <Check size={12} /> Apply Changes
                          </button>
                        </div>
                      </motion.div>
                    );
                  }
                })}
            </AnimatePresence>
            {tasks.filter(t => t.dayOfWeek === activeDay || t.dayOfWeek === undefined).length === 0 && (
              <div className="text-center p-8 text-textMuted text-sm border border-dashed border-border rounded-xl">
                No protocols for this day. Click "Add Task" to create one.
              </div>
            )}
          </div>
        </div>

        {/* System Variables */}
        <div className="space-y-8">
          
          {/* Weight & Habit Goal */}
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-500 font-bold">
                <Activity size={20} />
                <h2>Vitality Parameters</h2>
              </div>
              <button 
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
                      onClick={() => removeHabit(habit.id)}
                      className="p-2 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Daily Todo Protocol Deck */}
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-primary font-bold">
                <Clock size={20} className="text-primary" />
                <h2>Daily Todo Protocol Deck</h2>
              </div>
            </div>
            <p className="text-xs text-textMuted">Add one-off or day-based specific tasks to execute. They reset daily or archive when done.</p>

            {/* Todo Creation deck */}
            <div className="p-4 bg-surfaceHighlight/30 rounded-2xl border border-border space-y-4">
              <div>
                <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-60">Todo Description</label>
                <input 
                  type="text" 
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  placeholder="e.g. Complete math workbook, Fix ledger audit..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-textMain outline-none focus:border-primary placeholder:text-white/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-60">Time (Optional)</label>
                  <input 
                    type="time" 
                    value={newTodoTime}
                    onChange={(e) => setNewTodoTime(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm text-textMain outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-textMuted uppercase tracking-widest block mb-1 opacity-60">Related Pillar</label>
                  <select
                    value={newTodoPillar}
                    onChange={(e) => setNewTodoPillar(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-2 py-1.5 text-sm text-textMain font-bold outline-none focus:border-primary"
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
                    className="w-full bg-background border border-border rounded-xl px-2 py-1.5 text-sm text-textMain font-bold outline-none focus:border-primary"
                  >
                    <option value="High">🔴 High (100 XP)</option>
                    <option value="Medium">🟡 Medium (60 XP)</option>
                    <option value="Low">🔵 Low (40 XP)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-background/50 border border-border rounded-xl">
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
                  className="bg-background border border-border rounded-xl px-2 py-1.5 text-xs text-textMain font-bold outline-none focus:border-primary"
                >
                  <option value="one-off">🎯 One-Off</option>
                  <option value="daily">⚡ Daily</option>
                  <option value="weekly">📅 Weekly</option>
                  <option value="monthly">🌙 Monthly</option>
                </select>
              </div>

              <button
                onClick={addTodo}
                disabled={!newTodoTitle.trim()}
                className="w-full flex items-center justify-center space-x-1 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
              >
                <Plus size={14} /> <span>Schedule Todo</span>
              </button>
            </div>

            {/* Todo List for activeDay */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-textMuted uppercase tracking-widest block opacity-50">
                Active Todos ({['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][activeDay]})
              </span>
              
              <div className="max-h-60 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-surfaceHighlight">
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
                      return (
                        <motion.div
                          key={todo.id}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-3 p-3 bg-surfaceHighlight/30 border border-border rounded-xl relative group hover:border-white/10 transition-all duration-300"
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
                                '📅 Weekly Repeat'
                              }
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded border shrink-0",
                              todo.task_target === 'High' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                              todo.task_target === 'Low' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' :
                              'text-amber-400 border-amber-500/20 bg-amber-500/10'
                            )}>
                              {todo.task_target === 'High' ? '100 XP' : todo.task_target === 'Low' ? '40 XP' : '60 XP'}
                            </span>
                            <button
                              onClick={() => removeTodo(todo.id)}
                              className="p-1.5 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
                {todos.filter(t => {
                  const rec = t.recurrence || (t.isOneOff ? 'one-off' : 'weekly');
                  if (rec === 'daily' || rec === 'monthly' || rec === 'one-off') return true;
                  return t.dayOfWeek === activeDay;
                }).length === 0 && (
                  <div className="text-center py-6 text-textMuted text-xs border border-dashed border-border rounded-xl">
                    No custom todos scheduled for this day.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* System Protocols */}
          <div className="glass-panel p-6 space-y-6">
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

          {/* SAP Target & Syllabus Roadmap */}
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-500 font-bold">
                <Target size={20} />
                <h2>Career & Finance Objectives</h2>
              </div>
              <button 
                onClick={addRoadmapPhase}
                className="flex items-center space-x-1 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-all"
              >
                <Plus size={14} /> <span>Add Phase</span>
              </button>
            </div>

            <div>
              <label className="text-xs text-textMuted font-bold uppercase tracking-wider mb-2 block">Current Big Goal</label>
              <input 
                type="text" 
                value={sapTarget}
                onChange={(e) => setSapTarget(e.target.value)}
                className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3 text-textMain outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs text-textMuted font-bold uppercase tracking-wider mb-2 block">Syllabus Roadmap</label>
              <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-surfaceHighlight pr-2 space-y-3">
                <AnimatePresence>
                  {roadmap.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surfaceHighlight/50 border border-border p-3 rounded-xl flex flex-col gap-2 relative"
                    >
                      <div className="flex gap-2 w-full pr-6">
                        <input 
                          type="text" 
                          value={item.phase}
                          placeholder="Phase Name"
                          onChange={(e) => handleRoadmapChange(item.id, 'phase', e.target.value)}
                          className="w-1/3 bg-background border border-border rounded-lg px-2 py-1 text-xs text-textMain outline-none focus:border-amber-500"
                        />
                        <select
                          value={item.type}
                          onChange={(e) => handleRoadmapChange(item.id, 'type', e.target.value as any)}
                          className="w-2/3 bg-background border border-border rounded-lg px-2 py-1 text-xs text-textMain outline-none focus:border-amber-500"
                        >
                          <option value="locked">Locked</option>
                          <option value="current">Current</option>
                          <option value="partial">Completed</option>
                        </select>
                      </div>
                      
                      <input 
                        type="text" 
                        value={item.title}
                        placeholder="Title"
                        onChange={(e) => handleRoadmapChange(item.id, 'title', e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-textMain outline-none focus:border-amber-500"
                      />
                      <input 
                        type="text" 
                        value={item.desc}
                        placeholder="Description"
                        onChange={(e) => handleRoadmapChange(item.id, 'desc', e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-textMain outline-none focus:border-amber-500"
                      />
                      
                      <button 
                        onClick={() => removeRoadmapPhase(item.id)}
                        className="absolute top-2 right-2 p-1 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {roadmap.length === 0 && (
                  <div className="text-center p-4 text-textMuted text-xs border border-dashed border-border rounded-xl">
                    No roadmap items.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
