import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Trophy } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';

const vows = [
  "Action over Thinking.",
  "I speak with confidence.",
  "Consistency is the ultimate weapon.",
  "Discipline equals freedom."
];

export function Header() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * vows.length));
  const { state } = useProgression();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % vows.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // level = floor(xp / 100) + 1, so progress within the current level is xp % 100
  const getProgress = (xp: number) => {
    return (Math.max(0, xp) % 100);
  };

  return (
    <header className="h-auto py-2.5 border-b border-border bg-surface/50 backdrop-blur-lg flex flex-col items-center justify-center px-4 md:px-8 z-10 gap-2">
      <div className="flex flex-col md:flex-row items-center md:space-x-3 px-3 md:px-6 py-1.5 md:py-2.5 rounded-xl md:rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] w-full max-w-[95vw] md:w-auto">
        <div className="flex items-center space-x-2 shrink-0 mb-1 md:mb-0">
          <ShieldCheck className="text-primary" size={18} />
          <span className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-primary/80">Global Vow:</span>
        </div>
        <div className="relative h-6 overflow-hidden flex items-center justify-center w-full md:min-w-[250px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-[11px] md:text-sm font-medium text-textMain absolute w-full text-center whitespace-nowrap overflow-hidden text-ellipsis px-2"
            >
              "{vows[index]}"
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Global XP Bar */}
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex justify-between w-full text-xs font-bold uppercase tracking-widest mb-1">
          <span className="text-textMuted flex items-center gap-1">
            <Trophy size={12} className="text-amber-500" /> {state.rank}
          </span>
          <span className="text-primary">Lvl {state.totalLevel}</span>
        </div>
        <div className="w-full h-1.5 bg-surfaceHighlight rounded-full overflow-hidden flex shadow-inner">
          <motion.div 
            className="bg-blue-500 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${getProgress(state.xp.Study) / 4}%` }}
          />
          <motion.div 
            className="bg-emerald-500 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${getProgress(state.xp.Health) / 4}%` }}
          />
          <motion.div 
            className="bg-amber-500 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${getProgress(state.xp.Finance) / 4}%` }}
          />
          <motion.div 
            className="bg-purple-500 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${getProgress(state.xp.Mind) / 4}%` }}
          />
        </div>
      </div>
    </header>
  );
}
