import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Check, Activity } from 'lucide-react';
import { audio } from '../lib/audio';
import { useProgression } from '../hooks/useProgression';
import { supabase } from '../lib/supabaseClient';

interface HabitTask {
  id: number;
  title: string;
  icon: string;
}

export function VitalityCard({ onClick }: { onClick?: () => void }) {
  const { addXp } = useProgression();
  const [painLevel, setPainLevel] = useState(3);
  const [completedHabits, setCompletedHabits] = useState<number[]>([]);
  const [habits, setHabits] = useState<HabitTask[]>([]);

  // Logic: Vitality Readiness Score
  const calculateScore = () => {
    let score = 100;
    // Deduct 20 for each uncompleted habit, just as a placeholder logic
    const uncompletedCount = habits.length - completedHabits.length;
    score -= uncompletedCount * 20;
    score -= (painLevel - 1) * 5;
    return Math.max(0, score);
  };

  const readinessScore = calculateScore();

  const [targetWeight, setTargetWeight] = useState(80);

  useEffect(() => {
    const fetchUserData = async () => {
      let uid = 'default';
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          uid = session.user.id;
        }
      }

      // Check DB first
      let dbHabits = null;
      let dbWeight = null;
      
      if (uid !== 'default' && supabase) {
        try {
          const { data } = await supabase.from('profiles').select('settings').eq('id', uid).single();
          if (data && data.settings) {
            if (data.settings.habits) dbHabits = data.settings.habits;
            if (data.settings.weightGoal) dbWeight = data.settings.weightGoal;
            
            // Sync to local
            if (dbHabits) localStorage.setItem(`quantum_habits_${uid}`, JSON.stringify(dbHabits));
            if (dbWeight) localStorage.setItem(`quantum_weight_goal_${uid}`, dbWeight.toString());
          }
        } catch (e) {
          // Fallback to local storage if DB fails
        }
      }

      // Fetch Weight
      if (dbWeight) {
        setTargetWeight(Number(dbWeight));
      } else {
        const savedWeight = localStorage.getItem(`quantum_weight_goal_${uid}`);
        if (savedWeight) {
          setTargetWeight(Number(savedWeight));
        } else if (uid === 'default') {
          const globalWeight = localStorage.getItem('quantum_weight_goal_default') || localStorage.getItem('quantum_weight_goal');
          if (globalWeight) setTargetWeight(Number(globalWeight));
        }
      }

      // Fetch Habits
      if (dbHabits) {
        setHabits(dbHabits);
      } else {
        try {
          const savedHabits = localStorage.getItem(`quantum_habits_${uid}`);
          if (savedHabits && savedHabits !== "undefined") {
            setHabits(JSON.parse(savedHabits));
          } else if (uid === 'default') {
            const globalHabits = localStorage.getItem('quantum_habits_default') || localStorage.getItem('quantum_habits');
            if (globalHabits && globalHabits !== "undefined") setHabits(JSON.parse(globalHabits));
            else {
              setHabits([
                { id: 1, title: '5KM Mission', icon: 'Footprints' },
                { id: 2, title: '100 Pushups', icon: 'Dumbbell' }
              ]);
            }
          } else {
            setHabits([
              { id: 1, title: '5KM Mission', icon: 'Footprints' },
              { id: 2, title: '100 Pushups', icon: 'Dumbbell' }
            ]);
          }
        } catch (e) {
          console.error("Failed to parse habits", e);
        }
      }
    };
    fetchUserData();
  }, []);

  // Weight Progress Logic
  const startWeight = 98;
  const currentWeight = 98; // as requested
  const totalDrop = startWeight - targetWeight;
  const currentDrop = startWeight - currentWeight;
  // Make sure it has at least a small visual sliver if 0
  const weightProgress = Math.max(2, (currentDrop / totalDrop) * 100);

  // Simple SVG Line Chart Data (Weight Trend 7 Days)
  const weightData = [98.5, 98.4, 98.3, 98.3, 98.2, 98.1, 98.0];
  const chartMin = 97.5;
  const chartMax = 98.8;
  const svgPoints = weightData.map((w, i) => {
    const x = (i / (weightData.length - 1)) * 100;
    const y = 100 - ((w - chartMin) / (chartMax - chartMin)) * 100;
    return `${x},${y}`;
  }).join(' ');

  const toggleHabit = (id: number, title: string) => {
    audio.playClick();
    if (completedHabits.includes(id)) {
      setCompletedHabits(completedHabits.filter(hId => hId !== id));
    } else {
      audio.playSuccess();
      addXp('Health', `Completed ${title}`, 10);
      setCompletedHabits([...completedHabits, id]);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`h-full p-6 flex flex-col relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Background Neon Green Glow */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/20 rounded-xl relative">
            <HeartPulse className="text-emerald-500" size={24} />
            <span className="absolute top-0 right-0 w-full h-full bg-emerald-500/30 rounded-xl animate-ping opacity-50" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-textMain">The Vitality</h2>
            <p className="text-xs text-emerald-400 font-medium tracking-wide mt-1 uppercase">Bio-Sync Active</p>
          </div>
        </div>

        {/* Readiness Score */}
        <div className="text-right">
          <p className="text-xs text-textMuted uppercase font-bold tracking-wider mb-1">Readiness</p>
          <div className="flex items-baseline space-x-1">
            <span className={`text-3xl font-bold ${readinessScore >= 80 ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : readinessScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {readinessScore}
            </span>
            <span className="text-sm text-textMuted">/100</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 relative z-10 overflow-y-auto overflow-x-hidden scrollbar-none pr-1">

        {/* Weight Tracker & Mini Chart */}
        <div className="bg-surfaceHighlight/50 border border-border rounded-xl p-4">
          <div className="flex justify-between items-end mb-3">
            <div>
              <h4 className="text-sm font-semibold text-textMain">Mass Transformation</h4>
              <p className="text-xs text-textMuted mt-1">Start: {startWeight}kg | Target: {targetWeight}kg</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-textMain">{currentWeight} <span className="text-xs text-textMuted">kg</span></span>
            </div>
          </div>

          <div className="w-full bg-background rounded-full h-2.5 mb-4 overflow-hidden shadow-inner">
            <motion.div
              className="bg-emerald-500 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${weightProgress}%` }}
              transition={{ duration: 1, type: 'spring' }}
            />
          </div>

          {/* SVG Trend Line */}
          <div className="mt-2 h-12 w-full relative flex items-end">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              {/* Gradient def */}
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(16,185,129,0.5)" />
                  <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="rgb(16,185,129)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={svgPoints}
                className="drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]"
              />
              {/* Filled area under line */}
              <polygon
                fill="url(#lineGrad)"
                points={`0,100 ${svgPoints} 100,100`}
                className="opacity-50"
              />
            </svg>
            <div className="absolute inset-0 flex justify-between items-end text-[9px] text-textMuted pt-1 pointer-events-none">
              <span>7 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Daily Protocols (Checkboxes) */}
        <div>
          <h4 className="text-sm font-semibold text-textMain mb-3 uppercase tracking-wider">Daily Output</h4>
          <div className="grid grid-cols-2 gap-3">
            {habits.map((habit) => {
              const isDone = completedHabits.includes(habit.id);
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id, habit.title)}
                  className={`relative overflow-hidden flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${isDone
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-surface border-border text-textMuted hover:border-textMuted hover:bg-surfaceHighlight'
                    }`}
                >
                  <motion.div whileTap={{ scale: 0.9 }} className="z-10 flex flex-col items-center">
                    {isDone ? <Check size={24} className="mb-2" /> : <Activity size={24} className="mb-2 opacity-50" />}
                    <span className="text-xs font-bold text-center line-clamp-1 break-all px-1">{habit.title}</span>
                  </motion.div>
                  {isDone && <motion.div layoutId={`glow_${habit.id}`} className="absolute inset-0 bg-emerald-500/5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pain Index Slider */}
        <div className="pt-2">
          <div className="flex justify-between items-end mb-3">
            <h4 className="text-sm font-semibold text-textMain flex items-center">
              <Activity size={16} className="mr-2 text-emerald-500" /> Pain Index
            </h4>
            <span className={`text-sm font-bold ${painLevel > 6 ? 'text-red-500' : painLevel > 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
              Level {painLevel}
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="10"
            value={painLevel}
            onChange={(e) => setPainLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <div className="flex justify-between text-[10px] font-bold text-textMuted mt-2 uppercase tracking-wide">
            <span>Fluid / No Pain (1)</span>
            <span>Critical Stiffness (10)</span>
          </div>
        </div>

      </div>
    </div>
  );
}
