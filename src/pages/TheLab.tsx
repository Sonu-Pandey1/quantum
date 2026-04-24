import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, HeartPulse, Dna, Zap, 
  Brain, Moon, Flame, Timer, 
  CheckCircle2, AlertCircle, 
  ChevronRight, Thermometer
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';

export function TheLab() {
  const { state: { xp, level } } = useProgression();
  const [missions] = useState([
    { id: 1, title: 'Cold Exposure Protocol', xp: 50, time: '3 min', difficulty: 'Hard' },
    { id: 2, title: 'Deep Work Focus Block', xp: 30, time: '90 min', difficulty: 'Medium' },
    { id: 3, title: 'Sunlight Saturation', xp: 15, time: '15 min', difficulty: 'Easy' },
  ]);

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
          <div className="glass-panel p-8 border border-white/5 bg-black/40 rounded-3xl h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-textMain flex items-center uppercase tracking-tighter">
                  <Timer size={20} className="mr-2 text-red-500" /> Bio-Mission Engine
                </h3>
                <p className="text-xs text-textMuted mt-1 uppercase tracking-widest">Daily protocols for biological optimization</p>
              </div>
              <span className="text-[10px] font-black text-textMuted uppercase px-3 py-1 bg-white/5 rounded-full">Reset in 12h 45m</span>
            </div>

            <div className="space-y-4">
              {missions.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between group hover:border-red-500/30 transition-all cursor-pointer">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-textMuted group-hover:text-red-500 transition-colors">
                      <Flame size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-textMain">{m.title}</h4>
                      <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-textMuted">
                        <span>{m.time}</span>
                        <span>•</span>
                        <span className={m.difficulty === 'Hard' ? 'text-red-500' : m.difficulty === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}>{m.difficulty}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs font-black text-textMain">+{m.xp} XP</p>
                      <p className="text-[8px] text-textMuted font-bold uppercase tracking-widest">Health Pillar</p>
                    </div>
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-500 transition-all">
                      <CheckCircle2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
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
