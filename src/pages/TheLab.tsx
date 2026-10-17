import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, HeartPulse, Moon, Scale, Droplets, 
  Plus, Trash2, Sparkles, RefreshCw, Check, 
  Dumbbell, X, BarChart3, Apple, Timer, Pencil
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { audio } from '../lib/audio';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { generateBioMissions, isApiKeyConfigured } from '../lib/aiService';

// ─── TYPES ─────────────────────────────────────────────────────────────
export type BioCategory = 'workout' | 'hydration' | 'sleep' | 'mass' | 'nutrition' | 'protocol';

export interface BioLedgerEntry {
  id: string;
  title: string;
  category: BioCategory;
  value: number;
  unit: string;
  notes?: string;
  date: string;
  xpAwarded: number;
}

export interface BioMission {
  id: string;
  title: string;
  xp: number;
  time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed?: boolean;
  lastCompletedDate?: string;
}

const CATEGORY_CONFIG: Record<BioCategory, { label: string; color: string; bg: string; border: string; text: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  workout:   { label: 'Workout & Training', color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: Dumbbell },
  hydration: { label: 'Hydration & Fluids', color: '#06b6d4', bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    icon: Droplets },
  sleep:     { label: 'Sleep & Recovery',   color: '#a855f7', bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  icon: Moon },
  mass:      { label: 'Body Mass & Scale',  color: '#3b82f6', bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    icon: Scale },
  nutrition: { label: 'Fuel & Nutrition',   color: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   icon: Apple },
  protocol:  { label: 'Bio Protocol',       color: '#ef4444', bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     icon: Timer },
};

const DEFAULT_BIO_ENTRIES: BioLedgerEntry[] = [
  { id: 'b-1', title: 'Strength Training: Heavy Hypertrophy & Core', category: 'workout', value: 60, unit: 'mins', notes: 'Compound lifts, progressive overload, mobility cool-down', date: '2026-10-14', xpAwarded: 45 },
  { id: 'b-2', title: 'Daily Electrolyte Fluid Baseline', category: 'hydration', value: 3.5, unit: 'L', notes: 'Filtered water + trace mineral salts throughout work blocks', date: '2026-10-14', xpAwarded: 25 },
  { id: 'b-3', title: 'Deep Circadian Rest & REM Sleep', category: 'sleep', value: 7.8, unit: 'hrs', notes: 'Pitch black, 19°C cool room, 0 screen time 45m before bed', date: '2026-10-14', xpAwarded: 35 },
  { id: 'b-4', title: 'Fasted Morning Weigh-In', category: 'mass', value: 74.8, unit: 'kg', notes: 'Baseline stable, target range maintained', date: '2026-10-13', xpAwarded: 20 },
  { id: 'b-5', title: 'Clean Macronutrient & Protein Fuel', category: 'nutrition', value: 165, unit: 'g protein', notes: 'Target protein met with whole food sources', date: '2026-10-13', xpAwarded: 30 },
  { id: 'b-6', title: 'Cold Shock & Endorphin Protocol', category: 'protocol', value: 3, unit: 'mins', notes: '3-minute cold exposure for norepinephrine release', date: '2026-10-12', xpAwarded: 50 },
];

export const DEFAULT_PROTOCOLS: BioMission[] = [
  { id: 'bp-1', title: 'Cold Exposure Protocol (2–3 min cold shower)', xp: 50, time: '3 min', difficulty: 'Hard', completed: false },
  { id: 'bp-2', title: 'Morning Sunlight Saturation & Optic Flow', xp: 25, time: '15 min', difficulty: 'Easy', completed: false },
  { id: 'bp-3', title: 'Zone 2 Steady-State Cardio or 8k Steps', xp: 40, time: '40 min', difficulty: 'Medium', completed: false },
  { id: 'bp-4', title: 'Full Spinal Decompression & Hip Mobility', xp: 30, time: '15 min', difficulty: 'Medium', completed: false },
  { id: 'bp-5', title: 'Digital Fast & Blue-Light Cutoff (Pre-Sleep)', xp: 35, time: '45 min', difficulty: 'Medium', completed: false },
];

export function TheLab() {
  const { state, addXp, updateProfile } = useProgression();
  const { xp, level, archetype, goals, displayName } = state;
  const uid = displayName || 'operator';

  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // ── 1. Health Ledger State (Real Data Persistence) ───────────────────
  const ledgerStorageKey = `quantum_health_ledger_${uid}`;
  const [entries, setEntries] = useState<BioLedgerEntry[]>(() => {
    const saved = localStorage.getItem(ledgerStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEFAULT_BIO_ENTRIES;
  });

  useEffect(() => {
    localStorage.setItem(ledgerStorageKey, JSON.stringify(entries));
  }, [entries, ledgerStorageKey]);

  // ── 2. Bio Metrics State (Synced with Command Deck & Supabase) ─────────
  const bioStorageKey = `quantum_pulse_bio_${uid}_${todayDateStr}`;
  const [bioStats, setBioStats] = useState({
    weightKg: 74.8,
    waterLiters: 3.5,
    sleepHours: 7.8,
  });

  useEffect(() => {
    const saved = localStorage.getItem(bioStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBioStats({
          weightKg: parsed.weightKg ?? 74.8,
          waterLiters: parsed.waterLiters ?? 3.5,
          sleepHours: parsed.sleepHours ?? 7.8,
        });
      } catch {}
    }
  }, [bioStorageKey]);

  const updateSyncedBio = (updated: Partial<typeof bioStats>) => {
    setBioStats(prev => {
      const next = { ...prev, ...updated };
      localStorage.setItem(bioStorageKey, JSON.stringify(next));

      // Sync to Supabase daily_biometrics
      if (supabase) {
        const client = supabase;
        client.auth.getSession().then(async ({ data: { session } }) => {
          if (session?.user) {
            try {
              await client.from('daily_biometrics').upsert({
                user_id: session.user.id,
                log_date: todayDateStr,
                weight_kg: next.weightKg,
                water_liters: next.waterLiters,
                sleep_hours: next.sleepHours,
              }, { onConflict: 'user_id,log_date' });
            } catch (err) {
              console.warn('Supabase bio sync warning:', err);
            }
          }
        });
      }

      return next;
    });
  };

  // ── 3. Bio Protocols / Missions State ────────────────────────────────
  const missionsKey = `quantum_bio_missions_${uid}`;
  const [protocols, setProtocols] = useState<BioMission[]>(() => {
    if (state.settings?.bioMissions && Array.isArray(state.settings.bioMissions) && state.settings.bioMissions.length > 0) {
      return state.settings.bioMissions.map((m: BioMission) => ({
        ...m,
        completed: m.lastCompletedDate === todayDateStr ? (m.completed ?? false) : false
      }));
    }
    const saved = localStorage.getItem(missionsKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: BioMission) => ({
            ...m,
            completed: m.lastCompletedDate === todayDateStr ? (m.completed ?? false) : false
          }));
        }
      } catch {}
    }
    return DEFAULT_PROTOCOLS;
  });

  useEffect(() => {
    localStorage.setItem(missionsKey, JSON.stringify(protocols));
    if (supabase) {
      const client = supabase;
      client.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          try {
            await updateProfile({
              settings: {
                ...state.settings,
                bioMissions: protocols
              }
            });
          } catch (err) {
            console.warn('Profile protocol sync warning:', err);
          }
        }
      });
    }
  }, [protocols, missionsKey]);

  // ── 4. Dynamically Computed Analytics ───────────────────────────────
  const metrics = useMemo(() => {
    let workoutCount = 0;
    let workoutTotalMins = 0;
    let totalWaterLogged = 0;
    let latestSleep = bioStats.sleepHours;
    let latestWeight = bioStats.weightKg;

    entries.forEach(e => {
      if (e.category === 'workout') {
        workoutCount++;
        workoutTotalMins += Number(e.value) || 0;
      } else if (e.category === 'hydration' && e.date === todayDateStr) {
        totalWaterLogged += Number(e.value) || 0;
      } else if (e.category === 'sleep' && e.date === todayDateStr) {
        latestSleep = Number(e.value) || latestSleep;
      } else if (e.category === 'mass') {
        latestWeight = Number(e.value) || latestWeight;
      }
    });

    const effectiveWater = Math.max(bioStats.waterLiters, totalWaterLogged);

    // Dynamic Bio-Readiness Score (0 - 100)
    let readiness = 50;
    if (effectiveWater >= 3.0) readiness += 25;
    else readiness += Math.round((effectiveWater / 3.0) * 25);

    if (latestSleep >= 7.0 && latestSleep <= 9.0) readiness += 25;
    else if (latestSleep > 0) readiness += Math.min(20, Math.round((latestSleep / 7.0) * 20));

    // Category breakdown counts
    const categoryCounts: Record<BioCategory, number> = {
      workout: 0,
      hydration: 0,
      sleep: 0,
      mass: 0,
      nutrition: 0,
      protocol: 0,
    };
    entries.forEach(e => {
      if (categoryCounts[e.category] !== undefined) {
        categoryCounts[e.category]++;
      }
    });

    return {
      readiness: Math.min(100, Math.max(30, readiness)),
      workoutCount,
      workoutTotalMins,
      waterLiters: Number(effectiveWater.toFixed(1)),
      sleepHours: Number(latestSleep.toFixed(1)),
      weightKg: Number(latestWeight.toFixed(1)),
      categoryCounts,
    };
  }, [entries, bioStats, todayDateStr]);

  // ── 5. Modal & Form State ───────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | BioCategory>('all');
  const [mTitle, setMTitle] = useState('');
  const [mCategory, setMCategory] = useState<BioCategory>('workout');
  const [mValue, setMValue] = useState('');
  const [mUnit, setMUnit] = useState('mins');
  const [mNotes, setMNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Quick unit synchronization when category changes
  const handleCategorySelect = (cat: BioCategory) => {
    setMCategory(cat);
    if (cat === 'workout') setMUnit('mins');
    else if (cat === 'hydration') setMUnit('L');
    else if (cat === 'sleep') setMUnit('hrs');
    else if (cat === 'mass') setMUnit('kg');
    else if (cat === 'nutrition') setMUnit('kcal');
    else if (cat === 'protocol') setMUnit('mins');
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(mValue);
    if (!mTitle.trim() || isNaN(val) || val <= 0) {
      toast.error('Please enter a valid title and positive numeric metric');
      return;
    }

    audio.playSuccess();
    const xpMap: Record<BioCategory, number> = {
      workout: 45,
      hydration: 20,
      sleep: 30,
      mass: 20,
      nutrition: 25,
      protocol: 40,
    };
    const earnedXp = xpMap[mCategory] || 25;

    const newEntry: BioLedgerEntry = {
      id: `b-${Date.now()}`,
      title: mTitle.trim(),
      category: mCategory,
      value: val,
      unit: mUnit.trim() || 'units',
      notes: mNotes.trim() || undefined,
      date: todayDateStr,
      xpAwarded: earnedXp,
    };

    setEntries(prev => [newEntry, ...prev]);

    // Update synced bio state if applicable
    if (mCategory === 'hydration') {
      updateSyncedBio({ waterLiters: Number((bioStats.waterLiters + val).toFixed(1)) });
    } else if (mCategory === 'mass') {
      updateSyncedBio({ weightKg: val });
    } else if (mCategory === 'sleep') {
      updateSyncedBio({ sleepHours: val });
    }

    // Award Health XP directly
    await addXp('Health', `Health Lab: ${mTitle.trim()}`, earnedXp);
    toast.success(`🎉 Bio-Metric Logged! +${earnedXp} Health XP`);

    setMTitle('');
    setMValue('');
    setMNotes('');
    setIsModalOpen(false);
  };

  const handleDeleteEntry = (id: string) => {
    audio.playClick();
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Log entry removed from Health Ledger');
  };

  // Quick hydration shortcut
  const handleQuickWaterAdd = async (liters: number) => {
    audio.playSuccess();
    const nextWater = Number((bioStats.waterLiters + liters).toFixed(1));
    updateSyncedBio({ waterLiters: nextWater });

    const newEntry: BioLedgerEntry = {
      id: `b-h-${Date.now()}`,
      title: `Hydration Protocol (+${liters}L)`,
      category: 'hydration',
      value: liters,
      unit: 'L',
      notes: 'Quick logged via Health Lab fluid button',
      date: todayDateStr,
      xpAwarded: 15,
    };
    setEntries(prev => [newEntry, ...prev]);

    await addXp('Health', `Hydration logged (+${liters}L)`, 15);
    toast.success(`💧 +${liters}L Water logged! +15 Health XP`);
  };

  // Add / Edit / Delete Protocol Modal State
  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<BioMission | null>(null);
  const [protocolForm, setProtocolForm] = useState<{
    title: string;
    time: string;
    xp: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }>({
    title: '',
    time: '15 min',
    xp: 30,
    difficulty: 'Medium',
  });

  const handleOpenAddProtocol = () => {
    setEditingProtocol(null);
    setProtocolForm({ title: '', time: '15 min', xp: 30, difficulty: 'Medium' });
    setProtocolModalOpen(true);
  };

  const handleOpenEditProtocol = (p: BioMission, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProtocol(p);
    setProtocolForm({
      title: p.title,
      time: p.time,
      xp: p.xp,
      difficulty: p.difficulty,
    });
    setProtocolModalOpen(true);
  };

  const handleDeleteProtocol = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audio.playClick();
    setProtocols(prev => prev.filter(p => p.id !== id));
    toast.success('Protocol removed.');
  };

  const handleSaveProtocol = () => {
    if (!protocolForm.title.trim()) {
      toast.error('Protocol title required.');
      return;
    }
    audio.playSuccess();
    if (editingProtocol) {
      setProtocols(prev => prev.map(p => p.id === editingProtocol.id ? { ...p, ...protocolForm, title: protocolForm.title.trim() } : p));
      toast.success('Protocol updated.');
    } else {
      const newProtocol: BioMission = {
        id: `bp-${Date.now()}`,
        title: protocolForm.title.trim(),
        time: protocolForm.time.trim() || '15 min',
        xp: Number(protocolForm.xp) || 30,
        difficulty: protocolForm.difficulty,
        completed: false,
      };
      setProtocols(prev => [newProtocol, ...prev]);
      toast.success('New health protocol created!');
    }
    setProtocolModalOpen(false);
  };

  // Complete / uncomplete a bio protocol mission
  const handleCompleteProtocol = async (id: string) => {
    const mission = protocols.find(p => p.id === id);
    if (!mission) return;

    if (mission.completed) {
      audio.playClick();
      setProtocols(prev => prev.map(p => p.id === id ? { ...p, completed: false } : p));
      toast.success('Protocol marked pending.');
      return;
    }

    audio.playSuccess();
    setProtocols(prev => prev.map(p => p.id === id ? { ...p, completed: true, lastCompletedDate: todayDateStr } : p));

    // Also record it into the ledger
    const newEntry: BioLedgerEntry = {
      id: `b-p-${Date.now()}`,
      title: mission.title,
      category: 'protocol',
      value: parseFloat(mission.time) || 15,
      unit: 'mins',
      notes: `Mastered ${mission.difficulty} protocol`,
      date: todayDateStr,
      xpAwarded: mission.xp,
    };
    setEntries(prev => [newEntry, ...prev]);

    const earned = await addXp('Health', `Lab: ${mission.title}`, mission.xp);
    toast.success(`⚡ Protocol Mastered! +${earned} Health XP`);
  };

  // Generate AI Bio Protocols
  const handleGenerateAI = async () => {
    if (!isApiKeyConfigured()) {
      toast.error('Gemini API Key missing. Please configure your key in System Settings (Control Room).');
      return;
    }

    setGenerating(true);
    audio.playClick();

    try {
      const generated = await generateBioMissions(
        archetype || 'None',
        level.Health || 1,
        Array.isArray(goals) ? goals.join(', ') : (goals || '')
      );

      const parsed: BioMission[] = generated.map((m, idx) => ({
        id: `ai-bio-${Date.now()}-${idx}`,
        title: m.title,
        xp: m.xpAward,
        time: m.timeRequired,
        difficulty: m.difficulty,
        completed: false,
      }));

      setProtocols(parsed);
      toast.success('Bespoke AI Bio-Missions Calibrated!');
      audio.playSuccess();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to calibrate AI bio-hacking protocols.');
    } finally {
      setGenerating(false);
    }
  };

  // Filtered ledger entries
  const displayedEntries = useMemo(() => {
    if (filterCategory === 'all') return entries;
    return entries.filter(e => e.category === filterCategory);
  }, [entries, filterCategory]);

  return (
    <div className="flex-1 h-full flex flex-col p-4 md:p-8 overflow-y-auto scrollbar-none bg-background/50 space-y-6 pb-28 md:pb-8">
      {/* ─── HEADER (MIRRORING THE VAULT) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <HeartPulse size={28} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-textMain tracking-tighter uppercase">THE HEALTH LAB</h1>
            <p className="text-xs md:text-sm text-textMuted font-medium">Vitality Command, Biometrics Ledger & Bio-Optimization</p>
          </div>
        </div>

        <button
          onClick={() => {
            audio.playClick();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Log Bio Metric</span>
        </button>
      </div>

      {/* ─── ROW 1: HERO STATS CARD + BENTO KPI CARDS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Vitality Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 md:p-8 border border-emerald-500/20 rounded-3xl relative overflow-hidden group flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity size={130} className="text-emerald-500" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">Bio-Readiness State</h2>
            </div>
            
            <div className="flex items-baseline space-x-3">
              <span className="text-4xl md:text-6xl font-black text-textMain tracking-tighter">
                {metrics.readiness}%
              </span>
              <span className="text-xs font-black uppercase px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                {metrics.readiness >= 85 ? 'Optimal' : metrics.readiness >= 70 ? 'High Readiness' : 'Recharge Required'}
              </span>
            </div>

            {/* Visual readiness index bar */}
            <div className="space-y-1">
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-700" 
                  style={{ width: `${metrics.readiness}%` }}
                />
              </div>
              <p className="text-[10px] text-textMuted font-medium">Computed across hydration, sleep depth, mass & workout output</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Health Pillar</p>
              <p className="text-sm font-mono text-textMain">Lv.{level.Health} <span className="text-textMuted text-xs">({xp.Health.toLocaleString()} XP)</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Biological Rank</p>
              <p className="text-xs font-bold text-emerald-400 uppercase">{level.Health >= 10 ? 'Apex Titan' : level.Health >= 5 ? 'Resilient Guardian' : 'Vitality Adept'}</p>
            </div>
          </div>
        </motion.div>

        {/* Bento KPI Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hydration Card */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="glass-panel p-5 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Droplets size={18} />
              </div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Fluid Equilibrium</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-textMain">{metrics.waterLiters} / 3.5L</p>
                <span className="text-xs font-bold text-cyan-400">{Math.round((metrics.waterLiters / 3.5) * 100)}%</span>
              </div>
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => handleQuickWaterAdd(0.25)}
                  className="flex-1 py-1 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  +250ml
                </button>
                <button
                  onClick={() => handleQuickWaterAdd(0.5)}
                  className="flex-1 py-1 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  +500ml
                </button>
                <button
                  onClick={() => handleQuickWaterAdd(1.0)}
                  className="flex-1 py-1 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  +1.0L
                </button>
              </div>
            </div>
          </motion.div>

          {/* Sleep Card */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="glass-panel p-5 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Moon size={18} />
              </div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Circadian Recovery</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-textMain">{metrics.sleepHours} hrs</p>
                <span className="text-xs font-bold text-purple-400">{metrics.sleepHours >= 7.5 ? 'Optimal Rest' : 'Needs Sleep'}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const next = Math.max(0, Number((metrics.sleepHours - 0.5).toFixed(1)));
                    updateSyncedBio({ sleepHours: next });
                    audio.playClick();
                  }}
                  className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-black"
                >
                  -0.5h
                </button>
                <button
                  onClick={() => {
                    const next = Number((metrics.sleepHours + 0.5).toFixed(1));
                    updateSyncedBio({ sleepHours: next });
                    audio.playClick();
                  }}
                  className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-black"
                >
                  +0.5h
                </button>
              </div>
            </div>
          </motion.div>

          {/* Body Mass & Conditioning Card */}
          <motion.div 
            className="glass-panel p-5 border border-white/5 bg-white/[0.02] rounded-2xl md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-textMain uppercase tracking-wider">Body Mass: {metrics.weightKg} kg</h3>
                <p className="text-[10px] text-textMuted">Cumulative conditioning: {metrics.workoutTotalMins} mins across {metrics.workoutCount} sessions</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const next = Number((metrics.weightKg - 0.2).toFixed(1));
                  updateSyncedBio({ weightKg: next });
                  audio.playClick();
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black text-zinc-300"
              >
                -0.2 kg
              </button>
              <button
                onClick={() => {
                  const next = Number((metrics.weightKg + 0.2).toFixed(1));
                  updateSyncedBio({ weightKg: next });
                  audio.playClick();
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black text-zinc-300"
              >
                +0.2 kg
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── ROW 2: ACTIVE PROTOCOLS (BIO-MISSIONS ENGINE) ─── */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-black/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-textMain flex items-center gap-2">
              <Timer size={16} className="text-emerald-400" />
              <span>Active Bio-Optimization Protocols</span>
            </h3>
            <p className="text-[10px] text-textMuted uppercase tracking-wider">Execute daily micro-protocols to condition nervous & metabolic systems</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddProtocol}
              className="py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Plus size={12} />
              <span>New Protocol</span>
            </button>
            <button
              onClick={handleGenerateAI}
              disabled={generating}
              className="py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-textMuted hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {generating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
              <span>{generating ? 'Calibrating...' : 'AI Calibrate'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {protocols.map(p => (
            <div
              key={p.id}
              onClick={() => handleCompleteProtocol(p.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group/card ${
                p.completed
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                    p.completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/20'
                  }`}>
                    {p.completed && <Check size={14} className="stroke-[3]" />}
                  </div>
                  <h4 className={`text-xs font-bold leading-snug truncate ${p.completed ? 'line-through text-zinc-400' : 'text-textMain'}`}>
                    {p.title}
                  </h4>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover/card:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEditProtocol(p, e)}
                    title="Edit Protocol"
                    className="p-1 rounded-md text-textMuted hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProtocol(p.id, e)}
                    title="Delete Protocol"
                    className="p-1 rounded-md text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-textMuted font-mono">{p.time}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                    p.difficulty === 'Hard' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    p.difficulty === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {p.difficulty}
                  </span>
                </div>
                <span className="font-black text-emerald-400">+{p.xp} Health XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── ROW 3: HEALTH & BIO LEDGER (MIRRORING VAULT'S TABLE) ─── */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-textMain flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              <span>Vitality Ledger & Bio-Logs</span>
            </h3>
            <p className="text-[10px] text-textMuted uppercase tracking-wider">Auditable record of physical training, fluid intake & rest</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['all', 'workout', 'hydration', 'sleep', 'mass', 'nutrition', 'protocol'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  audio.playClick();
                  setFilterCategory(cat);
                }}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                  filterCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/[0.02] text-textMuted border-white/5 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase font-bold text-textMuted tracking-wider">
                <th className="p-3.5">Bio-Event / Protocol</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Recorded Value</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Reward</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayedEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-textMuted text-xs uppercase tracking-wider">
                    No bio logs recorded in this category. Click "Log Bio Metric" to record data.
                  </td>
                </tr>
              ) : (
                displayedEntries.map(e => {
                  const cfg = CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG.workout;
                  const Icon = cfg.icon;
                  return (
                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-3.5 font-bold text-textMain">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.text} shrink-0`}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <div>{e.title}</div>
                            {e.notes && <div className="text-[10px] text-textMuted font-normal">{e.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {e.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-textMain">
                        {e.value} {e.unit}
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-textMuted">
                        {e.date}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">
                        +{e.xpAwarded} XP
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteEntry(e.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Remove entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: LOG HEALTH & BIO METRIC (MIRRORING THE VAULT) ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#11131e] border border-white/20 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <HeartPulse size={16} className="text-emerald-400" />
                  <span>Log Bio Metric & Training</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1.5">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['workout', 'hydration', 'sleep', 'mass', 'nutrition', 'protocol'] as const).map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                          mCategory === cat
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-white/5 text-textMuted border-white/5 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                    Protocol / Event Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Upper Body Strength, 1.5L Hydration Block..."
                    value={mTitle}
                    onChange={e => setMTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Metric Value & Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                      Metric Value
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 60, 1.5, 7.5..."
                      value={mValue}
                      onChange={e => setMValue(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="mins, L, hrs, kg..."
                      value={mUnit}
                      onChange={e => setMUnit(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                    Context / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Focus on progressive overload, good form..."
                    value={mNotes}
                    onChange={e => setMNotes(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    Save to Health Ledger & Earn XP
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ─── MODAL: ADD / EDIT BIO PROTOCOL ─── */}
        {protocolModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-white/10 p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-textMain flex items-center gap-2">
                  <Timer size={16} className="text-emerald-400" />
                  <span>{editingProtocol ? 'Edit Health Protocol' : 'New Health Protocol'}</span>
                </h3>
                <button
                  onClick={() => setProtocolModalOpen(false)}
                  className="text-textMuted hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                    Protocol Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zone 2 Cardio 40m, Cold Shower 3m..."
                    value={protocolForm.title}
                    onChange={e => setProtocolForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                      Target Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 15 min, 30 min..."
                      value={protocolForm.time}
                      onChange={e => setProtocolForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1">
                      Health XP Reward
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={150}
                      value={protocolForm.xp}
                      onChange={e => setProtocolForm(prev => ({ ...prev, xp: parseInt(e.target.value, 10) || 30 }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-textMuted block mb-1.5">
                    Difficulty Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setProtocolForm(prev => ({ ...prev, difficulty: d }))}
                        className={`py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                          protocolForm.difficulty === d
                            ? d === 'Hard' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                              d === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                              'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-white/5 text-textMuted border-white/5 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setProtocolModalOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white font-black text-xs uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProtocol}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    {editingProtocol ? 'Update Protocol' : 'Create Protocol'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
