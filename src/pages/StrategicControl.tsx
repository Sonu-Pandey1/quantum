
import { useState } from 'react';
import { 
  Target, Settings, Award, BrainCircuit, 
  Trash2, Plus, CheckCircle2,
  TrendingUp, Activity, Briefcase
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import type { Archetype } from '../hooks/useProgression';

export function StrategicControl() {
  const { state, updateProfile, setArchetype } = useProgression();
  const [userName, setUserName] = useState(state.displayName);
  const [goals, setGoals] = useState<string[]>(state.goals);
  const [newGoal, setNewGoal] = useState('');

  const saveSettings = async () => {
    await updateProfile({
      display_name: userName,
      goals: goals
    });
    alert('Strategic alignment synchronized with Neural Core.');
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 h-full flex flex-col p-4 sm:p-6 md:p-12 overflow-y-auto scrollbar-thin">
      <div className="max-w-5xl mx-auto w-full space-y-8 sm:y-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <BrainCircuit size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-textMain tracking-tighter uppercase italic">Strategic Control</h1>
              <p className="text-[10px] text-textMuted font-medium uppercase tracking-widest">Personal Growth Optimization Matrix</p>
            </div>
          </div>
          <button 
            onClick={saveSettings}
            className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            Save Alignment
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
          {/* Identity & Archetype */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-[10px] sm:text-xs font-black text-textMain uppercase tracking-[0.2em] flex items-center">
                <Settings size={18} className="mr-2 text-primary" /> Identity Profile
              </h3>
              
              <div className="space-y-6">
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

                <div>
                  <label className="block text-[10px] font-black text-textMuted uppercase tracking-widest mb-2">Active Archetype</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['Technical Elite', 'Wealth Architect', 'Vitality Vanguard'].map((a) => (
                      <button
                        key={a}
                        onClick={() => setArchetype(a as Archetype)}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
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
                        {state.archetype === a && <CheckCircle2 size={14} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-all" />
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Active Buffs</h4>
              <div className="space-y-2 relative z-10">
                {state.buffs.length > 0 ? state.buffs.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] font-bold text-textMain">{b.name}</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-black">x{b.multiplier}</span>
                  </div>
                )) : (
                  <p className="text-[10px] text-textMuted italic">No active buffs detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* Goals & Targets */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-panel p-5 sm:p-8 border border-white/5 bg-white/[0.01] rounded-3xl">
              <h3 className="text-[10px] sm:text-xs font-black text-textMain uppercase tracking-[0.2em] mb-6 flex items-center">
                <Target size={18} className="mr-2 text-primary" /> Strategic Mission Objectives
              </h3>
              
              <div className="space-y-6">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Define new objective..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary outline-none transition-all placeholder:text-white/20"
                    onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                  />
                  <button 
                    onClick={addGoal}
                    className="aspect-square bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center min-w-[48px]"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {goals.map((goal, index) => (
                    <div 
                      key={index}
                      className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-xs font-bold text-textMain truncate">{goal}</span>
                      </div>
                      <button 
                        onClick={() => removeGoal(index)}
                        className="p-2 text-textMuted hover:text-red-500 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-yellow-500/10 transition-all" />
                <h3 className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-4 flex items-center">
                  <Award size={14} className="mr-2 text-yellow-500" /> Current Rank
                </h3>
                <div className="flex items-baseline space-x-2 relative z-10">
                  <span className="text-3xl font-black text-textMain italic">{state.rank}</span>
                </div>
                <p className="text-[10px] text-textMuted mt-2">Next rank at level {state.totalLevel + (10 - (state.totalLevel % 10))}</p>
              </div>

              <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-500/10 transition-all" />
                <h3 className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-4 flex items-center">
                  <TrendingUp size={14} className="mr-2 text-emerald-500" /> System Growth
                </h3>
                <div className="flex items-baseline space-x-2 relative z-10">
                  <span className="text-3xl font-black text-emerald-500 italic">+{Math.floor(state.totalXp / 100)}%</span>
                </div>
                <p className="text-[10px] text-textMuted mt-2">Total efficiency since initialization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
