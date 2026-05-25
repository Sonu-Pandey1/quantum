import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, HeartPulse, Dna, Zap, 
  Brain, Moon, Flame, Timer, 
  CheckCircle2, AlertCircle, 
  ChevronRight, Thermometer,
  Plus, Trash2, Sparkles, RefreshCw, Check
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { generateBioMissions, isApiKeyConfigured } from '../lib/aiService';
import { audio } from '../lib/audio';
import toast from 'react-hot-toast';

interface BioMission {
  id: string;
  title: string;
  xp: number;
  time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed?: boolean;
}

export function TheLab() {
  const { state, addXp } = useProgression();
  const { xp, level, archetype, goals, displayName } = state;

  // Local storage key scoped to current session user
  const storageKey = `quantum_bio_missions_${displayName || 'Agent'}`;

  const [missions, setMissions] = useState<BioMission[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: '1', title: 'Cold Exposure Protocol', xp: 50, time: '3 min', difficulty: 'Hard', completed: false },
      { id: '2', title: 'Deep Work Focus Block', xp: 30, time: '90 min', difficulty: 'Medium', completed: false },
      { id: '3', title: 'Sunlight Saturation', xp: 15, time: '15 min', difficulty: 'Easy', completed: false },
    ];
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDifficulty, setCustomDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [customDuration, setCustomDuration] = useState('15 min');
  const [generating, setGenerating] = useState(false);

  // Sync back to local storage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(missions));
  }, [missions, storageKey]);

  // Actions
  const handleAddCustom = () => {
    if (!customTitle.trim()) return;
    audio.playClick();

    const xpMap = { Easy: 15, Medium: 30, Hard: 50 };
    const newMission: BioMission = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      xp: xpMap[customDifficulty],
      time: customDuration,
      difficulty: customDifficulty,
      completed: false
    };

    setMissions(prev => [...prev, newMission]);
    setCustomTitle('');
    setShowAddForm(false);
    toast.success("Custom protocol added to bio-log!");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audio.playClick();
    setMissions(prev => prev.filter(m => m.id !== id));
    toast.success("Protocol removed from bio-log.");
  };

  const handleComplete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const mission = missions.find(m => m.id === id);
    if (!mission || mission.completed) return;

    audio.playSuccess();
    
    // Optimistic UI Update
    setMissions(prev => prev.map(m => m.id === id ? { ...m, completed: true } : m));

    // Award XP (Health Pillar)
    const label = `Lab: completed ${mission.title}`;
    const awarded = await addXp('Health', label, mission.xp);

    toast.success(`🎉 Bio-Protocol Mastered! +${awarded} Health XP`);
  };

  const handleGenerateAI = async () => {
    if (!isApiKeyConfigured()) {
      toast.error("Gemini API Key missing. Configure in Neural Strategy settings.");
      return;
    }

    setGenerating(true);
    audio.playClick();

    try {
      const generated = await generateBioMissions(
        archetype || 'None',
        level.Health || 1,
        Array.isArray(goals) ? goals.join(', ') : (goals || '')
      );

      const parsedMissions: BioMission[] = generated.map((m, idx) => ({
        id: `ai-${Date.now()}-${idx}`,
        title: m.title,
        xp: m.xpAward,
        time: m.timeRequired,
        difficulty: m.difficulty,
        completed: false
      }));

      setMissions(parsedMissions);
      toast.success("Bespoke AI Bio-Missions Calibrated!");
      audio.playSuccess();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to generate dynamic bio-hacking protocols.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col p-6 md:p-8 overflow-y-auto scrollbar-thin bg-background/50">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <Activity size={32} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-textMain tracking-tighter uppercase">The Lab</h1>
            <p className="text-sm text-textMuted font-medium uppercase tracking-widest text-[10px]">Vitality & Bio-Hack Command Room</p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <Zap size={16} className="text-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System Stable</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 border border-red-500/20 rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <HeartPulse size={120} className="text-red-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-xs font-black text-red-500 uppercase tracking-[0.2em]">Vitality Pillar</h2>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-6xl font-black text-textMain tracking-tighter">{level.Health}</span>
              <span className="text-xl font-bold text-red-500/60 uppercase tracking-widest">Level</span>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Vitality Score</p>
                <p className="text-xl font-mono text-textMain">{xp.Health.toLocaleString()}<span className="text-textMuted text-sm ml-1">XP</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Biological Rank</p>
                <p className="text-sm font-bold text-red-500 uppercase">{level.Health >= 10 ? 'Apex' : level.Health >= 5 ? 'Resilient' : 'Adept'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bio-Feedback Dashboard (Bento Grid) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between group cursor-pointer hover:bg-white/[0.04] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Moon size={20} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-indigo-500 uppercase block tracking-widest">Sleep Quality</span>
                <span className="text-xs text-textMuted font-mono">8h 12m</span>
              </div>
            </div>
            <div className="flex items-end justify-between h-8 space-x-1">
              {[40, 70, 45, 90, 65, 80, 75].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-500/20 rounded-t-sm relative group/bar">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="absolute bottom-0 w-full bg-indigo-500 rounded-t-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between group cursor-pointer hover:bg-white/[0.04] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <Flame size={20} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-orange-500 uppercase block tracking-widest">Active Burn</span>
                <span className="text-xs text-textMuted font-mono">452 kcal</span>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 h-full w-[78%]" />
              </div>
              <span className="text-[10px] font-bold text-textMain">78%</span>
            </div>
          </div>

          <div className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-2xl md:col-span-2 flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10 flex items-center space-x-6">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 flex items-center justify-center relative">
                <Brain size={24} className="text-emerald-500" />
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-textMain uppercase tracking-widest">Cognitive State</h3>
                <p className="text-xs text-textMuted max-w-[200px]">System ready for high-intensity logic practice. Peak window active.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <div className="text-center px-4">
                <p className="text-[8px] font-black text-textMuted uppercase">Focus</p>
                <p className="text-lg font-mono text-emerald-500 font-bold">92%</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center px-4">
                <p className="text-[8px] font-black text-textMuted uppercase">Clarity</p>
                <p className="text-lg font-mono text-blue-500 font-bold">High</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bio-Mission Engine */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-6 md:p-8 border border-white/5 bg-black/40 rounded-3xl h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-textMain flex items-center uppercase tracking-tighter">
                  <Timer size={20} className="mr-2 text-red-500" /> Bio-Mission Engine
                </h3>
                <p className="text-xs text-textMuted mt-1 uppercase tracking-widest">Daily protocols for biological optimization</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAI}
                  disabled={generating}
                  className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/40 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {generating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>{generating ? "Calibrating..." : "Calibrate AI"}</span>
                </button>
                
                <button
                  onClick={() => { audio.playClick(); setShowAddForm(!showAddForm); }}
                  className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Plus size={12} />
                  <span>Custom</span>
                </button>
              </div>
            </div>

            {/* Custom Mission Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-textMuted uppercase tracking-widest block mb-1">Protocol Title</label>
                      <input
                        type="text"
                        placeholder="e.g. 10min Box Breathing, Fasting Block..."
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-textMain focus:border-red-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-textMuted uppercase tracking-widest block mb-1">Difficulty</label>
                        <select
                          value={customDifficulty}
                          onChange={e => setCustomDifficulty(e.target.value as any)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-textMain focus:border-red-500 outline-none"
                        >
                          <option value="Easy" className="bg-surface">Easy (+15 XP)</option>
                          <option value="Medium" className="bg-surface">Medium (+30 XP)</option>
                          <option value="Hard" className="bg-surface">Hard (+50 XP)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-textMuted uppercase tracking-widest block mb-1">Duration</label>
                        <input
                          type="text"
                          placeholder="e.g. 15 min, 45 min..."
                          value={customDuration}
                          onChange={e => setCustomDuration(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-textMain focus:border-red-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-[9px] font-black uppercase text-textMuted hover:text-textMain">Cancel</button>
                      <button onClick={handleAddCustom} className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Install Protocol</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Missions List */}
            <div className="space-y-4">
              {missions.length === 0 ? (
                <div className="text-center py-12 text-textMuted border border-dashed border-white/5 rounded-2xl">
                  <Activity size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">No protocols Active</p>
                  <p className="text-[10px] opacity-60 mt-1">Click "Calibrate AI" or "Custom" to install bio-protocols!</p>
                </div>
              ) : (
                missions.map((m) => (
                  <div 
                    key={m.id} 
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden ${
                      m.completed 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-white/[0.03] border-white/5 hover:border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        m.completed 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-black/40 text-textMuted group-hover:text-red-500'
                      }`}>
                        {m.completed ? <Check size={18} /> : <Flame size={18} />}
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold truncate transition-all ${
                          m.completed ? 'line-through text-textMuted font-medium' : 'text-textMain'
                        }`}>{m.title}</h4>
                        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-textMuted">
                          <span>{m.time}</span>
                          <span>•</span>
                          <span className={m.difficulty === 'Hard' ? 'text-red-500' : m.difficulty === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}>{m.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 relative z-10">
                      <div className="text-right">
                        <p className={`text-xs font-black transition-colors ${m.completed ? 'text-emerald-400' : 'text-textMain'}`}>
                          +{m.xp} XP
                        </p>
                        <p className="text-[8px] text-textMuted font-bold uppercase tracking-widest">Health Pillar</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {!m.completed && (
                          <button 
                            onClick={(e) => handleComplete(m.id, e)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-500 transition-all cursor-pointer"
                            title="Complete protocol"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button 
                          onClick={(e) => handleDelete(m.id, e)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/25 hover:text-red-400 text-textMuted transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Remove protocol"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bio-Hacker's Log (Side Panel) */}
        <div>
          <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl h-full flex flex-col">
            <div className="flex items-center space-x-2 mb-6">
              <Dna size={18} className="text-red-500" />
              <h3 className="text-sm font-black text-textMain uppercase tracking-widest">Bio-Hacker's Log</h3>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-start space-x-3">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">System Warning</p>
                  <p className="text-[10px] text-textMuted leading-relaxed">
                    Cortisol spikes detected at 10 PM. Recommend magnesium protocol and 20min meditation.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-2 px-1">Recent Supplements</p>
                <div className="flex flex-wrap gap-2">
                  {['Magnesium', 'Creatine', 'Fish Oil', 'Ashwagandha'].map(s => (
                    <span key={s} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-textMain">{s}</span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Thermometer size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Hydration Matrix</span>
                  </div>
                  <span className="text-[10px] font-mono text-textMuted">2.4L / 3.5L</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-[68%]" />
                </div>
              </div>
            </div>

            <button className="mt-8 w-full py-3 bg-white/[0.03] border border-white/10 rounded-xl text-[10px] font-black text-textMain uppercase tracking-[0.2em] hover:bg-white/[0.05] flex items-center justify-center group transition-all">
              Full Diagnostics <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
