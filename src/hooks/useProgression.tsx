import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { audio } from '../lib/audio';
import { syncQueue } from '../lib/syncQueue';

export type Pillar = 'Study' | 'Health' | 'Finance' | 'Mind';

function rawLevel(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1;
}
export function calculateLevel(xp: number, baselineOffset: number = 0): number {
  const rLvl = rawLevel(xp);
  if (baselineOffset >= 0) {
    return rLvl + baselineOffset;
  } else {
    // Proportional scaling for negative baseline offset.
    // Gaining 100 raw levels reaches display level 0, then progresses normally.
    if (rLvl <= 100) {
      return baselineOffset + Math.floor((rLvl - 1) * (-baselineOffset / 99));
    } else {
      return rLvl - 100;
    }
  }
}
// ── Badge definitions — auto-awarded when totalXp / totalLevel hits threshold ─
export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category?: 'xp' | 'level' | 'streak' | 'protocol' | 'action';
  requiredLevel?: number;
  requiredXp?: number;
  requiredStreak?: number;
}

export const BADGES: Badge[] = [
  // ── XP milestones
  { id: 'first_xp',       name: 'First Step',         desc: 'Earn your first XP',                    icon: '⚡', category: 'xp', requiredXp: 1 },
  { id: 'xp_100',         name: 'Century',             desc: 'Earn 100 total XP',                     icon: '💯', category: 'xp', requiredXp: 100 },
  { id: 'xp_500',         name: 'Rising Star',         desc: 'Earn 500 total XP',                     icon: '🌟', category: 'xp', requiredXp: 500 },
  { id: 'xp_1000',        name: 'Power User',          desc: 'Earn 1,000 total XP',                   icon: '🔋', category: 'xp', requiredXp: 1000 },
  { id: 'xp_2500',        name: 'Grinder',             desc: 'Earn 2,500 total XP',                   icon: '⚙️', category: 'xp', requiredXp: 2500 },
  { id: 'xp_5000',        name: 'Momentum Engine',     desc: 'Earn 5,000 total XP',                   icon: '🚀', category: 'xp', requiredXp: 5000 },
  { id: 'xp_10000',       name: 'XP Titan',            desc: 'Earn 10,000 total XP',                  icon: '🏆', category: 'xp', requiredXp: 10000 },
  { id: 'xp_25000',       name: 'Quantum Grinder',     desc: 'Earn 25,000 total XP',                  icon: '💎', category: 'xp', requiredXp: 25000 },
  { id: 'xp_50000',       name: 'Legend Status',       desc: 'Earn 50,000 total XP',                  icon: '👑', category: 'xp', requiredXp: 50000 },
  { id: 'xp_100000',      name: 'Transcendent',        desc: 'Earn 100,000 total XP',                 icon: '🌌', category: 'xp', requiredXp: 100000 },
  // ── Level milestones
  { id: 'lvl_3',          name: 'Getting Started',     desc: 'Reach Level 3',                         icon: '🌱', category: 'level', requiredLevel: 3 },
  { id: 'lvl_5',          name: 'Apprentice',          desc: 'Reach Level 5',                         icon: '🎯', category: 'level', requiredLevel: 5 },
  { id: 'lvl_10',         name: 'Specialist',          desc: 'Reach Level 10',                        icon: '🔵', category: 'level', requiredLevel: 10 },
  { id: 'lvl_15',         name: 'Rising Analyst',      desc: 'Reach Level 15',                        icon: '📊', category: 'level', requiredLevel: 15 },
  { id: 'lvl_20',         name: 'Analyst',             desc: 'Reach Level 20',                        icon: '🟣', category: 'level', requiredLevel: 20 },
  { id: 'lvl_30',         name: 'Commander',           desc: 'Reach Level 30',                        icon: '⚔️', category: 'level', requiredLevel: 30 },
  { id: 'lvl_45',         name: 'Elite Vanguard',      desc: 'Reach Level 45',                        icon: '🦅', category: 'level', requiredLevel: 45 },
  { id: 'lvl_60',         name: 'Grandmaster',         desc: 'Reach Level 60',                        icon: '🧠', category: 'level', requiredLevel: 60 },
  { id: 'lvl_80',         name: 'Legend',              desc: 'Reach Level 80',                        icon: '🌠', category: 'level', requiredLevel: 80 },
  { id: 'lvl_100',        name: 'Mythic',              desc: 'Reach Level 100',                       icon: '🌌', category: 'level', requiredLevel: 100 },
  // ── Streak milestones
  { id: 'streak_2',       name: 'Back to Back',        desc: '2-day activity streak',                 icon: '✌️', category: 'streak', requiredStreak: 2 },
  { id: 'streak_3',       name: 'On a Roll',           desc: '3-day activity streak',                 icon: '🔥', category: 'streak', requiredStreak: 3 },
  { id: 'streak_7',       name: 'Week Warrior',        desc: '7-day activity streak',                 icon: '📅', category: 'streak', requiredStreak: 7 },
  { id: 'streak_14',      name: 'Two-Week Titan',      desc: '14-day activity streak',                icon: '🔗', category: 'streak', requiredStreak: 14 },
  { id: 'streak_30',      name: 'Iron Discipline',     desc: '30-day activity streak',                icon: '🧲', category: 'streak', requiredStreak: 30 },
  { id: 'streak_60',      name: 'Unstoppable',         desc: '60-day activity streak',                icon: '🌪️', category: 'streak', requiredStreak: 60 },
  // ── Timetable / consistency
  { id: 'timetable_pro',  name: 'Timetable Pro',       desc: 'Claim your first daily timetable bonus', icon: '📋', category: 'protocol' },
  { id: 'perfectionist',  name: 'Perfectionist',       desc: 'Complete 100% of a day\'s tasks',       icon: '✨', category: 'protocol' },
  { id: 'disciplined',    name: 'Disciplined',         desc: 'Complete 80%+ tasks 5 days',            icon: '🎖️', category: 'protocol' },
  { id: 'weekend_warrior',name: 'Weekend Warrior',     desc: 'Complete 80%+ tasks on a weekend',      icon: '🏖️', category: 'protocol' },
  { id: 'consistency_10', name: 'Consistent',          desc: 'Use timetable 10 days in a row',        icon: '📆', category: 'protocol' },
  // ── Action-specific
  { id: 'first_solve',    name: 'First Blood',         desc: 'Solve your first question',             icon: '🩸', category: 'action' },
  { id: 'speed_demon',    name: 'Speed Demon',         desc: 'Earn a speed bonus on an answer',       icon: '💨', category: 'action' },
  { id: 'logic_master',   name: 'Logic Master',        desc: 'Complete a Logic Hub problem',          icon: '🧩', category: 'action' },
  { id: 'pattern_eye',    name: 'Pattern Eye',         desc: 'Complete a Pattern Dojo session',       icon: '👁️', category: 'action' },
  { id: 'lab_rat',        name: 'Lab Rat',             desc: 'Complete a Bio-Mission',                icon: '🔬', category: 'action' },
  { id: 'night_owl',      name: 'Night Owl',           desc: 'Execute protocol after 10 PM',          icon: '🦉', category: 'action' },
  { id: 'early_bird',     name: 'Early Bird',          desc: 'Execute protocol before 6 AM',          icon: '🐦', category: 'action' },
  { id: 'engine_master',  name: 'Engine Master',       desc: 'Complete a Progression Engine task',    icon: '⚙️', category: 'action' },
  { id: 'practice_10',    name: 'Practice Addict',     desc: 'Solve 10 practice questions',           icon: '📝', category: 'action' },
  { id: 'deep_focus',     name: 'Deep Focus',          desc: 'Log a 60+ minute study task',           icon: '🧘', category: 'action' },
];

// Map badge id → condition checker (returns true if user qualifies for the badge)
export function checkBadgeTriggers(
  badgeId: string,
  opts: { totalXp: number; newTotalXp: number; oldLevel: number; newLevel: number; streak: number; actionType: string; }
): boolean {
  const { newTotalXp, newLevel, streak, actionType } = opts;
  const hour = new Date().getHours();
  switch (badgeId) {
    // XP
    case 'first_xp':       return newTotalXp > 0;
    case 'xp_100':         return newTotalXp >= 100;
    case 'xp_500':         return newTotalXp >= 500;
    case 'xp_1000':        return newTotalXp >= 1000;
    case 'xp_2500':        return newTotalXp >= 2500;
    case 'xp_5000':        return newTotalXp >= 5000;
    case 'xp_10000':       return newTotalXp >= 10000;
    case 'xp_25000':       return newTotalXp >= 25000;
    case 'xp_50000':       return newTotalXp >= 50000;
    case 'xp_100000':      return newTotalXp >= 100000;
    // Levels
    case 'lvl_3':          return newLevel >= 3;
    case 'lvl_5':          return newLevel >= 5;
    case 'lvl_10':         return newLevel >= 10;
    case 'lvl_15':         return newLevel >= 15;
    case 'lvl_20':         return newLevel >= 20;
    case 'lvl_30':         return newLevel >= 30;
    case 'lvl_45':         return newLevel >= 45;
    case 'lvl_60':         return newLevel >= 60;
    case 'lvl_80':         return newLevel >= 80;
    case 'lvl_100':        return newLevel >= 100;
    // Streaks
    case 'streak_2':       return streak >= 2;
    case 'streak_3':       return streak >= 3;
    case 'streak_7':       return streak >= 7;
    case 'streak_14':      return streak >= 14;
    case 'streak_30':      return streak >= 30;
    case 'streak_60':      return streak >= 60;
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
    case 'night_owl':      return (hour >= 22 || hour < 4) && newTotalXp > 0;
    case 'early_bird':     return hour < 6 && hour >= 4 && newTotalXp > 0;
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
  timetableXpClaims: Record<string, string[]>;
  settings?: any;
  earnedBadgeIds: string[];
}

export interface XpBreakdown {
  base: number;
  streakBonus: number;
  archetypeBonus: number;
  total: number;
}

interface ProgressionContextType {
  state: ProgressionState;
  addXp: (pillar: Pillar, actionType: string, baseAmount: number) => Promise<number>;
  addBuff: (buff: Buff) => void;
  setArchetype: (a: Archetype) => Promise<void>;
  updateProfile: (updates: Partial<{ archetype: Archetype; goals: string[]; onboarding_completed: boolean; display_name: string; settings: any }>) => Promise<void>;
  setTheme: (theme: string) => void;
  resetProgression: () => Promise<void>;
  showLevelUp: boolean;
  levelUpData: { pillar: Pillar | 'Global'; newLevel: number; newRank?: string } | null;
  closeLevelUp: () => void;
  loading: boolean;
  claimTimetableTaskXp: (taskId: string, pillar: Pillar, label: string, baseAmount: number) => Promise<{ awarded: boolean; xpEarned: number; breakdown: XpBreakdown }>;
  refuelStreakShield: (costXp?: number) => Promise<boolean>;
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
  const [timetableXpClaims, setTimetableXpClaims] = useState<Record<string, string[]>>({});
  const [settings, setSettings] = useState<any>({});

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
  const timetableXpClaimsRef = useRef<Record<string, string[]>>({});
  const settingsRef = useRef<any>({});

  useEffect(() => { pillarXpRef.current = pillarXp; }, [pillarXp]);
  useEffect(() => { totalXpRef.current = totalXp; }, [totalXp]);
  useEffect(() => { streakCountRef.current = streakCount; }, [streakCount]);
  useEffect(() => { lastActivityRef.current = lastActivityDate; }, [lastActivityDate]);
  useEffect(() => { archetypeRef.current = archetype; }, [archetype]);
  useEffect(() => { buffsRef.current = buffs; }, [buffs]);
  useEffect(() => { baselineLevelRef.current = baselineLevel; }, [baselineLevel]);
  useEffect(() => { earnedBadgeIdsRef.current = earnedBadgeIds; }, [earnedBadgeIds]);
  useEffect(() => { timetableXpClaimsRef.current = timetableXpClaims; }, [timetableXpClaims]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

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
        const dbArchetype = (profile as any).archetype as Archetype || 'None';
        const dbGoals = (profile as any).goals as string[] || [];
        const dbOnboarding = (profile as any).onboarding_completed || localStorage.getItem(`quantum_onboarding_${user.id}`) === 'true';
        const dbName = (profile as any).display_name || '';

        const localBuffs = JSON.parse(localStorage.getItem(`quantum_buffs_${user.id}`) || '[]');
        const dbSettings = (profile as any).settings || {};
        const dbTheme = dbSettings.theme || localStorage.getItem(`quantum_theme_${user.id}`) || 'quantum';
        const dbBaselineLevel = Number(dbSettings.baselineLevel) || 0;
        const dbXpClaims = dbSettings.timetableXpClaims || JSON.parse(localStorage.getItem(`quantum_xp_claims_${user.id}`) || '{}');

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
        setTimetableXpClaims(dbXpClaims);
        timetableXpClaimsRef.current = dbXpClaims;
        setSettings(dbSettings);
        settingsRef.current = dbSettings;

        // Load earned badges from Supabase (ignoring error or falling back offline)
        let badgeIds: string[] = [];
        try {
          const { data: dbBadges, error: badgeError } = await supabase
            .from('user_earned_badges')
            .select('badge_id')
            .eq('user_id', user.id);
          
          if (!badgeError && dbBadges) {
            badgeIds = dbBadges.map((b: any) => b.badge_id);
          } else {
            const local = localStorage.getItem(`quantum_badges_${user.id}`);
            if (local) badgeIds = JSON.parse(local);
          }
        } catch (e) {
          const local = localStorage.getItem(`quantum_badges_${user.id}`);
          if (local) {
            try { badgeIds = JSON.parse(local); } catch (err) {}
          }
        }

        // Auto-reconciliation: award any milestone badges already earned based on current DB XP, Level, Streak
        const dbTotalLvl = calculateLevel(dbTotalXp, dbBaselineLevel);
        const reconcileOpts = {
          totalXp: dbTotalXp,
          newTotalXp: dbTotalXp,
          oldLevel: dbTotalLvl,
          newLevel: dbTotalLvl,
          streak: dbStreak,
          actionType: 'reconcile_load',
        };
        const qualifiedBadges = BADGES.filter(b => checkBadgeTriggers(b.id, reconcileOpts));
        const newBadgeIds = qualifiedBadges.map(b => b.id).filter(id => !badgeIds.includes(id));
        if (newBadgeIds.length > 0) {
          badgeIds = Array.from(new Set([...badgeIds, ...newBadgeIds]));
          if (supabase) {
            void supabase.from('user_earned_badges').upsert(
              newBadgeIds.map(id => ({ user_id: user.id, badge_id: id, earned_at: new Date().toISOString() })),
              { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
            );
          }
        }

        setEarnedBadgeIds(badgeIds);
        earnedBadgeIdsRef.current = badgeIds;
        localStorage.setItem(`quantum_badges_${user.id}`, JSON.stringify(badgeIds));

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

    // Activity streak logic with Streak Shield defense
    let shieldUsed = false;
    if (newLastActivity) {
      const diffDays = Math.round(
        (new Date(today).getTime() - new Date(newLastActivity).getTime()) / 86400000
      );
      if (diffDays === 1) {
        currentStreak += 1;
        newLastActivity = today;
      } else if (diffDays > 1) {
        const availableShields = settingsRef.current?.streakShields !== undefined
          ? Number(settingsRef.current.streakShields)
          : Math.min(3, Math.floor(prevStreak / 7));
        const missedDays = diffDays - 1;

        if (missedDays <= availableShields && availableShields > 0) {
          shieldUsed = true;
          currentStreak = prevStreak + 1;
          newLastActivity = today;
          const remainingShields = Math.max(0, availableShields - missedDays);

          const updatedSettings = {
            ...settingsRef.current,
            streakShields: remainingShields,
            lastShieldUsedDate: today,
          };
          setSettings(updatedSettings);
          settingsRef.current = updatedSettings;

          if (supabase && userIdRef.current) {
            supabase.from('profiles').update({ settings: updatedSettings }).eq('id', userIdRef.current).then();
          }

          import('react-hot-toast').then(({ default: toast }) => {
            toast.success(`🛡️ Streak Shield Activated! Consumed ${missedDays} shield(s) to protect your ${currentStreak}-day streak!`, {
              icon: '🛡️',
              duration: 5000,
            });
          }).catch(() => {});
        } else {
          currentStreak = 1;
          newLastActivity = today;
        }
      }
    } else {
      currentStreak = 1;
      newLastActivity = today;
    }

    // Auto-award free Streak Shield every 7 consecutive days if not capped at 3
    if (!shieldUsed && currentStreak > prevStreak && currentStreak % 7 === 0) {
      const currentShields = settingsRef.current?.streakShields !== undefined
        ? Number(settingsRef.current.streakShields)
        : Math.min(3, Math.floor((currentStreak - 1) / 7));
      if (currentShields < 3) {
        const nextShields = Math.min(3, currentShields + 1);
        const updatedSettings = {
          ...settingsRef.current,
          streakShields: nextShields,
        };
        setSettings(updatedSettings);
        settingsRef.current = updatedSettings;
        if (supabase && userIdRef.current) {
          supabase.from('profiles').update({ settings: updatedSettings }).eq('id', userIdRef.current).then();
        }
        import('react-hot-toast').then(({ default: toast }) => {
          toast.success(`🛡️ New Streak Shield Earned! (${nextShields}/3 Armed)`, {
            icon: '🛡️',
            duration: 5000,
          });
        }).catch(() => {});
      }
    }

    // ── Multipliers ──────────────────
    let finalMultiplier = 1.0;

    // 1. Streak bonus: 3+ consecutive days = 1.5×
    if (currentStreak >= 3) finalMultiplier *= 1.5;

    // 2. Archetype boost: chosen archetype rewards matching pillar
    const currentArchetype = archetypeRef.current;
    if (currentArchetype === 'Technical Elite'  && pillar === 'Study')   finalMultiplier *= 1.2;
    if (currentArchetype === 'Wealth Architect' && pillar === 'Finance') finalMultiplier *= 1.2;
    if (currentArchetype === 'Vitality Vanguard' && pillar === 'Health') finalMultiplier *= 1.2;

    // 3. Active buffs
    const activeBuffs = buffsRef.current.filter(b => b.expiresAt > Date.now() && (b.type === pillar || b.type === 'Global'));
    activeBuffs.forEach(b => { finalMultiplier *= b.multiplier; });

    const rawAmount  = Math.round(baseAmount * finalMultiplier);
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

    // ── Badge auto-award (Deduplicated Single-Claim) ───────────────────────────
    const badgeOpts = {
      totalXp: currentTotalXp,
      newTotalXp,
      oldLevel: oldTotalLevel,
      newLevel: newTotalLevel,
      streak: currentStreak,
      actionType,
    };
    const currentEarnedBadges = earnedBadgeIdsRef.current || [];
    const newlyEarned = BADGES.filter(b => !currentEarnedBadges.includes(b.id) && checkBadgeTriggers(b.id, badgeOpts));
    
    if (newlyEarned.length > 0) {
      newlyEarned.forEach(b => {
        toast.success(`${b.icon} Badge Unlocked: ${b.name}!`, { duration: 5000 });
      });
      const newIds = Array.from(new Set([...currentEarnedBadges, ...newlyEarned.map(b => b.id)]));
      setEarnedBadgeIds(newIds);
      earnedBadgeIdsRef.current = newIds;
      localStorage.setItem(`quantum_badges_${userId}`, JSON.stringify(newIds));

      if (supabase) {
        void supabase.from('user_earned_badges')
          .upsert(
            newlyEarned.map(b => ({ user_id: userId, badge_id: b.id, earned_at: new Date().toISOString() })),
            { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
          );
      }
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
        rollback();
      }
    })();

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

  // Secure Timetable XP Claiming Ledger with Detailed Breakdown
  const claimTimetableTaskXp = useCallback(async (
    taskId: string,
    pillar: Pillar,
    label: string,
    baseAmount: number
  ): Promise<{ awarded: boolean; xpEarned: number; breakdown: XpBreakdown }> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const claims = { ...timetableXpClaimsRef.current };
    const todayClaims = claims[today] ? [...claims[today]] : [];

    const stringTaskId = String(taskId);

    const emptyBreakdown: XpBreakdown = { base: 0, streakBonus: 0, archetypeBonus: 0, total: 0 };

    if (todayClaims.includes(stringTaskId)) {
      return { awarded: false, xpEarned: 0, breakdown: emptyBreakdown };
    }

    // Unclaimed! Award XP
    const newClaims = {
      ...claims,
      [today]: [...todayClaims, stringTaskId]
    };

    setTimetableXpClaims(newClaims);
    timetableXpClaimsRef.current = newClaims;

    const uid = userIdRef.current || 'default';
    localStorage.setItem(`quantum_xp_claims_${uid}`, JSON.stringify(newClaims));

    // Calculate detailed breakdown
    const currentStreak = streakCountRef.current;
    const currentArchetype = archetypeRef.current;

    const baseEarned = baseAmount;
    const streakBonus = currentStreak >= 3 ? Math.floor(baseEarned * 0.5) : 0;
    
    let isMatchingArchetype = false;
    if (currentArchetype === 'Technical Elite' && pillar === 'Study') isMatchingArchetype = true;
    if (currentArchetype === 'Wealth Architect' && pillar === 'Finance') isMatchingArchetype = true;
    if (currentArchetype === 'Vitality Vanguard' && pillar === 'Health') isMatchingArchetype = true;

    const archetypeBonus = isMatchingArchetype ? Math.floor(baseEarned * 0.2) : 0;

    const earned = await addXp(pillar, label, baseAmount);

    const breakdown: XpBreakdown = {
      base: baseEarned,
      streakBonus,
      archetypeBonus,
      total: earned
    };

    if (supabase && uid !== 'default') {
      try {
        const { data } = await supabase.from('profiles').select('settings').eq('id', uid).single();
        const currentSettings = data?.settings || {};
        const updatedSettings = {
          ...currentSettings,
          timetableXpClaims: newClaims
        };
        await supabase.from('profiles').update({ settings: updatedSettings }).eq('id', uid);
      } catch (e) {
        console.error('[useProgression] Failed to sync timetable XP claims:', e);
      }
    }

    return { awarded: true, xpEarned: earned, breakdown };
  }, [addXp]);

  const resetProgression = useCallback(async () => {
    setPillarXp(EMPTY_PILLAR_XP);
    setTotalXp(0);
    setStreakCount(0);
    setLastActivityDate(null);
    setBaselineLevel(0);
    setTimetableXpClaims({});
    setEarnedBadgeIds([]);

    const cleanSettings = {
      timetable: settingsRef.current.timetable || [],
      habits: settingsRef.current.habits || [],
      roadmap: settingsRef.current.roadmap || [],
      todos: settingsRef.current.todos || [],
      weightGoal: settingsRef.current.weightGoal,
      sapTarget: settingsRef.current.sapTarget,
      sundayRest: settingsRef.current.sundayRest,
      theme: settingsRef.current.theme || 'quantum',
      followWeekendTimetable: settingsRef.current.followWeekendTimetable !== undefined ? settingsRef.current.followWeekendTimetable : true
    };
    setSettings(cleanSettings);

    pillarXpRef.current = EMPTY_PILLAR_XP;
    totalXpRef.current = 0;
    streakCountRef.current = 0;
    lastActivityRef.current = null;
    baselineLevelRef.current = 0;
    timetableXpClaimsRef.current = {};
    earnedBadgeIdsRef.current = [];
    settingsRef.current = cleanSettings;

    const uid = userIdRef.current;
    if (uid) {
      localStorage.setItem(`quantum_todos_${uid}`, JSON.stringify(cleanSettings.todos));
      localStorage.setItem(`quantum_timetable_${uid}`, JSON.stringify(cleanSettings.timetable));
      localStorage.setItem(`quantum_badges_${uid}`, JSON.stringify([]));
      localStorage.setItem(`quantum_xp_claims_${uid}`, JSON.stringify({}));
      localStorage.setItem(`quantum_theme_${uid}`, cleanSettings.theme);
      
      localStorage.removeItem(`quantum_active_session_${uid}`);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      localStorage.removeItem(`quantum_exec_${uid}_${todayStr}`);
      localStorage.setItem(`quantum_skips_${uid}`, JSON.stringify([]));
      localStorage.setItem(`quantum_comms_${uid}`, JSON.stringify([]));
      localStorage.setItem(`quantum_bio_missions_${displayName || 'Agent'}`, JSON.stringify([]));
      localStorage.setItem(`quantum_logic_problems_${uid}`, JSON.stringify([]));
      localStorage.setItem(`quantum_dynamic_quests_${uid}`, JSON.stringify([]));
      localStorage.setItem(`quantum_hard_streak_${uid}`, '0');
    }

    if (uid && supabase && uid !== 'default') {
      try {
        await supabase.from('user_earned_badges').delete().eq('user_id', uid);
        await supabase.from('daily_completions').delete().eq('user_id', uid);
        await supabase.from('executions').delete().eq('user_id', uid);
        await supabase.from('daily_bonus_log').delete().eq('user_id', uid);
        
        await supabase.from('profiles').update({
          total_xp: 0,
          pillar_xp: EMPTY_PILLAR_XP,
          streak_count: 0,
          last_activity_date: null,
          settings: cleanSettings
        }).eq('id', uid);
        toast.success("Progression matrix reset to 0 XP.");
      } catch (e) {
        console.error("Failed to reset database progression:", e);
        toast.error("Cloud reset failed, local reset applied.");
      }
    } else {
      toast.success("Progression matrix reset locally.");
    }
  }, [displayName]);

  const refuelStreakShield = async (costXp: number = 100): Promise<boolean> => {
    const currentShields = settingsRef.current?.streakShields !== undefined
      ? Number(settingsRef.current.streakShields)
      : Math.min(3, Math.floor(streakCountRef.current / 7));

    if (currentShields >= 3) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Streak Shield Matrix already at maximum capacity (3/3).');
      });
      return false;
    }

    if (totalXpRef.current < costXp) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(`Insufficient XP to refuel shield. Required: ${costXp} XP (Current: ${totalXpRef.current} XP)`);
      });
      return false;
    }

    const newTotalXp = Math.max(0, totalXpRef.current - costXp);
    totalXpRef.current = newTotalXp;
    setTotalXp(newTotalXp);

    const nextShields = currentShields + 1;
    const updatedSettings = {
      ...settingsRef.current,
      streakShields: nextShields,
      lastRefuelDate: new Date().toISOString(),
    };
    setSettings(updatedSettings);
    settingsRef.current = updatedSettings;

    if (supabase && userIdRef.current) {
      await supabase.from('profiles').update({
        total_xp: newTotalXp,
        settings: updatedSettings
      }).eq('id', userIdRef.current);
    }

    audio.playSuccess();
    import('react-hot-toast').then(({ default: toast }) => {
      toast.success(`🛡️ Streak Shield Armed! (${nextShields}/3 Armed)`, {
        icon: '🛡️',
        duration: 4000,
      });
    });

    return true;
  };

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
          baselineLevel,
          timetableXpClaims,
          settings,
          earnedBadgeIds
        },
        addXp,
        claimTimetableTaskXp,
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
          if (updates.settings) {
            const mergedSettings = { ...settingsRef.current, ...updates.settings };
            setSettings(mergedSettings);
            settingsRef.current = mergedSettings;
            if (userIdRef.current) {
              localStorage.setItem(`quantum_todos_${userIdRef.current}`, JSON.stringify(mergedSettings.todos || []));
              localStorage.setItem(`quantum_timetable_${userIdRef.current}`, JSON.stringify(mergedSettings.timetable || []));
            }
            if (updates.settings.baselineLevel !== undefined) {
              setBaselineLevel(updates.settings.baselineLevel);
              baselineLevelRef.current = updates.settings.baselineLevel;
            }
            updates.settings = mergedSettings;
          }

          if (userIdRef.current && supabase) {
            try {
              const { error } = await supabase.from('profiles').update(updates).eq('id', userIdRef.current);
              if (error) {
                console.warn('[useProgression] updateProfile failed, queued offline:', error.message);
                syncQueue.enqueue({
                  table: 'profiles',
                  action: 'update',
                  payload: updates,
                  matchKey: 'id',
                  matchValue: userIdRef.current
                });
              }
            } catch (err) {
              syncQueue.enqueue({
                table: 'profiles',
                action: 'update',
                payload: updates,
                matchKey: 'id',
                matchValue: userIdRef.current
              });
            }
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
        resetProgression,
        showLevelUp,
        levelUpData,
        closeLevelUp,
        loading,
        refuelStreakShield,
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
