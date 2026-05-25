import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

export type Pillar = 'Study' | 'Health' | 'Finance' | 'Mind';

// Option A baseline fix: baseline is a DISPLAY-ONLY label shift.
// Raw level always starts at 1 from 0 XP — same formula for everyone.
// baselineOffset is ADDED to the display label only.
// e.g. baseline=-500, 0XP => displayed as level -499 (not affecting XP math)
function rawLevel(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1;
}
function calculateLevel(xp: number, baselineOffset: number = 0): number {
  return rawLevel(xp) + baselineOffset;
}
// ── Badge definitions — auto-awarded when totalXp / totalLevel hits threshold ─
export interface Badge { id: string; name: string; desc: string; icon: string; }
export const BADGES: Badge[] = [
  // ── XP milestones
  { id: 'first_xp',       name: 'First Step',         desc: 'Earn your first XP',                    icon: '⚡' },
  { id: 'xp_100',         name: 'Century',             desc: 'Earn 100 total XP',                     icon: '💯' },
  { id: 'xp_500',         name: 'Rising Star',         desc: 'Earn 500 total XP',                     icon: '🌟' },
  { id: 'xp_1000',        name: 'Power User',          desc: 'Earn 1,000 total XP',                   icon: '🔋' },
  { id: 'xp_2500',        name: 'Grinder',             desc: 'Earn 2,500 total XP',                   icon: '⚙️' },
  { id: 'xp_5000',        name: 'Momentum Engine',     desc: 'Earn 5,000 total XP',                   icon: '🚀' },
  { id: 'xp_10000',       name: 'XP Titan',            desc: 'Earn 10,000 total XP',                  icon: '🏆' },
  { id: 'xp_25000',       name: 'Quantum Grinder',     desc: 'Earn 25,000 total XP',                  icon: '💎' },
  { id: 'xp_50000',       name: 'Legend Status',       desc: 'Earn 50,000 total XP',                  icon: '👑' },
  { id: 'xp_100000',      name: 'Transcendent',        desc: 'Earn 100,000 total XP',                 icon: '🌌' },
  // ── Level milestones
  { id: 'lvl_3',          name: 'Getting Started',     desc: 'Reach Level 3',                         icon: '🌱' },
  { id: 'lvl_5',          name: 'Apprentice',          desc: 'Reach Level 5',                         icon: '🎯' },
  { id: 'lvl_10',         name: 'Specialist',          desc: 'Reach Level 10',                        icon: '🔵' },
  { id: 'lvl_15',         name: 'Rising Analyst',      desc: 'Reach Level 15',                        icon: '📊' },
  { id: 'lvl_20',         name: 'Analyst',             desc: 'Reach Level 20',                        icon: '🟣' },
  { id: 'lvl_30',         name: 'Commander',           desc: 'Reach Level 30',                        icon: '⚔️' },
  { id: 'lvl_45',         name: 'Elite Vanguard',      desc: 'Reach Level 45',                        icon: '🦅' },
  { id: 'lvl_60',         name: 'Grandmaster',         desc: 'Reach Level 60',                        icon: '🧠' },
  { id: 'lvl_80',         name: 'Legend',              desc: 'Reach Level 80',                        icon: '🌠' },
  { id: 'lvl_100',        name: 'Mythic',              desc: 'Reach Level 100',                       icon: '🌌' },
  // ── Streak milestones
  { id: 'streak_2',       name: 'Back to Back',        desc: '2-day activity streak',                 icon: '✌️' },
  { id: 'streak_3',       name: 'On a Roll',           desc: '3-day activity streak',                 icon: '🔥' },
  { id: 'streak_7',       name: 'Week Warrior',        desc: '7-day activity streak',                 icon: '📅' },
  { id: 'streak_14',      name: 'Two-Week Titan',      desc: '14-day activity streak',                icon: '🔗' },
  { id: 'streak_30',      name: 'Iron Discipline',     desc: '30-day activity streak',                icon: '🧲' },
  { id: 'streak_60',      name: 'Unstoppable',         desc: '60-day activity streak',                icon: '🌪️' },
  // ── Timetable / consistency
  { id: 'timetable_pro',  name: 'Timetable Pro',       desc: 'Claim your first daily bonus',          icon: '📋' },
  { id: 'perfectionist',  name: 'Perfectionist',       desc: 'Complete 100% of a day\'s tasks',       icon: '✨' },
  { id: 'disciplined',    name: 'Disciplined',         desc: 'Complete 80%+ tasks 5 days',            icon: '🎖️' },
  { id: 'weekend_warrior',name: 'Weekend Warrior',     desc: 'Complete 80%+ tasks on a weekend',      icon: '🏖️' },
  { id: 'consistency_10', name: 'Consistent',          desc: 'Use timetable 10 days in a row',        icon: '📆' },
  // ── Action-specific
  { id: 'first_solve',    name: 'First Blood',         desc: 'Solve your first question',             icon: '🩸' },
  { id: 'speed_demon',    name: 'Speed Demon',         desc: 'Earn a speed bonus on an answer',       icon: '💨' },
  { id: 'logic_master',   name: 'Logic Master',        desc: 'Complete a Logic Hub problem',          icon: '🧩' },
  { id: 'pattern_eye',    name: 'Pattern Eye',         desc: 'Complete a Pattern Dojo session',       icon: '👁️' },
  { id: 'lab_rat',        name: 'Lab Rat',             desc: 'Complete a Bio-Mission',                icon: '🔬' },
  { id: 'night_owl',      name: 'Night Owl',           desc: 'Study after 10 PM',                     icon: '🦉' },
  { id: 'early_bird',     name: 'Early Bird',          desc: 'Study before 6 AM',                     icon: '🐦' },
  { id: 'engine_master',  name: 'Engine Master',       desc: 'Complete a Progression Engine task',    icon: '⚙️' },
  { id: 'practice_10',    name: 'Practice Addict',     desc: 'Solve 10 practice questions',           icon: '📝' },
  { id: 'deep_focus',     name: 'Deep Focus',          desc: 'Log a 60+ minute study task',           icon: '🧘' },
];

// Map badge id → condition checker (returns true if this action triggers the badge)
function checkBadgeTriggers(
  badgeId: string,
  opts: { totalXp: number; newTotalXp: number; oldLevel: number; newLevel: number; streak: number; actionType: string; }
): boolean {
  const { totalXp, newTotalXp, oldLevel, newLevel, streak, actionType } = opts;
  const hour = new Date().getHours();
  switch (badgeId) {
    // XP
    case 'first_xp':       return totalXp === 0 && newTotalXp > 0;
    case 'xp_100':         return totalXp < 100 && newTotalXp >= 100;
    case 'xp_500':         return totalXp < 500 && newTotalXp >= 500;
    case 'xp_1000':        return totalXp < 1000 && newTotalXp >= 1000;
    case 'xp_2500':        return totalXp < 2500 && newTotalXp >= 2500;
    case 'xp_5000':        return totalXp < 5000 && newTotalXp >= 5000;
    case 'xp_10000':       return totalXp < 10000 && newTotalXp >= 10000;
    case 'xp_25000':       return totalXp < 25000 && newTotalXp >= 25000;
    case 'xp_50000':       return totalXp < 50000 && newTotalXp >= 50000;
    case 'xp_100000':      return totalXp < 100000 && newTotalXp >= 100000;
    // Levels
    case 'lvl_3':          return oldLevel < 3 && newLevel >= 3;
    case 'lvl_5':          return oldLevel < 5 && newLevel >= 5;
    case 'lvl_10':         return oldLevel < 10 && newLevel >= 10;
    case 'lvl_15':         return oldLevel < 15 && newLevel >= 15;
    case 'lvl_20':         return oldLevel < 20 && newLevel >= 20;
    case 'lvl_30':         return oldLevel < 30 && newLevel >= 30;
    case 'lvl_45':         return oldLevel < 45 && newLevel >= 45;
    case 'lvl_60':         return oldLevel < 60 && newLevel >= 60;
    case 'lvl_80':         return oldLevel < 80 && newLevel >= 80;
    case 'lvl_100':        return oldLevel < 100 && newLevel >= 100;
    // Streaks
    case 'streak_2':       return streak === 2;
    case 'streak_3':       return streak === 3;
    case 'streak_7':       return streak === 7;
    case 'streak_14':      return streak === 14;
    case 'streak_30':      return streak === 30;
    case 'streak_60':      return streak === 60;
    // Timetable
    case 'timetable_pro':  return actionType.startsWith('timetable_');
    case 'perfectionist':  return actionType === 'timetable_perfect';
    case 'disciplined':    return actionType === 'timetable_disciplined' || actionType === 'timetable_perfect';
    case 'weekend_warrior':return actionType.startsWith('timetable_') && (new Date().getDay() === 0 || new Date().getDay() === 6);
    case 'consistency_10': return streak >= 10 && actionType.startsWith('timetable_');
    // Actions
    case 'first_solve':    return actionType.includes('Solved') || actionType.includes('Practice');
    case 'speed_demon':    return actionType.includes('Speed');
    case 'logic_master':   return actionType.startsWith('Logic:');
    case 'pattern_eye':    return actionType.startsWith('Completed Dojo');
    case 'lab_rat':        return actionType.startsWith('Lab:');
    case 'engine_master':  return actionType.startsWith('Engine:') || actionType.startsWith('Mind:');
    case 'practice_10':    return newTotalXp >= 500 && (actionType.includes('Practice') || actionType.includes('Solved'));
    case 'deep_focus':     return actionType.includes('60min') || actionType.includes('deep_focus');
    case 'night_owl':      return (hour >= 22 || hour < 4) && newTotalXp > totalXp;
    case 'early_bird':     return hour < 6 && hour >= 4 && newTotalXp > totalXp;
    default: return false;
  }
}

export interface Buff {
  id: string;
  name: string;
  multiplier: number;
  expiresAt: number;
  type: Pillar | 'Global';
}

export type Archetype = 'Technical Elite' | 'Wealth Architect' | 'Vitality Vanguard' | 'None';

interface ProgressionState {
  xp: Record<Pillar, number>;
  totalXp: number;
  level: Record<Pillar, number>;
  totalLevel: number;
  rank: string;
  streakCount: number;
  lastActivityDate: string | null;
  role: 'user' | 'admin';
  archetype: Archetype;
  goals: string[];
  onboardingCompleted: boolean;
  displayName: string;
  buffs: Buff[];
  theme: string;
  baselineLevel: number;
}

interface ProgressionContextType {
  state: ProgressionState;
  addXp: (pillar: Pillar, actionType: string, baseAmount: number) => Promise<number>;
  addBuff: (buff: Buff) => void;
  setArchetype: (a: Archetype) => Promise<void>;
  updateProfile: (updates: Partial<{ archetype: Archetype; goals: string[]; onboarding_completed: boolean; display_name: string; settings: any }>) => Promise<void>;
  setTheme: (theme: string) => void;
  showLevelUp: boolean;
  levelUpData: { pillar: Pillar | 'Global'; newLevel: number; newRank?: string } | null;
  closeLevelUp: () => void;
  loading: boolean;
}

const ProgressionContext = createContext<ProgressionContextType | null>(null);

function getRank(totalLevel: number): string {
  if (totalLevel < 5) return 'Initiate';
  if (totalLevel < 15) return 'Specialist';
  if (totalLevel < 30) return 'Commander';
  if (totalLevel < 50) return 'Elite Vanguard';
  return 'Grandmaster';
}

const EMPTY_PILLAR_XP: Record<Pillar, number> = { Study: 0, Health: 0, Finance: 0, Mind: 0 };

// ── Get user from local session (no HTTP call, never 403s) ─────────────────
async function getSessionUser() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// ── Fetch full profile from DB ─────────────────────────────────────────────
async function fetchProfile(userId: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_xp, pillar_xp, streak_count, last_activity_date, role, onboarding_completed, archetype, goals, display_name, settings')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[useProgression] fetchProfile error:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('[useProgression] fetchProfile threw:', e);
    return null;
  }
}

export function ProgressionProvider({ children }: { children: ReactNode }) {
  const [pillarXp, setPillarXp] = useState<Record<Pillar, number>>(EMPTY_PILLAR_XP);
  const [totalXp, setTotalXp] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [lastActivityDate, setLastActivityDate] = useState<string | null>(null);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [archetype, setArchetype] = useState<Archetype>('None');
  const [goals, setGoals] = useState<string[]>([]);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [buffs, setBuffs] = useState<Buff[]>([]);
  const [theme, setThemeState] = useState('quantum');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    pillar: Pillar | 'Global';
    newLevel: number;
    newRank?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [baselineLevel, setBaselineLevel] = useState(0);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);

  // Refs — always hold latest values, addXp reads from here to avoid stale closures
  const pillarXpRef = useRef(EMPTY_PILLAR_XP);
  const totalXpRef = useRef(0);
  const streakCountRef = useRef(0);
  const lastActivityRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const archetypeRef = useRef<Archetype>('None');
  const buffsRef = useRef<Buff[]>([]);
  const baselineLevelRef = useRef(0);
  const earnedBadgeIdsRef = useRef<string[]>([]);

  useEffect(() => { pillarXpRef.current = pillarXp; }, [pillarXp]);
  useEffect(() => { totalXpRef.current = totalXp; }, [totalXp]);
  useEffect(() => { streakCountRef.current = streakCount; }, [streakCount]);
  useEffect(() => { lastActivityRef.current = lastActivityDate; }, [lastActivityDate]);
  useEffect(() => { archetypeRef.current = archetype; }, [archetype]);
  useEffect(() => { buffsRef.current = buffs; }, [buffs]);
  useEffect(() => { baselineLevelRef.current = baselineLevel; }, [baselineLevel]);
  useEffect(() => { earnedBadgeIdsRef.current = earnedBadgeIds; }, [earnedBadgeIds]);

  // ── Load profile on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!supabase) { setLoading(false); return; }

      // FIX: use getSession() — reads from localStorage, no HTTP call, no 403
      const user = await getSessionUser();
      if (!user) { setLoading(false); return; }

      userIdRef.current = user.id;

      const profile = await fetchProfile(user.id);

      if (!cancelled && profile) {
        const dbTotalXp = Number(profile.total_xp) || 0;
        const dbPillarXp = (profile.pillar_xp && typeof profile.pillar_xp === 'object')
          ? (profile.pillar_xp as Record<Pillar, number>)
          : EMPTY_PILLAR_XP;
        const dbStreak = Number(profile.streak_count) || 0;
        const dbLastAct = profile.last_activity_date ?? null;
        const dbRole = (profile.role as 'user' | 'admin') ?? 'user';
        
        // Identity data from DB
        // Identity data from DB
        const dbArchetype = (profile as any).archetype as Archetype || 'None';
        const dbGoals = (profile as any).goals as string[] || [];
        const dbOnboarding = (profile as any).onboarding_completed || localStorage.getItem(`quantum_onboarding_${user.id}`) === 'true';
        const dbName = (profile as any).display_name || '';

        const localBuffs = JSON.parse(localStorage.getItem(`quantum_buffs_${user.id}`) || '[]');
        const dbSettings = (profile as any).settings || {};
        const dbTheme = dbSettings.theme || localStorage.getItem(`quantum_theme_${user.id}`) || 'quantum';
        const dbBaselineLevel = Number(dbSettings.baselineLevel) || 0;

        setTotalXp(dbTotalXp);
        setPillarXp(dbPillarXp);
        setStreakCount(dbStreak);
        setLastActivityDate(dbLastAct);
        setRole(dbRole);
        setArchetype(dbArchetype);
        setGoals(dbGoals);
        setOnboardingCompleted(dbOnboarding);
        setDisplayName(dbName);
        setBuffs(localBuffs.filter((b: Buff) => b.expiresAt > Date.now()));
        setThemeState(dbTheme);
        setBaselineLevel(dbBaselineLevel);

        // Prime refs so addXp works immediately without waiting for re-render
        totalXpRef.current = dbTotalXp;
        pillarXpRef.current = dbPillarXp;
        streakCountRef.current = dbStreak;
        lastActivityRef.current = dbLastAct;
        archetypeRef.current = dbArchetype;
        buffsRef.current = localBuffs.filter((b: Buff) => b.expiresAt > Date.now());
      }

      if (!cancelled) setLoading(false);
    }

    loadProfile();
    return () => { cancelled = true; };
  }, []);

  // ── addXp: reads refs, writes to DB ──────────────────────────────────────
  const addXp = useCallback(async (pillar: Pillar, actionType: string, baseAmount: number): Promise<number> => {
    if (!supabase) return 0;

    // FIX: use getSession() — no HTTP call, no 403
    let userId = userIdRef.current;
    if (!userId) {
      const user = await getSessionUser();
      if (!user) return 0;
      userId = user.id;
      userIdRef.current = userId;
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    // Store previous values for rollback
    const prevPillarXp = { ...pillarXpRef.current };
    const prevTotalXp = totalXpRef.current;
    const prevStreak = streakCountRef.current;
    const prevLastActivity = lastActivityRef.current;

    const rollback = () => {
      setPillarXp(prevPillarXp);
      setTotalXp(prevTotalXp);
      setStreakCount(prevStreak);
      setLastActivityDate(prevLastActivity);
      pillarXpRef.current = prevPillarXp;
      totalXpRef.current = prevTotalXp;
      streakCountRef.current = prevStreak;
      lastActivityRef.current = prevLastActivity;
    };

    const currentPillarXp = { ...pillarXpRef.current };
    const currentTotalXp = totalXpRef.current;
    let currentStreak = streakCountRef.current;
    let newLastActivity = lastActivityRef.current;

    // Activity streak logic (DO NOT TOUCH — separate from login streak)
    if (newLastActivity) {
      const diffDays = Math.round(
        (new Date(today).getTime() - new Date(newLastActivity).getTime()) / 86400000
      );
      if (diffDays === 1) { currentStreak += 1; newLastActivity = today; }
      else if (diffDays > 1) { currentStreak = 1; newLastActivity = today; }
      // diffDays === 0 → same day, no change
    } else {
      currentStreak = 1;
      newLastActivity = today;
    }

    // ── Multipliers (only ever ADD to XP, never reduce) ──────────────────
    let finalMultiplier = 1.0;

    // 1. Streak bonus: 3+ consecutive days = 1.5×
    if (currentStreak >= 3) finalMultiplier *= 1.5;

    // 2. Archetype boost: chosen archetype rewards matching pillar
    const currentArchetype = archetypeRef.current;
    if (currentArchetype === 'Technical Elite'  && pillar === 'Study')   finalMultiplier *= 1.2;
    if (currentArchetype === 'Wealth Architect' && pillar === 'Finance') finalMultiplier *= 1.2;
    if (currentArchetype === 'Vitality Vanguard' && pillar === 'Health') finalMultiplier *= 1.2;

    // 3. Active buffs (user-activated, always positive)
    const activeBuffs = buffsRef.current.filter(b => b.expiresAt > Date.now() && (b.type === pillar || b.type === 'Global'));
    activeBuffs.forEach(b => { finalMultiplier *= b.multiplier; });

    // REMOVED: Imbalance Tax (0.7× Focus Tax) — was silently reducing XP below stated values.
    // XP will never go below what the action says it's worth.

    const rawAmount  = Math.floor(baseAmount * finalMultiplier);
    // Guarantee: awarded XP is always AT LEAST the base input (bonuses only add, never subtract)
    const finalAmount = Math.max(baseAmount, rawAmount);

    const newPillarXp = currentPillarXp[pillar] + finalAmount;
    const newTotalXp = currentTotalXp + finalAmount;
    const updatedPillarXp: Record<Pillar, number> = { ...currentPillarXp, [pillar]: newPillarXp };

    // Level-up detection (before updating state)
    const oldTotalLevel = calculateLevel(currentTotalXp, baselineLevelRef.current);
    const newTotalLevel = calculateLevel(newTotalXp, baselineLevelRef.current);
    const oldPillarLevel = calculateLevel(currentPillarXp[pillar], baselineLevelRef.current);
    const newPillarLevel = calculateLevel(newPillarXp, baselineLevelRef.current);

    if (newTotalLevel > oldTotalLevel) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setLevelUpData({ pillar: 'Global', newLevel: newTotalLevel, newRank: getRank(newTotalLevel) });
      setShowLevelUp(true);
    } else if (newPillarLevel > oldPillarLevel) {
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      setLevelUpData({ pillar, newLevel: newPillarLevel });
      setShowLevelUp(true);
    }

    // ── Badge auto-award ─────────────────────────────────────────────────────
    const badgeOpts = {
      totalXp: currentTotalXp,
      newTotalXp,
      oldLevel: oldTotalLevel,
      newLevel: newTotalLevel,
      streak: currentStreak,
      actionType,
    };
    const newlyEarned = BADGES.filter(b => checkBadgeTriggers(b.id, badgeOpts));
    if (newlyEarned.length > 0 && supabase) {
      // Optimistic toast notifications
      newlyEarned.forEach(b => {
        import('react-hot-toast').then(({ default: toast }) => {
          toast.success(`${b.icon} Badge Unlocked: ${b.name}!`, { duration: 5000 });
        });
      });
      // Persist to user_earned_badges (insert ignoring duplicates)
      void supabase.from('user_earned_badges')
        .upsert(
          newlyEarned.map(b => ({ user_id: userId, badge_id: b.id, earned_at: new Date().toISOString() })),
          { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
        );
    }


    // Optimistic UI update + sync refs
    setPillarXp(updatedPillarXp);
    setTotalXp(newTotalXp);
    setStreakCount(currentStreak);
    setLastActivityDate(newLastActivity);
    pillarXpRef.current = updatedPillarXp;
    totalXpRef.current = newTotalXp;
    streakCountRef.current = currentStreak;
    lastActivityRef.current = newLastActivity;

    const uid = userId;

    // 1. Profile update (total_xp + pillar_xp + streak)
    void (async () => {
      if (!supabase) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          total_xp: newTotalXp,
          pillar_xp: updatedPillarXp,
          streak_count: currentStreak,
          last_activity_date: newLastActivity,
        })
        .eq('id', uid);

      if (error) {
        console.warn('[addXp] profile update failed:', error.message);
        // Rollback on failure
        rollback();

        // Attempt a minimal recovery if it was a schema mismatch or similar
        const { error: e2 } = await supabase
          .from('profiles')
          .update({ total_xp: newTotalXp })
          .eq('id', uid);
        if (e2) console.error('[addXp] minimal profile update also failed:', e2.message);
      }
    })();

    // 2. Activity log entry
    if (supabase) {
      supabase
        .from('activity_logs')
        .insert({
          user_id: uid,
          action_type: actionType,
          pillar,
          xp_earned: finalAmount,
          created_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.warn('[addXp] activity_logs insert failed:', error.message);
        });

      // 3. Daily heatmap upsert via RPC
      supabase
        .rpc('increment_daily_activity', {
          p_user_id: uid,
          p_date: today,
          p_amount: finalAmount,
        })
        .then(({ error }) => {
          if (error) console.warn('[addXp] increment_daily_activity failed:', error.message);
        });
    }

    return finalAmount;
  }, []);

  const closeLevelUp = useCallback(() => {
    setShowLevelUp(false);
    setLevelUpData(null);
  }, []);

  const levelObj: Record<Pillar, number> = {
    Study: calculateLevel(pillarXp.Study, baselineLevel),
    Health: calculateLevel(pillarXp.Health, baselineLevel),
    Finance: calculateLevel(pillarXp.Finance, baselineLevel),
    Mind: calculateLevel(pillarXp.Mind, baselineLevel),
  };

  const globalLevel = calculateLevel(totalXp, baselineLevel);

  return (
    <ProgressionContext.Provider
      value={{
        state: {
          xp: pillarXp,
          totalXp,
          level: levelObj,
          totalLevel: globalLevel,
          rank: getRank(globalLevel),
          streakCount,
          lastActivityDate,
          role,
          onboardingCompleted,
          displayName,
          buffs,
          archetype,
          goals,
          theme,
          baselineLevel
        },
        addXp,
        addBuff: (buff: Buff) => {
          const newBuffs = [...buffs, buff];
          setBuffs(newBuffs);
          buffsRef.current = newBuffs;
          if (userIdRef.current) localStorage.setItem(`quantum_buffs_${userIdRef.current}`, JSON.stringify(newBuffs));
        },
        setArchetype: async (a: Archetype) => {
          setArchetype(a);
          archetypeRef.current = a;
          if (userIdRef.current && supabase) {
            await supabase.from('profiles').update({ archetype: a }).eq('id', userIdRef.current);
          }
        },
        updateProfile: async (updates: any) => {
          if (updates.archetype) {
            setArchetype(updates.archetype);
            archetypeRef.current = updates.archetype;
          }
          if (updates.goals) setGoals(updates.goals);
          if (updates.onboarding_completed !== undefined) {
            setOnboardingCompleted(updates.onboarding_completed);
            if (userIdRef.current) {
              localStorage.setItem(`quantum_onboarding_${userIdRef.current}`, updates.onboarding_completed.toString());
            }
          }
          if (updates.display_name) setDisplayName(updates.display_name);
          if (updates.settings?.baselineLevel !== undefined) {
            setBaselineLevel(updates.settings.baselineLevel);
            baselineLevelRef.current = updates.settings.baselineLevel;
          }

          if (userIdRef.current && supabase) {
            const { error } = await supabase.from('profiles').update(updates).eq('id', userIdRef.current);
            if (error) console.error('[useProgression] updateProfile error:', error.message);
          }
        },
        setTheme: (newTheme: string) => {
          setThemeState(newTheme);
          if (userIdRef.current) {
            localStorage.setItem(`quantum_theme_${userIdRef.current}`, newTheme);
            if (supabase) {
              supabase.from('profiles').select('settings').eq('id', userIdRef.current).single().then(({data}) => {
                const updatedSettings = { ...(data?.settings || {}), theme: newTheme };
                supabase?.from('profiles').update({ settings: updatedSettings }).eq('id', userIdRef.current).then();
              });
            }
          }
        },
        showLevelUp,
        levelUpData,
        closeLevelUp,
        loading,
      }}
    >
      {children}
    </ProgressionContext.Provider>
  );
}

export function useProgression() {
  const context = useContext(ProgressionContext);
  if (!context) throw new Error('useProgression must be used within ProgressionProvider');
  return context;
}
