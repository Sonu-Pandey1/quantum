import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

export type Pillar = 'Study' | 'Health' | 'Finance' | 'Mind';

// Logarithmic scaling: Level = (XP / 100)^(1/1.5) + 1
// Level 1: 0 XP
// Level 2: 282 XP
// Level 10: 3,162 XP
function calculateLevel(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1;
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
  buffs: Buff[];
}

interface ProgressionContextType {
  state: ProgressionState;
  addXp: (pillar: Pillar, actionType: string, baseAmount: number) => Promise<void>;
  addBuff: (buff: Buff) => void;
  setArchetype: (a: Archetype) => void;
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
      .select('total_xp, pillar_xp, streak_count, last_activity_date, role')
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
  const [buffs, setBuffs] = useState<Buff[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    pillar: Pillar | 'Global';
    newLevel: number;
    newRank?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs — always hold latest values, addXp reads from here to avoid stale closures
  const pillarXpRef = useRef(EMPTY_PILLAR_XP);
  const totalXpRef = useRef(0);
  const streakCountRef = useRef(0);
  const lastActivityRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => { pillarXpRef.current = pillarXp; }, [pillarXp]);
  useEffect(() => { totalXpRef.current = totalXp; }, [totalXp]);
  useEffect(() => { streakCountRef.current = streakCount; }, [streakCount]);
  useEffect(() => { lastActivityRef.current = lastActivityDate; }, [lastActivityDate]);

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
        const dbTotalXp    = Number(profile.total_xp) || 0;
        // If pillar_xp is missing or null in DB, default to empty (not discard real data)
        const dbPillarXp   = (profile.pillar_xp && typeof profile.pillar_xp === 'object')
          ? (profile.pillar_xp as Record<Pillar, number>)
          : EMPTY_PILLAR_XP;
        const dbStreak     = Number(profile.streak_count) || 0;
        const dbLastAct    = profile.last_activity_date ?? null;
        const dbRole       = (profile.role as 'user' | 'admin') ?? 'user';
        
        // Load archetype and buffs from localStorage as fallback if DB schema doesn't support them yet
        const localArchetype = localStorage.getItem(`quantum_archetype_${user.id}`) as Archetype || 'None';
        const localBuffs = JSON.parse(localStorage.getItem(`quantum_buffs_${user.id}`) || '[]');

        setTotalXp(dbTotalXp);
        setPillarXp(dbPillarXp);
        setStreakCount(dbStreak);
        setLastActivityDate(dbLastAct);
        setRole(dbRole);
        setArchetype(localArchetype);
        setBuffs(localBuffs.filter((b: Buff) => b.expiresAt > Date.now()));

        // Prime refs so addXp works immediately without waiting for re-render
        totalXpRef.current    = dbTotalXp;
        pillarXpRef.current   = dbPillarXp;
        streakCountRef.current = dbStreak;
        lastActivityRef.current = dbLastAct;
      }

      if (!cancelled) setLoading(false);
    }

    loadProfile();
    return () => { cancelled = true; };
  }, []);

  // ── addXp: reads refs, writes to DB ──────────────────────────────────────
  const addXp = useCallback(async (pillar: Pillar, actionType: string, baseAmount: number) => {
    if (!supabase) return;

    // FIX: use getSession() — no HTTP call, no 403
    let userId = userIdRef.current;
    if (!userId) {
      const user = await getSessionUser();
      if (!user) return;
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
    const currentTotalXp  = totalXpRef.current;
    let currentStreak     = streakCountRef.current;
    let newLastActivity   = lastActivityRef.current;

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

    const multiplier  = currentStreak >= 3 ? 1.5 : 1.0;
    
    // --- Advanced Multipliers ---
    let finalMultiplier = multiplier;
    
    // 1. Archetype Boost
    if (archetype === 'Technical Elite' && pillar === 'Study') finalMultiplier *= 1.2;
    if (archetype === 'Wealth Architect' && pillar === 'Finance') finalMultiplier *= 1.2;
    if (archetype === 'Vitality Vanguard' && pillar === 'Health') finalMultiplier *= 1.2;
    
    // 2. Active Buffs
    const activeBuffs = buffs.filter(b => b.expiresAt > Date.now() && (b.type === pillar || b.type === 'Global'));
    activeBuffs.forEach(b => { finalMultiplier *= b.multiplier; });
    
    // 3. Imbalance Tax (System Balance Control)
    const currentLevels = {
      Study: calculateLevel(currentPillarXp.Study),
      Health: calculateLevel(currentPillarXp.Health),
      Finance: calculateLevel(currentPillarXp.Finance),
      Mind: calculateLevel(currentPillarXp.Mind),
    };
    const maxLevel = Math.max(...Object.values(currentLevels));
    const thisLevel = currentLevels[pillar];
    if (maxLevel - thisLevel > 5) {
      // If this pillar is lagging significantly, it gets a "Catch-up" bonus!
      finalMultiplier *= 1.5;
    } else if (thisLevel === maxLevel && Object.values(currentLevels).some(l => maxLevel - l > 5)) {
      // If this pillar is too far ahead, it gets a "Focus Tax"
      finalMultiplier *= 0.7;
    }

    const finalAmount = Math.floor(baseAmount * finalMultiplier);

    const newPillarXp    = currentPillarXp[pillar] + finalAmount;
    const newTotalXp     = currentTotalXp + finalAmount;
    const updatedPillarXp: Record<Pillar, number> = { ...currentPillarXp, [pillar]: newPillarXp };

    // Level-up detection (before updating state)
    const oldTotalLevel  = calculateLevel(currentTotalXp);
    const newTotalLevel  = calculateLevel(newTotalXp);
    const oldPillarLevel = calculateLevel(currentPillarXp[pillar]);
    const newPillarLevel = calculateLevel(newPillarXp);

    if (newTotalLevel > oldTotalLevel) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setLevelUpData({ pillar: 'Global', newLevel: newTotalLevel, newRank: getRank(newTotalLevel) });
      setShowLevelUp(true);
    } else if (newPillarLevel > oldPillarLevel) {
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      setLevelUpData({ pillar, newLevel: newPillarLevel });
      setShowLevelUp(true);
    }

    // Optimistic UI update + sync refs
    setPillarXp(updatedPillarXp);
    setTotalXp(newTotalXp);
    setStreakCount(currentStreak);
    setLastActivityDate(newLastActivity);
    pillarXpRef.current    = updatedPillarXp;
    totalXpRef.current     = newTotalXp;
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

  }, []);

  const closeLevelUp = useCallback(() => {
    setShowLevelUp(false);
    setLevelUpData(null);
  }, []);

  const levelObj: Record<Pillar, number> = {
    Study:   calculateLevel(pillarXp.Study),
    Health:  calculateLevel(pillarXp.Health),
    Finance: calculateLevel(pillarXp.Finance),
    Mind:    calculateLevel(pillarXp.Mind),
  };

  const globalLevel = calculateLevel(totalXp);

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
          archetype,
          buffs,
        },
        addXp,
        addBuff: (buff: Buff) => {
          const newBuffs = [...buffs, buff];
          setBuffs(newBuffs);
          if (userIdRef.current) localStorage.setItem(`quantum_buffs_${userIdRef.current}`, JSON.stringify(newBuffs));
        },
        setArchetype: (a: Archetype) => {
          setArchetype(a);
          if (userIdRef.current) localStorage.setItem(`quantum_archetype_${userIdRef.current}`, a);
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
