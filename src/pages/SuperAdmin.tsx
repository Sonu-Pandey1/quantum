
import { useState } from 'react';
import { 
  ShieldAlert, Users, Database, 
  Zap, Globe, Activity, Lock, Save, 
  RefreshCcw, AlertTriangle
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';

export function SuperAdmin() {
  const { state } = useProgression();
  const [xpMultiplier, setXpMultiplier] = useState(1.0);
  const [isGlobalEvent, setIsGlobalEvent] = useState(false);

  if (state.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <Lock size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-textMain uppercase italic">ACCESS DENIED</h1>
        <p className="text-textMuted max-w-sm mt-2">Neural clearance Level 5 required. Your current credentials do not permit entry to the Architect Console.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col p-6 md:p-8 overflow-y-auto scrollbar-thin">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-textMain tracking-tighter uppercase italic">Architect Console</h1>
            <p className="text-sm text-textMuted font-medium uppercase tracking-widest text-[10px]">Super Admin Root Access</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
            <RefreshCcw size={14} />
            <span>Reset Cache</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all">
            <Save size={14} />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Economy Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl">
            <h3 className="text-sm font-black text-textMain uppercase tracking-widest mb-6 flex items-center">
              <Globe size={18} className="mr-2 text-primary" /> Global Economy Control
            </h3>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-black text-textMuted uppercase">Global XP Multiplier</label>
                  <span className="text-xl font-mono font-bold text-primary">{xpMultiplier.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="5.0" 
                  step="0.1" 
                  value={xpMultiplier}
                  onChange={(e) => setXpMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between mt-2 text-[10px] text-textMuted font-bold uppercase">
                  <span>Economic Reset (0.5x)</span>
                  <span>Hyper Growth (5.0x)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg transition-all ${isGlobalEvent ? 'bg-primary text-white animate-pulse' : 'bg-white/5 text-textMuted'}`}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-textMain">Double XP Global Event</h4>
                    <p className="text-[10px] text-textMuted uppercase font-bold tracking-widest">Active globally for all operators</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsGlobalEvent(!isGlobalEvent)}
                  className={`w-12 h-6 rounded-full transition-all relative ${isGlobalEvent ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isGlobalEvent ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl">
              <h3 className="text-sm font-black text-textMain uppercase tracking-widest mb-6 flex items-center">
                <Database size={18} className="mr-2 text-yellow-500" /> Database Management
              </h3>
              <div className="space-y-3">
                <button className="w-full p-4 rounded-xl bg-white/5 border border-white/5 hover:border-yellow-500/30 text-left transition-all">
                  <p className="text-xs font-bold text-textMain">Sync Profiles</p>
                  <p className="text-[10px] text-textMuted">Recalculate levels for all users</p>
                </button>
                <button className="w-full p-4 rounded-xl bg-white/5 border border-white/5 hover:border-red-500/30 text-left transition-all">
                  <p className="text-xs font-bold text-textMain">Clear Activity Logs</p>
                  <p className="text-[10px] text-textMuted">Remove logs older than 90 days</p>
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl">
              <h3 className="text-sm font-black text-textMain uppercase tracking-widest mb-6 flex items-center">
                <Users size={18} className="mr-2 text-emerald-500" /> User Oversight
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-textMuted uppercase">Active Sessions</span>
                  <span className="text-sm font-mono font-bold text-emerald-500">124</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-textMuted uppercase">New Joins (24h)</span>
                  <span className="text-sm font-mono font-bold text-emerald-500">+12</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Monitoring */}
        <div className="space-y-6">
          <div className="glass-panel p-6 border border-white/5 bg-black/40 rounded-3xl h-full">
            <h3 className="text-sm font-black text-textMain uppercase tracking-widest mb-6 flex items-center">
              <Activity size={18} className="mr-2 text-red-500" /> System Health
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-bold text-textMuted uppercase">CPU Utilization</span>
                  <span className="text-[10px] font-mono text-emerald-500">12%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[12%]" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-bold text-textMuted uppercase">Memory Load</span>
                  <span className="text-[10px] font-mono text-amber-500">42%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[42%]" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-textMuted uppercase">Security Logs</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="text-[8px] font-mono text-textMuted/60 leading-relaxed border-l border-white/10 pl-2">
                      [SYS] 2026-04-24 23:14:02: Connection established from 192.168.1.{i}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-2 italic">⚠️ Danger Zone</p>
              <button className="w-full py-2 bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all">
                Wipe User Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
