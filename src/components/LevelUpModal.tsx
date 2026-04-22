import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { audio } from '../lib/audio';
import { useEffect } from 'react';

export function LevelUpModal() {
  const { showLevelUp, levelUpData, closeLevelUp, state } = useProgression();

  useEffect(() => {
    if (showLevelUp) {
      audio.playSuccess(); // Double success or distinct chime can be added
    }
  }, [showLevelUp]);

  return (
    <AnimatePresence>
      {showLevelUp && levelUpData && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.5, y: 50, rotate: -5 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
            className="relative flex flex-col items-center text-center p-8 max-w-lg"
          >
            {/* Explosion effects */}
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute w-64 h-64 border-[4px] border-dashed border-primary/30 rounded-full"
            />

            <div className="w-24 h-24 bg-gradient-to-tr from-primary to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(59,130,246,0.6)] relative z-10 p-[2px]">
              <div className="w-full h-full bg-surface rounded-3xl flex items-center justify-center">
                <ChevronUp size={48} className="text-white" />
              </div>
            </div>

            <h2 className="text-xl font-bold tracking-widest text-primary uppercase mb-2 relative z-10">
              {levelUpData.pillar} Level Up
            </h2>
            
            <h1 className="text-4xl md:text-5xl font-black text-textMain tracking-tight mb-4 drop-shadow-2xl relative z-10">
              RANK INCREASED
            </h1>

            <div className="bg-surfaceHighlight/50 border border-border px-6 py-3 rounded-2xl mb-8 relative z-10">
              <p className="text-2xl font-bold text-white">Level {levelUpData.newLevel}</p>
              <p className="text-sm text-textMuted font-mono">Current Rank: {state.rank}</p>
            </div>

            <button 
              onClick={closeLevelUp}
              className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform relative z-10 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Acknowledge
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
