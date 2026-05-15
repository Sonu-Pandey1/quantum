import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shield, Star, Crown, Lock, Target, Zap, Heart, DollarSign, Brain, ChevronRight, Sparkles, Check } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { supabase } from '../lib/supabaseClient';

interface Reward {
  id: string;
  title: string;
  description: string;
  required_level: number;
  pillar: string;
  icon: string;
}

const BASE_RANKS = [
  { name: 'Void Walker', level: -500, icon: Target, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
  { name: 'Abyss Dweller', level: -400, icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { name: 'Shadow Initiate', level: -250, icon: Star, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { name: 'Lost Soul', level: -100, icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { name: 'Recovering Spirit', level: -50, icon: Heart, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { name: 'Novice', level: 0, icon: Shield, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  { name: 'Initiate', level: 1, icon: Shield, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20' },
  { name: 'Specialist', level: 5, icon: Star, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { name: 'Commander', level: 15, icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  { name: 'Elite Vanguard', level: 30, icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  { name: 'Grandmaster', level: 50, icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  { name: 'Legend', level: 75, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  { name: 'Mythic', level: 100, icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20' },
  { name: 'Ascendant', level: 150, icon: Crown, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
  { name: 'Demigod', level: 200, icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
  { name: 'Immortal', level: 300, icon: Shield, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/20' },
  { name: 'Celestial', level: 400, icon: Star, color: 'text-blue-300', bg: 'bg-blue-300/10', border: 'border-blue-300/20' },
  { name: 'Quantum Sovereign', level: 500, icon: Crown, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
];

function computeXpReq(targetLevel: number, baselineLevel: number) {
  const diff = targetLevel - baselineLevel - 1;
  if (diff <= 0) return 0;
  return Math.ceil(100 * Math.pow(diff, 1.5));
}

const ICONS: Record<string, any> = {
  Sun: Zap,
  Code: Target,
  DollarSign: DollarSign,
  Heart: Heart,
  Brain: Brain
};

export function RankAndRewards() {
  const { state } = useProgression();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    
    async function fetchRewards() {
      setLoading(true);
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('required_level', { ascending: true });
        
      if (!error && data) {
        setRewards(data);
      }
      setLoading(false);
    }
    
    fetchRewards();
  }, []);

  // Rank Calculation
  const dynamicRanks = BASE_RANKS.map(r => ({
    ...r,
    xpReq: computeXpReq(r.level, state.baselineLevel)
  }));

  let currentRankIndex = 0;
  for (let i = 0; i < dynamicRanks.length; i++) {
    if (state.totalLevel >= dynamicRanks[i].level) {
      currentRankIndex = i;
    }
  }
  
  const currentRank = dynamicRanks[currentRankIndex];
  const nextRank = currentRankIndex < dynamicRanks.length - 1 ? dynamicRanks[currentRankIndex + 1] : null;

  const currentRankXp = currentRank.xpReq;
  const nextRankXp = nextRank ? nextRank.xpReq : currentRank.xpReq;
  const progressPercent = nextRank 
    ? Math.max(0, Math.min(100, ((state.totalXp - currentRankXp) / (nextRankXp - currentRankXp)) * 100))
    : 100;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const activeNode = document.getElementById('rank-node-active');
      if (activeNode) {
        activeNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [currentRankIndex]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* ─── HERO BANNER ──────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[2rem] overflow-hidden bg-surface border border-border p-8 md:p-12 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -mt-20 -mr-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none -mb-20 -ml-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
          
          {/* Big Rank Badge */}
          <div className={`relative shrink-0 w-40 h-40 md:w-48 md:h-48 rounded-full ${currentRank.bg} border-4 ${currentRank.border} flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.3)]`}>
            <div className="absolute inset-0 rounded-full border-2 border-white/5 m-2" />
            <currentRank.icon className={`${currentRank.color} w-20 h-20 md:w-24 md:h-24 drop-shadow-[0_0_15px_currentColor]`} />
            <div className="absolute -bottom-4 bg-surfaceHighlight border border-border px-4 py-1.5 rounded-full shadow-xl">
              <span className="text-xs font-black uppercase tracking-widest text-textMain">Lvl {state.totalLevel}</span>
            </div>
          </div>

          {/* User Info & Progress */}
          <div className="flex-1 flex flex-col justify-center text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black text-textMain tracking-tight mb-2">
              {currentRank.name}
            </h1>
            <p className="text-textMuted text-lg mb-8 max-w-lg">
              You are currently ranked as a <span className={`font-bold ${currentRank.color}`}>{currentRank.name}</span>. Keep pushing forward to unlock elite privileges.
            </p>

            {nextRank ? (
              <div className="w-full max-w-xl">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-xs text-textMuted uppercase tracking-widest font-bold mb-1">Progress to {nextRank.name}</p>
                    <p className="text-2xl font-black text-textMain">{state.totalXp.toLocaleString()} <span className="text-sm font-medium text-textMuted">/ {nextRank.xpReq.toLocaleString()} XP</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-primary font-black text-xl">{Math.round(progressPercent)}%</span>
                  </div>
                </div>
                
                <div className="relative h-4 w-full bg-surfaceHighlight rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-blue-400"
                  >
                    <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30" />
                  </motion.div>
                </div>
                <p className="text-xs text-textMuted text-right mt-2 font-medium">
                  Earn <span className="text-primary font-bold">{(nextRank.xpReq - state.totalXp).toLocaleString()} XP</span> to rank up
                </p>
              </div>
            ) : (
              <div className="w-full max-w-xl p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-4">
                <Crown className="text-amber-400 shrink-0" size={32} />
                <div>
                  <h3 className="text-amber-400 font-bold">Maximum Rank Achieved</h3>
                  <p className="text-xs text-amber-500/70">You have reached the pinnacle of the system. Maintain your status.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>


      {/* ─── RANK TIMELINE ────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-8 rounded-3xl"
      >
        <h2 className="text-xl font-black text-textMain tracking-tight mb-8 flex items-center">
          <Target className="text-primary mr-3" />
          The Ascension Path
        </h2>

        <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
          <div className="relative flex flex-col sm:flex-row gap-8 sm:gap-0 sm:w-max px-4">
            {/* Background Line for Horizontal Scroll (Desktop) */}
            <div className="hidden sm:block absolute top-[24px] md:top-[32px] left-[80px] right-[80px] h-1.5 bg-surfaceHighlight/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{ width: `${(currentRankIndex / (dynamicRanks.length - 1)) * 100}%` }}
              />
            </div>

            {/* Background Line for Vertical List (Mobile) */}
            <div className="sm:hidden absolute left-[39px] top-8 bottom-8 w-1.5 bg-surfaceHighlight/50 rounded-full overflow-hidden">
              <div 
                className="w-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{ height: `${(currentRankIndex / (dynamicRanks.length - 1)) * 100}%` }}
              />
            </div>

            {dynamicRanks.map((rank, i) => {
              const isPassed = state.totalLevel >= rank.level;
              const isCurrent = i === currentRankIndex;
              const isFuture = !isPassed && !isCurrent;
              
              return (
                <div 
                  key={rank.name} 
                  id={isCurrent ? 'rank-node-active' : undefined}
                  className="relative z-10 flex sm:flex-col items-center sm:items-center gap-4 sm:gap-4 w-full sm:w-[160px] shrink-0 sm:text-center text-left"
                >
                  
                  {/* Node */}
                  <div className={`relative shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-500
                    ${isPassed && !isCurrent ? `${rank.bg} ${rank.border} shadow-lg` : ''} 
                    ${isCurrent ? `bg-surface border-primary scale-[1.15] shadow-[0_0_30px_rgba(59,130,246,0.3)]` : ''}
                    ${isFuture ? 'bg-surface border-surfaceHighlight opacity-40 grayscale' : ''}
                  `}>
                    <rank.icon size={isCurrent ? 28 : 24} className={`
                      ${isPassed && !isCurrent ? rank.color : ''}
                      ${isCurrent ? 'text-primary animate-pulse' : ''}
                      ${isFuture ? 'text-textMuted' : ''}
                    `} />
                    
                    {/* Checkmark for passed ranks */}
                    {isPassed && !isCurrent && (
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-background shadow-lg">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 sm:flex-none flex flex-col sm:items-center w-full">
                    <h4 className={`font-black whitespace-normal leading-tight mb-1 sm:h-10 text-sm md:text-base transition-colors duration-300
                      ${isCurrent ? 'text-primary' : isPassed ? 'text-textMain/90' : 'text-textMuted/50'}
                    `}>
                      {rank.name}
                    </h4>
                    <div className="flex items-center sm:justify-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition-colors
                        ${isCurrent ? 'bg-primary/20 text-primary' : isPassed ? 'bg-white/10 text-textMuted' : 'bg-surfaceHighlight text-textMuted/40'}
                      `}>
                        Lvl {rank.level}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                          <Zap size={10} className="mr-1" /> Active
                        </span>
                      )}
                    </div>
                    <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${isPassed ? 'text-textMuted/40' : 'text-textMuted/80'}`}>
                      {rank.xpReq.toLocaleString()} XP
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </motion.div>


      {/* ─── REWARDS GRID ─────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-8 rounded-3xl"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-xl font-black text-textMain tracking-tight flex items-center">
            <Crown className="text-amber-400 mr-3" />
            Unlockable Badges
          </h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
              {rewards.filter(r => state.totalLevel >= r.required_level).length} Unlocked
            </span>
            <span className="px-3 py-1 bg-surfaceHighlight text-textMuted border border-white/5 rounded-full text-xs font-bold">
              {rewards.filter(r => state.totalLevel < r.required_level).length} Locked
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const isUnlocked = state.totalLevel >= reward.required_level;
              const Icon = ICONS[reward.icon] || Target;
              
              return (
                <div 
                  key={reward.id} 
                  className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-3 group
                    ${isUnlocked 
                      ? 'bg-gradient-to-br from-surface to-surfaceHighlight border-white/10 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]' 
                      : 'bg-surface border-border/50 opacity-70 grayscale hover:grayscale-0 hover:opacity-100'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center border shadow-lg transition-transform group-hover:scale-110
                      ${isUnlocked ? 'bg-primary/10 border-primary/30' : 'bg-surfaceHighlight border-white/5'}
                    `}>
                      {isUnlocked ? (
                        <Icon className="text-primary" size={24} />
                      ) : (
                        <Lock className="text-textMuted" size={20} />
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border
                        ${isUnlocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surfaceHighlight text-textMuted border-white/5'}
                      `}>
                        {isUnlocked ? 'Unlocked' : `Requires Lvl ${reward.required_level}`}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className={`font-bold text-lg mb-1 ${isUnlocked ? 'text-textMain' : 'text-textMuted'}`}>
                      {reward.title}
                    </h5>
                    <p className="text-sm text-textMuted leading-relaxed">
                      {reward.description}
                    </p>
                  </div>
                  
                  {/* Progress bar for locked items */}
                  {!isUnlocked && (
                    <div className="mt-auto pt-4">
                      <div className="flex justify-between text-[10px] font-bold text-textMuted mb-1.5 uppercase tracking-wider">
                        <span>Progress</span>
                        <span>{Math.max(0, Math.round(((state.totalLevel - Math.min(0, state.baselineLevel)) / (reward.required_level - Math.min(0, state.baselineLevel))) * 100))}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surfaceHighlight rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-textMuted/30 transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, ((state.totalLevel - Math.min(0, state.baselineLevel)) / (reward.required_level - Math.min(0, state.baselineLevel))) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {rewards.length === 0 && (
              <div className="col-span-full p-12 flex flex-col items-center justify-center text-center bg-surface border border-dashed border-border rounded-2xl">
                <Target size={48} className="text-textMuted/50 mb-4" />
                <h3 className="text-lg font-bold text-textMain mb-2">No Badges Configured</h3>
                <p className="text-textMuted max-w-md">The SuperAdmin has not added any unlockable badges to the database yet.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

    </div>
  );
}
