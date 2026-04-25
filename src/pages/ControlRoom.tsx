import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Settings, Clock, Activity, Target, Plus, Trash2 } from 'lucide-react';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';

interface TimetableTask {
  id: number;
  title: string;
  start: string;
  end: string;
  icon?: string;
  statusMsg?: string;
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

const defaultTasks: TimetableTask[] = [
  { id: 1, start: '05:00', end: '05:45', title: 'Wake Up & Refresh', statusMsg: 'System Initialization...', icon: 'Sun' },
  { id: 2, start: '05:45', end: '07:15', title: 'The Burn (Run 5km + 100 Pushups)', statusMsg: 'Physical Output Maximize...', icon: 'Activity' },
  { id: 3, start: '08:30', end: '17:30', title: 'Office Mission (Work & Communication)', statusMsg: 'Corporate Directive Active...', icon: 'Briefcase' },
  { id: 4, start: '18:10', end: '21:00', title: 'Deep Study (SAP ABAP Mastery)', statusMsg: 'Logic Building in Progress...', icon: 'Book' },
  { id: 5, start: '21:00', end: '22:00', title: 'Recovery (Dinner & Night Walk)', statusMsg: 'Nutritional Intake & Decompression...', icon: 'Moon' },
  { id: 6, start: '22:00', end: '23:59', title: 'Final Grind & System Review', statusMsg: 'Protocol Review & Shut Down...', icon: 'Lock' },
];

const defaultHabits: HabitTask[] = [
  { id: 1, title: '5KM Mission', icon: 'Footprints' },
  { id: 2, title: '100 Pushups', icon: 'Dumbbell' }
];

const defaultRoadmap: RoadmapPhase[] = [
  { id: 1, phase: 'Phase 1', title: 'ABAP Fundamentals', desc: 'Variables, Data Types, Internal Tables', status: '60% Complete', type: 'partial' },
  { id: 2, phase: 'Phase 2', title: 'Modularization', desc: 'Includes, Function Modules, Subroutines', status: 'CURRENT FOCUS', type: 'current' },
  { id: 3, phase: 'Phase 3', title: 'Advanced ABAP & RAP', desc: 'OData, CDS Views, RAP Business Objects', status: 'LOCKED', type: 'locked' }
];

export function ControlRoom() {
  const [tasks, setTasks] = useState<TimetableTask[]>(() => {
    try {
      const stored = localStorage.getItem('quantum_timetable');
      return stored ? JSON.parse(stored) : defaultTasks;
    } catch {
      return defaultTasks;
    }
  });
  const [habits, setHabits] = useState<HabitTask[]>(() => {
    try {
      const stored = localStorage.getItem('quantum_habits');
      return stored ? JSON.parse(stored) : defaultHabits;
    } catch {
      return defaultHabits;
    }
  });
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>(() => {
    try {
      const stored = localStorage.getItem('quantum_roadmap');
      return stored ? JSON.parse(stored) : defaultRoadmap;
    } catch {
      return defaultRoadmap;
    }
  });
  const [weightGoal, setWeightGoal] = useState(() => localStorage.getItem('quantum_weight_goal') || '70');
  const [sapTarget, setSapTarget] = useState(() => localStorage.getItem('quantum_sap_target') || 'Master ABAP Objects');
  const [savedMessage, setSavedMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

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
            if (s.timetable) setTasks(s.timetable);
            if (s.habits) setHabits(s.habits);
            if (s.roadmap) setRoadmap(s.roadmap);
            if (s.weightGoal) setWeightGoal(s.weightGoal.toString());
            if (s.sapTarget) setSapTarget(s.sapTarget);

            // Sync to local for offline support
            localStorage.setItem(`quantum_timetable_${uid}`, JSON.stringify(s.timetable));
            localStorage.setItem(`quantum_habits_${uid}`, JSON.stringify(s.habits));
            localStorage.setItem(`quantum_roadmap_${uid}`, JSON.stringify(s.roadmap));
            localStorage.setItem(`quantum_weight_goal_${uid}`, s.weightGoal.toString());
            localStorage.setItem(`quantum_sap_target_${uid}`, s.sapTarget);
            return;
          }
        } catch (e) {
          console.warn("Supabase settings fetch failed, trying local fallback.", e);
        }
      }

      // 2. Local Fallback (for guests or failed DB fetch)
      const t = localStorage.getItem(`quantum_timetable_${uid}`) || localStorage.getItem('quantum_timetable');
      if (t) { try { setTasks(JSON.parse(t)); } catch(e){} }

      const h = localStorage.getItem(`quantum_habits_${uid}`) || localStorage.getItem('quantum_habits');
      if (h) { try { setHabits(JSON.parse(h)); } catch(e){} }

      const r = localStorage.getItem(`quantum_roadmap_${uid}`) || localStorage.getItem('quantum_roadmap');
      if (r) { try { setRoadmap(JSON.parse(r)); } catch(e){} }

      const w = localStorage.getItem(`quantum_weight_goal_${uid}`) || localStorage.getItem('quantum_weight_goal');
      if (w) setWeightGoal(w);

      const s = localStorage.getItem(`quantum_sap_target_${uid}`) || localStorage.getItem('quantum_sap_target');
      if (s) setSapTarget(s);
    }
    loadUserConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSavedMessage('Synchronizing...');
      
      // Validation
      tasks.forEach((t, i) => { if(!t.title || !t.start || !t.end) throw new Error(`Task #${i+1} is incomplete`); });
      habits.forEach((h, i) => { if(!h.title) throw new Error(`Habit #${i+1} is missing title`); });

      const uid = userId || 'default';
      
      // Save Locally
      localStorage.setItem(`quantum_timetable_${uid}`, JSON.stringify(tasks));
      localStorage.setItem(`quantum_habits_${uid}`, JSON.stringify(habits));
      localStorage.setItem(`quantum_roadmap_${uid}`, JSON.stringify(roadmap));
      localStorage.setItem(`quantum_weight_goal_${uid}`, weightGoal);
      localStorage.setItem(`quantum_sap_target_${uid}`, sapTarget);

      // Save to Supabase
      if (userId && supabase) {
        const { error } = await supabase.from('profiles').update({
          settings: {
            timetable: tasks,
            habits: habits,
            roadmap: roadmap,
            weightGoal,
            sapTarget
          }
        }).eq('id', userId);

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

  const handleTaskChange = (id: number, field: keyof TimetableTask, value: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addTask = () => {
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    setTasks([...tasks, { id: newId, title: 'New Protocol', start: '12:00', end: '13:00' }]);
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Timetable Configuration */}
        <div className="glass-panel p-6 flex flex-col space-y-4 min-h-[600px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-primary font-bold">
              <Clock size={20} />
              <h2>Protocol Timetable Builder</h2>
            </div>
            <button 
              onClick={addTask}
              className="flex items-center space-x-1 text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg border border-primary/30 transition-all"
            >
              <Plus size={14} /> <span>Add Block</span>
            </button>
          </div>
          <p className="text-xs text-textMuted">Modify the exact execution blocks that drive The Engine.</p>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surfaceHighlight/50 border border-border p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-start sm:items-center relative group"
                >
                  <div className="flex-1 w-full">
                    <label className="text-[10px] text-textMuted font-bold uppercase tracking-wider mb-1 block">Task Title</label>
                    <input 
                      type="text" 
                      value={task.title}
                      onChange={(e) => handleTaskChange(task.id, 'title', e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div>
                      <label className="text-[10px] text-textMuted font-bold uppercase tracking-wider mb-1 block">Start</label>
                      <input 
                        type="time" 
                        value={task.start}
                        onChange={(e) => handleTaskChange(task.id, 'start', e.target.value)}
                        className="bg-background border border-border rounded-lg px-2 py-2 text-sm text-textMain outline-none focus:border-primary w-[90px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-textMuted font-bold uppercase tracking-wider mb-1 block">End</label>
                      <input 
                        type="time" 
                        value={task.end}
                        onChange={(e) => handleTaskChange(task.id, 'end', e.target.value)}
                        className="bg-background border border-border rounded-lg px-2 py-2 text-sm text-textMain outline-none focus:border-primary w-[90px]"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => removeTask(task.id)}
                    className="absolute top-2 right-2 sm:static sm:mt-5 p-2 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {tasks.length === 0 && (
              <div className="text-center p-8 text-textMuted text-sm border border-dashed border-border rounded-xl">
                No active protocols. Add a block to begin.
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
