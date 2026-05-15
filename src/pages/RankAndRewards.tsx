import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Shield, Star, Crown, Lock, Target, Zap,
  Heart, DollarSign, Brain, Sparkles, Check, TrendingUp
} from 'lucide-react';
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

// ─── Title milestones ──────────────────────────────────────────────────────────
// Titles unlock at these GLOBAL levels (totalLevel)
const TITLES = [
  { level: 1,   name: 'Novice',           icon: Shield,   color: 'text-gray-400',   bg: 'bg-gray-400/10',   border: 'border-gray-400/20',   glow: '' },
  { level: 5,   name: 'Apprentice',       icon: Star,     color: 'text-sky-400',    bg: 'bg-sky-400/10',    border: 'border-sky-400/20',    glow: 'shadow-sky-400/20' },
  { level: 10,  name: 'Specialist',       icon: Target,   color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   glow: 'shadow-blue-400/20' },
  { level: 20,  name: 'Analyst',          icon: TrendingUp,color:'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20', glow: 'shadow-violet-400/20' },
  { level: 30,  name: 'Commander',        icon: Trophy,   color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', glow: 'shadow-purple-400/30' },
  { level: 45,  name: 'Elite Vanguard',   icon: Zap,      color: 'text-emerald-400',bg: 'bg-emerald-400/10',border: 'border-emerald-400/20',glow: 'shadow-emerald-400/30' },
  { level: 60,  name: 'Grandmaster',      icon: Crown,    color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  glow: 'shadow-amber-400/30' },
  { level: 80,  name: 'Legend',           icon: Sparkles, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', glow: 'shadow-orange-400/40' },
  { level: 100, name: 'Mythic',           icon: Star,     color: 'text-pink-400',   bg: 'bg-pink-400/10',   border: 'border-pink-400/20',   glow: 'shadow-pink-400/40' },
  { level: 150, name: 'Ascendant',        icon: Crown,    color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20',   glow: 'shadow-cyan-400/50' },
  { level: 200, name: 'Quantum Sovereign',icon: Crown,    color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/30',    glow: 'shadow-primary/50' },
];

function getCurrentTitle(lvl: number) {
  let result = TITLES[0];
  for (const t of TITLES) { if (lvl >= t.level) result = t; }
  return result;
}
function getNextTitle(lvl: number) {
  return TITLES.find(t => t.level > lvl) ?? null;
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
  const thisTitle  = getCurrentTitle(globalLvl);
  const nextTitle  = getNextTitle(globalLvl);

  const currentLvlXp = xpForLevel(globalLvl);
  const nextLvlXp    = xpForLevel(globalLvl + 1);
  const xpIntoLevel  = globalXp - currentLvlXp;
  const xpNeeded     = nextLvlXp - currentLvlXp;
  const lvlProgress  = Math.min(100, Math.max(0, (xpIntoLevel / xpNeeded) * 100));

  const xpToNextTitle = nextTitle ? xpForLevel(nextTitle.level) - globalXp : 0;
  const titleProgress = nextTitle
    ? Math.min(100, Math.max(0, ((globalXp - xpForLevel(thisTitle.level)) / (xpForLevel(nextTitle.level) - xpForLevel(thisTitle.level))) * 100))
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
          <div className={`shrink-0 w-28 h-28 md:w-36 md:h-36 rounded-full ${thisTitle.bg} border-4 ${thisTitle.border} flex items-center justify-center shadow-[0_0_40px] ${thisTitle.glow}`}>
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
                <span className={`text-2xl font-black ${p.color}`}>Lv.{pLvl}</span>
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
                {(pNxtXp - pXp).toLocaleString()} XP to Lv.{pLvl + 1}
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
                const ci = ASCENSION_RANKS.findIndex((_, i) => {
                  const next = ASCENSION_RANKS[i + 1];
                  return state.totalLevel >= ASCENSION_RANKS[i].level && (!next || state.totalLevel < next.level);
                });
                return <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(ci / (ASCENSION_RANKS.length - 1)) * 100}%` }} />;
              })()}
            </div>

            {ASCENSION_RANKS.map((rank, i) => {
              const RIcon = rank.icon;
              const isPassed  = state.totalLevel >= rank.level;
              const nextRank  = ASCENSION_RANKS[i + 1];
              const isCurrent = isPassed && (!nextRank || state.totalLevel < nextRank.level);
              const isFuture  = !isPassed && !isCurrent;
              const reqXp     = rank.level > 0 ? xpForLevel(rank.level) : 0;
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
                    {rank.level > 0 ? `${reqXp.toLocaleString()} XP` : 'Penalty'}
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

    </div>
  );
}
