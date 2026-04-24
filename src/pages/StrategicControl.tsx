
import { useState } from 'react';
import { 
  Target, Settings, Award, BrainCircuit, 
  Trash2, Plus, CheckCircle2,
  TrendingUp, Activity, Briefcase
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import type { Archetype } from '../hooks/useProgression';

export function StrategicControl() {
  const { state, setArchetype } = useProgression();
  const [userName, setUserName] = useState(localStorage.getItem('quantum_user_name') || '');
  const [goals, setGoals] = useState<string[]>(JSON.parse(localStorage.getItem('quantum_user_goals') || '[]'));
  const [newGoal, setNewGoal] = useState('');

  const saveSettings = () => {
    localStorage.setItem('quantum_user_name', userName);
    localStorage.setItem('quantum_user_goals', JSON.stringify(goals));
    alert('Strategic alignment saved.');
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
    <div className="flex-1 h-full flex flex-col p-6 md:p-12 overflow-y-auto scrollbar-thin">
      <div className="max-w-5xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <BrainCircuit size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-textMain tracking-tighter uppercase italic">Strategic Control</h1>
              <p className="text-sm text-textMuted font-medium uppercase tracking-widest text-[10px]">Personal Growth Optimization Matrix</p>
            </div>
          </div>
          <button 
            onClick={saveSettings}
            className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all"
          >
            Save Alignment
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Identity & Archetype */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-sm font-black text-textMain uppercase tracking-widest flex items-center">
                <Settings size={18} className="mr-2 text-primary" /> Identity Profile
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-textMuted uppercase tracking-widest mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary outline-none transition-all"
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
                            ? 'bg-primary/20 border-primary text-textMain' 
                            : 'bg-white/5 border-white/10 text-textMuted hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {a === 'Technical Elite' && <TrendingUp size={16} />}
                          {a === 'Wealth Architect' && <Briefcase size={16} />}
                          {a === 'Vitality Vanguard' && <Activity size={16} />}
                          <span className="text-xs font-bold">{a}</span>
                        </div>
                        {state.archetype === a && <CheckCircle2 size={14} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Active Buffs</h4>
              <div className="space-y-2">
                {state.buffs.length > 0 ? state.buffs.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-[10px] font-bold text-textMain">{b.name}</span>
                    <span className="text-[10px] font-mono text-emerald-500">x{b.multiplier}</span>
                  </div>
                )) : (
                  <p className="text-[10px] text-textMuted italic">No active buffs detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* Goals & Targets */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-panel p-8 border border-white/5 bg-white/[0.01] rounded-3xl">
              <h3 className="text-sm font-black text-textMain uppercase tracking-widest mb-6 flex items-center">
                <Target size={18} className="mr-2 text-primary" /> Strategic Mission Objectives
              </h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Define new objective..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                  />
                  <button 
                    onClick={addGoal}
                    className="p-3 bg-primary text-white rounded-xl hover:scale-105 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  {goals.map((goal, index) => (
                    <div 
                      key={index}
                      className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-xs font-bold text-textMain">{goal}</span>
                      </div>
                      <button 
                        onClick={() => removeGoal(index)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-textMuted hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl">
                <h3 className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-4 flex items-center">
                  <Award size={14} className="mr-2 text-yellow-500" /> Current Rank
                </h3>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-textMain italic">{state.rank}</span>
                </div>
                <p className="text-[10px] text-textMuted mt-2">Next rank at level {state.totalLevel + (10 - (state.totalLevel % 10))}</p>
              </div>

              <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl">
                <h3 className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-4 flex items-center">
                  <TrendingUp size={14} className="mr-2 text-emerald-500" /> System Growth
                </h3>
                <div className="flex items-baseline space-x-2">
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
