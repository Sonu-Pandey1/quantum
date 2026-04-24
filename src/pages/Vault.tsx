
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, TrendingUp, DollarSign, Wallet, 
  BarChart3, PieChart, ShieldCheck, ArrowUpRight, 
  Target, Zap, Lock
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';

export function Vault() {
  const { state: { xp, level } } = useProgression();
  const [, setActiveBlueprint] = useState<string | null>(null);

  const blueprints = [
    { id: 'tax', title: 'Tax Optimization Protocol', level: 5, icon: <ShieldCheck size={18} /> },
    { id: 'emergency', title: 'Emergency Reserve Setup', level: 2, icon: <ShieldCheck size={18} /> },
    { id: 'growth', title: 'Aggressive Growth Portfolio', level: 10, icon: <TrendingUp size={18} /> },
  ];

  return (
    <div className="flex-1 h-full flex flex-col p-6 md:p-8 overflow-y-auto scrollbar-thin bg-background/50">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
            <Briefcase size={32} className="text-yellow-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-textMain tracking-tighter">THE VAULT</h1>
            <p className="text-sm text-textMuted font-medium">Financial Command & Wealth Architecture</p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
          <Target size={16} className="text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500/80 uppercase tracking-widest text-[10px]">Matrix Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 border border-yellow-500/20 rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign size={120} className="text-yellow-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <h2 className="text-xs font-black text-yellow-500 uppercase tracking-[0.2em]">Finance Pillar</h2>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-6xl font-black text-textMain tracking-tighter">{level.Finance}</span>
              <span className="text-xl font-bold text-yellow-500/60 uppercase tracking-widest">Level</span>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Pillar Experience</p>
                <p className="text-xl font-mono text-textMain">{xp.Finance.toLocaleString()}<span className="text-textMuted text-sm ml-1">XP</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Rank</p>
                <p className="text-sm font-bold text-yellow-500 uppercase">{level.Finance >= 10 ? 'Magnate' : level.Finance >= 5 ? 'Strategist' : 'Saver'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Net Worth Architect (Bento Grid Style) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Wallet size={20} />
              </div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Liquidity</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-textMain mb-1">Cash Reserves</h3>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[65%]" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Growth</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-textMain mb-1">Equity Portfolio</h3>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[42%]" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-2xl md:col-span-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                  <BarChart3 size={20} />
                </div>
                <h3 className="text-sm font-bold text-textMain">Income Stream Matrix</h3>
              </div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-1 h-3 bg-yellow-500/20 rounded-full" style={{ height: `${Math.random() * 20 + 10}px` }} />
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-[10px] text-textMuted uppercase font-bold">Primary</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-textMuted uppercase font-bold">Dividends</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[10px] text-textMuted uppercase font-bold">Freelance</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* The Compounding Protocol (Interactive Visual) */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-8 border border-white/5 bg-black/40 rounded-3xl relative overflow-hidden h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-textMain flex items-center">
                  <Zap size={20} className="mr-2 text-yellow-500" /> The Compounding Protocol
                </h3>
                <p className="text-xs text-textMuted mt-1">Projecting total system value over time</p>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                <ArrowUpRight size={14} className="text-yellow-500" />
                <span className="text-[10px] font-bold text-yellow-500 uppercase">+12.4% Annualized</span>
              </div>
            </div>
            
            <div className="relative h-48 flex items-end justify-between px-4 pb-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${20 + (i * i * 0.8)}%` }}
                  transition={{ delay: i * 0.1 }}
                  className="w-8 md:w-12 bg-gradient-to-t from-yellow-500/5 to-yellow-500/40 rounded-t-lg relative group"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                    Yr {i + 1}
                  </div>
                </motion.div>
              ))}
              <div className="absolute inset-0 border-b border-white/10" />
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <div className="text-[10px] font-black text-textMuted uppercase mb-1">Time Horizon</div>
                <div className="text-lg font-mono text-textMain">15 Years</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <div className="text-[10px] font-black text-textMuted uppercase mb-1">Mastery Multiplier</div>
                <div className="text-lg font-mono text-textMain">x2.4</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <div className="text-[10px] font-black text-textMuted uppercase mb-1">Final Wealth</div>
                <div className="text-lg font-mono text-yellow-500 font-bold">$3.2M</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Blueprints (Unlockables) */}
        <div>
          <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl h-full">
            <div className="flex items-center space-x-2 mb-6">
              <PieChart size={18} className="text-textMuted" />
              <h3 className="text-sm font-black text-textMain uppercase tracking-widest">Financial Blueprints</h3>
            </div>
            <div className="space-y-3">
              {blueprints.map((bp) => {
                const isLocked = level.Finance < bp.level;
                return (
                  <button
                    key={bp.id}
                    onClick={() => !isLocked && setActiveBlueprint(bp.id)}
                    className={`w-full p-4 rounded-2xl border transition-all text-left relative group ${
                      isLocked 
                        ? 'bg-black/20 border-white/5 opacity-50 cursor-not-allowed' 
                        : 'bg-white/[0.03] border-white/10 hover:border-yellow-500/30 hover:bg-yellow-500/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isLocked ? 'bg-white/5 text-textMuted' : 'bg-yellow-500/10 text-yellow-500'}`}>
                          {isLocked ? <Lock size={16} /> : bp.icon}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isLocked ? 'text-textMuted' : 'text-textMain'}`}>{bp.title}</p>
                          <p className="text-[8px] font-black text-textMuted uppercase tracking-widest">Required Level: {bp.level}</p>
                        </div>
                      </div>
                      {!isLocked && <ArrowUpRight size={14} className="text-textMuted group-hover:text-yellow-500 transition-colors" />}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 text-center">
              <p className="text-[10px] text-yellow-500/60 font-medium leading-relaxed italic">
                "Technical mastery is the ultimate hedge against inflation."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
