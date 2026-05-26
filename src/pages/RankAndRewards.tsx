import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Shield, Star, Crown, Lock, Target, Zap,
  Heart, DollarSign, Brain, Sparkles, Check, TrendingUp,
  BrainCircuit, Copy
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { supabase } from '../lib/supabaseClient';
import { generateRankCalibrationInsights, isApiKeyConfigured } from '../lib/aiService';

interface Reward {
  id: string;
  title: string;
  description: string;
  required_level: number;
  pillar: string;
  icon: string;
}

const ICON_MAP: Record<string, any> = {
  Sun: Zap, Code: Target, DollarSign, Heart, Brain, Star, Crown, Trophy, Sparkles, Zap, Shield, Target
};

// Full Ascension Path: negative penalty ranks → positive achievement ranks
const ASCENSION_RANKS = [
  { name: 'Void Walker',       level: -500, icon: Target,   color: 'text-red-700',    bg: 'bg-red-700/10',    border: 'border-red-700/20' },
  { name: 'Abyss Dweller',     level: -400, icon: Shield,   color: 'text-red-600',    bg: 'bg-red-600/10',    border: 'border-red-600/20' },
  { name: 'Shadow Initiate',   level: -250, icon: Star,     color: 'text-rose-500',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20' },
  { name: 'Lost Soul',         level: -100, icon: Target,   color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { name: 'Recovering Spirit', level:  -50, icon: Heart,    color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  { name: 'Novice',            level:    1, icon: Shield,   color: 'text-gray-400',   bg: 'bg-gray-400/10',   border: 'border-gray-400/20' },
  { name: 'Apprentice',        level:    5, icon: Star,     color: 'text-sky-400',    bg: 'bg-sky-400/10',    border: 'border-sky-400/20' },
  { name: 'Specialist',        level:   10, icon: Target,   color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20' },
  { name: 'Analyst',           level:   20, icon: TrendingUp,color:'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20' },
  { name: 'Commander',         level:   30, icon: Trophy,   color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  { name: 'Elite Vanguard',    level:   45, icon: Zap,      color: 'text-emerald-400',bg: 'bg-emerald-400/10',border: 'border-emerald-400/20' },
  { name: 'Grandmaster',       level:   60, icon: Crown,    color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
  { name: 'Legend',            level:   80, icon: Sparkles, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  { name: 'Mythic',            level:  100, icon: Star,     color: 'text-pink-400',   bg: 'bg-pink-400/10',   border: 'border-pink-400/20' },
  { name: 'Ascendant',         level:  150, icon: Crown,    color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
  { name: 'Quantum Sovereign', level:  500, icon: Crown,    color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/30' },
];

// ─── Level formula (must match useProgression.tsx) ────────────────────────────
function xpForLevel(lvl: number): number {
  if (lvl <= 1) return 0;
  return Math.ceil(100 * Math.pow(lvl - 1, 1.5));
}
function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1;
}

// Symmetric helper functions for dynamic display level-to-raw level mapping
function getRawLevelFromDisplay(displayLvl: number, baselineOffset: number): number {
  if (baselineOffset >= 0) {
    return Math.max(1, displayLvl - baselineOffset);
  } else {
    if (displayLvl <= 0) {
      return 1 + Math.round((displayLvl - baselineOffset) * 99 / -baselineOffset);
    } else {
      return displayLvl + 100;
    }
  }
}


function getCurrentTitle(lvl: number) {
  let result = ASCENSION_RANKS[0]; // First rank as fallback
  for (const r of ASCENSION_RANKS) {
    if (lvl >= r.level) result = r;
  }
  return result;
}
function getNextTitle(lvl: number, baselineOffset: number) {
  // Only find ranks that are >= baselineOffset
  const activeRanks = ASCENSION_RANKS.filter(r => r.level >= baselineOffset);
  return activeRanks.find(r => r.level > lvl) ?? null;
}

// ─── Pillar config ─────────────────────────────────────────────────────────────
const PILLARS = [
  { key: 'Study'   as const, label: 'Study',   icon: Brain,       color: 'text-primary',     bar: 'from-primary to-blue-400' },
  { key: 'Health'  as const, label: 'Health',  icon: Heart,       color: 'text-emerald-400', bar: 'from-emerald-500 to-green-400' },
  { key: 'Finance' as const, label: 'Finance', icon: DollarSign,  color: 'text-amber-400',   bar: 'from-amber-500 to-yellow-400' },
  { key: 'Mind'    as const, label: 'Mind',    icon: Sparkles,    color: 'text-violet-400',  bar: 'from-violet-500 to-purple-400' },
];


export function RankAndRewards() {
  const { state } = useProgression();
  const [rewards, setRewards]   = useState<Reward[]>([]);
  const [rewardLoad, setRewardLoad] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // AI Rank Calibration Insights state
  const [aiReport, setAiReport] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [copying, setCopying] = useState<boolean>(false);

  useEffect(() => {
    // Load cached AI report if present
    const cached = localStorage.getItem(`quantum_rank_ai_report_${state.displayName || 'Agent'}`);
    if (cached) setAiReport(cached);
  }, [state.displayName]);

  const triggerRankAI = async () => {
    try {
      setAiLoading(true);
      const report = await generateRankCalibrationInsights(
        state.archetype,
        state.totalLevel,
        state.baselineLevel || 0,
        state.goals.join(', ')
      );
      setAiReport(report);
      localStorage.setItem(`quantum_rank_ai_report_${state.displayName || 'Agent'}`, report);
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success('Dossier compiled successfully.', {
          style: {
            background: '#050508',
            color: '#fff',
            border: '1px solid rgba(59, 130, 246, 0.5)',
          },
        });
      });
    } catch (err: any) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(err.message || 'AI Rank Calibration link failed.', {
          style: {
            background: '#050508',
            color: '#fff',
            border: '1px solid rgba(239, 68, 68, 0.5)',
          },
        });
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(aiReport);
    setCopying(true);
    import('react-hot-toast').then(({ default: toast }) => {
      toast.success('Dossier copied to neural clipboard.', {
        style: {
          background: '#050508',
          color: '#fff',
          border: '1px solid rgba(59, 130, 246, 0.5)',
        },
      });
    });
    setTimeout(() => setCopying(false), 2000);
  };

  useEffect(() => {
    if (!supabase) { setRewardLoad(false); return; }
    supabase.from('rewards').select('*').order('required_level', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setRewards(data);
        setRewardLoad(false);
      });
  }, []);

  // Scroll active rank node into view
  useEffect(() => {
    const t = setTimeout(() => {
      document.getElementById('rank-active-node')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 300);
    return () => clearTimeout(t);
  }, [state.totalLevel]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const globalLvl  = state.totalLevel;
  const globalXp   = state.totalXp;
  const baselineOffset = state.baselineLevel || 0;
  const rawLvl = getRawLevelFromDisplay(globalLvl, baselineOffset);

  const thisTitle  = getCurrentTitle(globalLvl);
  const nextTitle  = getNextTitle(globalLvl, baselineOffset);

  const currentLvlXp = xpForLevel(rawLvl);
  const nextLvlXp    = xpForLevel(rawLvl + 1);
  const xpIntoLevel  = globalXp - currentLvlXp;
  const xpNeeded     = nextLvlXp - currentLvlXp;
  const lvlProgress  = Math.min(100, Math.max(0, (xpIntoLevel / xpNeeded) * 100));

  const rawNextTitleLvl = nextTitle ? getRawLevelFromDisplay(nextTitle.level, baselineOffset) : 1;
  const rawThisTitleLvl = getRawLevelFromDisplay(thisTitle.level, baselineOffset);

  const xpToNextTitle = nextTitle ? Math.max(0, xpForLevel(rawNextTitleLvl) - globalXp) : 0;
  const titleProgress = nextTitle
    ? Math.min(100, Math.max(0, ((globalXp - xpForLevel(rawThisTitleLvl)) / (xpForLevel(rawNextTitleLvl) - xpForLevel(rawThisTitleLvl))) * 100))
    : 100;

  const TitleIcon = thisTitle.icon;


  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24">

      {/* ── HERO: Current Title & Level ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden bg-surface border border-border p-6 md:p-10 shadow-2xl"
      >
        {/* Glow bg */}
        <div className={`absolute inset-0 opacity-10 ${thisTitle.bg} blur-3xl`} />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">

          {/* Title badge */}
          <div className={`shrink-0 w-28 h-28 md:w-36 md:h-36 rounded-full ${thisTitle.bg} border-4 ${thisTitle.border} flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)]`}>
            <TitleIcon className={`${thisTitle.color} w-14 h-14 md:w-16 md:h-16`} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left w-full">
            <div className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Current Title</div>
            <h1 className={`text-3xl md:text-4xl font-black tracking-tight mb-1 ${thisTitle.color}`}>{thisTitle.name}</h1>
            <p className="text-textMuted text-sm mb-4">
              Global Level <span className="text-textMain font-black text-lg">{globalLvl}</span>
              &nbsp;·&nbsp;
              <span className="text-primary font-bold">{globalXp.toLocaleString()} XP</span> total
            </p>

            {/* Level progress bar */}
            <div className="w-full max-w-md">
              <div className="flex justify-between text-[11px] font-bold text-textMuted mb-1.5">
                <span>Level {globalLvl} → {globalLvl + 1}</span>
                <span className="text-primary">{xpIntoLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
              </div>
              <div className="h-3 bg-surfaceHighlight rounded-full overflow-hidden border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${lvlProgress}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                />
              </div>
              <div className="text-[10px] text-textMuted mt-1 text-right">
                <span className="text-primary font-bold">{(xpNeeded - xpIntoLevel).toLocaleString()} XP</span> to Level {globalLvl + 1}
              </div>
            </div>

            {/* Title progress bar */}
            {nextTitle && (
              <div className="w-full max-w-md mt-4">
                <div className="flex justify-between text-[11px] font-bold text-textMuted mb-1.5">
                  <span className="uppercase tracking-widest">Title progress → {nextTitle.name}</span>
                  <span className={nextTitle.color}>Unlocks at Lvl {nextTitle.level}</span>
                </div>
                <div className="h-2 bg-surfaceHighlight rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${titleProgress}%` }}
                    transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
                    className={`h-full bg-gradient-to-r ${
                      nextTitle.color.includes('amber') ? 'from-amber-500 to-yellow-400' :
                      nextTitle.color.includes('emerald') ? 'from-emerald-500 to-green-400' :
                      nextTitle.color.includes('purple') ? 'from-purple-500 to-violet-400' :
                      nextTitle.color.includes('pink') ? 'from-pink-500 to-rose-400' :
                      nextTitle.color.includes('cyan') ? 'from-cyan-500 to-sky-400' :
                      'from-primary to-blue-400'
                    } rounded-full`}
                  />
                </div>
                <div className="text-[10px] text-textMuted mt-1 text-right">
                  <span className={`font-bold ${nextTitle.color}`}>{xpToNextTitle.toLocaleString()} XP</span> to earn title
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── SYSTEM XP CALIBRATION CODEX ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-panel p-6 rounded-3xl border border-border relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
          <Zap size={120} className="text-primary" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary shrink-0">
            <Zap size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-textMain tracking-widest">System XP Calibration Codex</h3>
            <p className="text-[9px] text-textMuted uppercase tracking-wider font-semibold">Operational Rules & Anti-Exploit Security</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Base Weights */}
          <div className="p-4 rounded-2xl bg-surfaceHighlight/35 border border-white/5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-textMain uppercase tracking-wider">
              <Target size={14} className="text-primary" />
              <span>Base Task Weights</span>
            </div>
            <p className="text-[10px] text-textMuted leading-relaxed">XP earned for completing daily timetable tasks and Protocol Objectives (Todos):</p>
            <div className="space-y-1.5 font-mono text-[10px] font-bold">
              <div className="flex justify-between items-center bg-red-500/5 border border-red-500/10 rounded-lg p-1.5 px-2 text-red-400">
                <span>🔴 High Priority</span>
                <span>100 XP</span>
              </div>
              <div className="flex justify-between items-center bg-amber-500/5 border border-amber-500/10 rounded-lg p-1.5 px-2 text-amber-400">
                <span>🟡 Medium Priority</span>
                <span>60 XP</span>
              </div>
              <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/10 rounded-lg p-1.5 px-2 text-blue-400">
                <span>🔵 Low Priority</span>
                <span>40 XP</span>
              </div>
            </div>
          </div>

          {/* Temporal Multipliers */}
          <div className="p-4 rounded-2xl bg-surfaceHighlight/35 border border-white/5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-textMain uppercase tracking-wider">
              <TrendingUp size={14} className="text-emerald-400" />
              <span>Calibrated Buffs</span>
            </div>
            <p className="text-[10px] text-textMuted leading-relaxed">Dynamic temporal and identity multipliers that stack with base rewards:</p>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between items-start gap-2 border-b border-white/5 pb-1.5">
                <span className="font-bold text-textMain">⚡ Weekend Overdrive</span>
                <span className="text-amber-400 font-extrabold shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px]">2.0x MULTIPLIER</span>
              </div>
              <div className="flex justify-between items-start gap-2 border-b border-white/5 pb-1.5">
                <span className="font-bold text-textMain">🔥 Streak Momentum</span>
                <span className="text-primary font-extrabold shrink-0 bg-primary/10 px-1.5 py-0.5 rounded text-[9px]">1.5x MULTIPLIER (3+ days)</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="font-bold text-textMain">🧬 Archetype Resonance</span>
                <span className="text-purple-400 font-extrabold shrink-0 bg-purple-500/10 px-1.5 py-0.5 rounded text-[9px]">1.2x MULTIPLIER (matching)</span>
              </div>
            </div>
          </div>

          {/* Anti-Exploit Security */}
          <div className="p-4 rounded-2xl bg-surfaceHighlight/35 border border-white/5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-textMain uppercase tracking-wider">
              <Lock size={14} className="text-red-400" />
              <span>Synaptic Security Log</span>
            </div>
            <p className="text-[10px] text-textMuted leading-relaxed">Our master progression ledger protects neural stats from duplicate execution farming loops:</p>
            <div className="space-y-2 text-[10px] bg-red-950/10 border border-red-500/15 rounded-xl p-2.5">
              <div className="flex items-start gap-2 text-red-400 font-bold">
                <span className="text-[9px] uppercase tracking-wider">🔒 Anti-Farming Engaged</span>
              </div>
              <p className="text-[9px] text-textMuted leading-relaxed">
                Check-off/uncheck operations are tracked by a single-claim transaction ledger. Gaining XP triggers strictly ONCE per daily cycle or once ever per one-off target. Re-checking a toggled objective will not reward extra XP.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── PILLAR LEVELS ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {PILLARS.map(p => {
          const pXp   = state.xp[p.key] ?? 0;
          const pLvl  = levelFromXp(pXp);
          const pCurXp = xpForLevel(pLvl);
          const pNxtXp = xpForLevel(pLvl + 1);
          const pProg  = Math.min(100, Math.max(0, ((pXp - pCurXp) / (pNxtXp - pCurXp)) * 100));
          const PIcon  = p.icon;
          return (
            <div key={p.key} className="glass-panel p-4 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <PIcon size={16} className={p.color} />
                <span className="text-[10px] font-black uppercase tracking-widest text-textMuted">{p.label}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className={`text-2xl font-black ${p.color}`}>Lv.{pLvl + baselineOffset}</span>
                <span className="text-[10px] text-textMuted">{pXp.toLocaleString()} XP</span>
              </div>
              <div className="h-1.5 bg-surfaceHighlight rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pProg}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  className={`h-full bg-gradient-to-r ${p.bar} rounded-full`}
                />
              </div>
              <div className="text-[9px] text-textMuted">
                {(pNxtXp - pXp).toLocaleString()} XP to Lv.{pLvl + baselineOffset + 1}
              </div>
            </div>
          );
        })}
      </motion.div>



      {/* ── ASCENSION PATH SCROLLER ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-3xl p-6 md:p-8"
      >
        <h2 className="text-base font-black text-textMain uppercase tracking-widest mb-6 flex items-center gap-2">
          <Target className="text-primary" size={18} /> The Ascension Path
        </h2>

        <div ref={scrollRef} className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
          <div className="relative flex gap-0 w-max px-4">

            {/* Connecting line */}
            <div className="absolute top-[28px] left-[60px] right-[60px] h-1 bg-surfaceHighlight/50 rounded-full overflow-hidden">
              {(() => {
                const activeRanks = ASCENSION_RANKS.filter(r => r.level >= baselineOffset);
                const ci = activeRanks.findIndex((_, i) => {
                  const next = activeRanks[i + 1];
                  return state.totalLevel >= activeRanks[i].level && (!next || state.totalLevel < next.level);
                });
                return <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(ci / Math.max(1, activeRanks.length - 1)) * 100}%` }} />;
              })()}
            </div>

            {ASCENSION_RANKS.filter(r => r.level >= baselineOffset).map((rank, i, filteredList) => {
              const RIcon = rank.icon;
              const isPassed  = state.totalLevel >= rank.level;
              const nextRank  = filteredList[i + 1];
              const isCurrent = isPassed && (!nextRank || state.totalLevel < nextRank.level);
              const isFuture  = !isPassed && !isCurrent;
              
              const rawRankLvl = getRawLevelFromDisplay(rank.level, baselineOffset);
              const reqXp      = xpForLevel(rawRankLvl);
              return (
                <div
                  key={rank.name}
                  id={isCurrent ? 'rank-active-node' : undefined}
                  className="relative z-10 flex flex-col items-center w-[130px] shrink-0 text-center"
                >
                  {/* Node */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-[3px] transition-all duration-500 mb-3
                    ${isCurrent ? `bg-surface border-primary scale-110 shadow-[0_0_24px_rgba(59,130,246,0.4)]` : ''}
                    ${isPassed && !isCurrent ? `${rank.bg} ${rank.border}` : ''}
                    ${isFuture ? 'bg-surface border-surfaceHighlight opacity-30 grayscale' : ''}
                  `}>
                    <RIcon size={isCurrent ? 26 : 22} className={`
                      ${isCurrent ? 'text-primary animate-pulse' : ''}
                      ${isPassed && !isCurrent ? rank.color : ''}
                      ${isFuture ? 'text-textMuted' : ''}
                    `} />
                    {isPassed && !isCurrent && (
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-background">
                        <Check size={8} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <p className={`text-[10px] font-black leading-tight mb-1 h-8 flex items-center justify-center px-1
                    ${isCurrent ? 'text-primary' : isPassed ? 'text-textMain/80' : 'text-textMuted/40'}
                  `}>{rank.name}</p>

                  {/* Level chip */}
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full
                    ${isCurrent ? 'bg-primary/20 text-primary' : isPassed ? 'bg-white/10 text-textMuted' : 'bg-surfaceHighlight text-textMuted/30'}
                  `}>Lv. {rank.level}</span>

                  {/* XP req */}
                  <span className={`text-[9px] mt-1 ${isPassed ? 'text-textMuted/40' : 'text-textMuted/60'}`}>
                    {reqXp > 0 ? `${reqXp.toLocaleString()} XP` : 'Baseline'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── UNLOCKABLE BADGES ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-panel rounded-3xl p-6 md:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <h2 className="text-base font-black text-textMain uppercase tracking-widest flex items-center gap-2">
            <Crown className="text-amber-400" size={18} /> Unlockable Badges
          </h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase">
              {rewards.filter(r => state.totalLevel >= r.required_level).length} Unlocked
            </span>
            <span className="px-3 py-1 bg-surfaceHighlight text-textMuted border border-white/5 rounded-full text-[10px] font-black uppercase">
              {rewards.filter(r => state.totalLevel < r.required_level).length} Locked
            </span>
          </div>
        </div>

        {rewardLoad ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center bg-surface border border-dashed border-border rounded-2xl">
            <Target size={40} className="text-textMuted/40 mb-4" />
            <p className="text-textMuted text-sm">No badges configured yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map(reward => {
              const unlocked = state.totalLevel >= reward.required_level;
              const Icon = ICON_MAP[reward.icon] ?? Target;
              const pct = Math.min(100, Math.max(0, (state.totalLevel / reward.required_level) * 100));
              return (
                <div key={reward.id} className={`relative p-5 rounded-2xl border transition-all group flex flex-col gap-3
                  ${unlocked
                    ? 'bg-gradient-to-br from-surface to-surfaceHighlight border-white/10 hover:border-primary/30'
                    : 'bg-surface border-border/50 opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg transition-transform group-hover:scale-110
                      ${unlocked ? 'bg-primary/10 border-primary/30' : 'bg-surfaceHighlight border-white/5'}`}>
                      {unlocked ? <Icon className="text-primary" size={22} /> : <Lock className="text-textMuted" size={18} />}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border
                      ${unlocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surfaceHighlight text-textMuted border-white/5'}`}>
                      {unlocked ? 'Unlocked' : `Lv. ${reward.required_level}`}
                    </span>
                  </div>
                  <div>
                    <h5 className={`font-bold mb-1 ${unlocked ? 'text-textMain' : 'text-textMuted'}`}>{reward.title}</h5>
                    <p className="text-xs text-textMuted leading-relaxed">{reward.description}</p>
                  </div>
                  {!unlocked && (
                    <div className="mt-auto pt-2">
                      <div className="flex justify-between text-[9px] font-bold text-textMuted mb-1 uppercase tracking-wider">
                        <span>Progress</span><span>{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 bg-surfaceHighlight rounded-full overflow-hidden">
                        <div className="h-full bg-textMuted/30 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── AI RANK STRATEGY DOSSIER ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden group border border-primary/20"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <BrainCircuit size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-textMain uppercase tracking-widest">Ascension Strategist Calibration</h2>
              <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider">AI Synaptic Growth Diagnostics</p>
            </div>
          </div>

          <button
            onClick={triggerRankAI}
            disabled={aiLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/40 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
          >
            {aiLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                Synchronizing Core...
              </span>
            ) : aiReport ? 'Recalibrate Dossier' : 'Synthesize Ascension Strategy'}
          </button>
        </div>

        {!isApiKeyConfigured() ? (
          <div className="p-6 text-center bg-surface border border-dashed border-red-500/20 rounded-2xl">
            <Lock size={32} className="text-red-400 mx-auto mb-3" />
            <h4 className="text-xs font-black uppercase text-red-400 mb-1">Synaptic Core Offline</h4>
            <p className="text-[11px] text-textMuted max-w-md mx-auto leading-relaxed">
              No API Key detected. Please configure your masked Gemini Synaptic Key in the <span className="text-white font-bold">AI Counsel / Strategy workspace</span> to enable AI Rank Strategy calibrations.
            </p>
          </div>
        ) : aiLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-xs text-textMuted font-black uppercase tracking-widest animate-pulse">Calibrating synaptic nodes & projection curves...</p>
          </div>
        ) : aiReport ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-background/40 px-4 py-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-textMuted uppercase">Dossier status: Calibration Synced</span>
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 text-[10px] font-black text-textMuted hover:text-textMain transition-all uppercase tracking-wider"
              >
                <Copy size={12} />
                <span>{copying ? 'Copied' : 'Copy dossier'}</span>
              </button>
            </div>
            
            <div className="p-5 rounded-2xl bg-background/50 border border-white/5 max-h-[300px] overflow-y-auto scrollbar-thin text-xs text-textMuted leading-relaxed font-medium font-sans prose prose-invert max-w-none">
              {aiReport.split('\n').map((line, idx) => {
                if (line.trim().startsWith('### ')) {
                  return <h4 key={idx} className="text-textMain font-bold text-xs uppercase tracking-wider mt-4 mb-2">{line.replace('### ', '')}</h4>;
                }
                if (line.trim().startsWith('## ')) {
                  return <h3 key={idx} className="text-primary font-black text-sm uppercase tracking-widest mt-5 mb-2.5">{line.replace('## ', '')}</h3>;
                }
                if (line.trim().startsWith('# ')) {
                  return <h2 key={idx} className="text-primary font-black text-base uppercase tracking-widest mt-6 mb-3 border-b border-primary/20 pb-2">{line.replace('# ', '')}</h2>;
                }
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                  return <div key={idx} className="flex gap-2 pl-2 my-1 items-start"><span className="text-primary mt-1">•</span><span>{line.substring(2)}</span></div>;
                }
                if (line.trim().startsWith('1. ') || line.trim().startsWith('2. ') || line.trim().startsWith('3. ')) {
                  return <p key={idx} className="text-xs text-textMain/90 font-bold mt-3 mb-1.5">{line}</p>;
                }
                return <p key={idx} className="my-2">{line}</p>;
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-surface border border-dashed border-border rounded-2xl">
            <BrainCircuit size={40} className="text-textMuted/40 mx-auto mb-3" />
            <p className="text-xs text-textMuted max-w-md mx-auto leading-relaxed">
              Ascension strategy calibration diagnostics ready. Click <span className="text-primary font-bold">"Synthesize Ascension Strategy"</span> above to compile a custom routine calibration from the strategist core.
            </p>
          </div>
        )}
      </motion.div>

    </div>
  );
}
