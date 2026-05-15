import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Trophy, Zap } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { audio } from '../lib/audio';

const vows = [
  "Action over Thinking.",
  "I speak with confidence.",
  "Consistency is the ultimate weapon.",
  "Discipline equals freedom.",
  "No excuses. Just execution.",
  "Small progress is still progress.",
  "I finish what I start.",
  "Pressure creates strength.",
  "Focus builds empires.",
  "My future is built today.",
  "Every day is a chance to level up.",
  "I choose growth over comfort.",
  "Hard work beats hesitation.",
  "I trust my preparation.",
  "Energy flows where focus goes.",
  "I stay calm under pressure.",
  "Winning starts with self-control.",
  "I am stronger than my distractions.",
  "One step daily changes everything.",
  "I train my mind to stay sharp.",
  "Discipline will take me where motivation can't.",
  "I don't wait for perfect moments.",
  "Confidence comes from action.",
  "I move forward no matter what.",
  "My mindset shapes my reality.",
  "Stay hungry. Stay focused.",
  "Success is earned, not wished for.",
  "I control my habits, not the other way around.",
  "Silence the doubt. Execute the plan.",
  "I am becoming unstoppable.",
  "Progress over perfection.",
  "Fear disappears through repetition.",
  "Results come from consistency.",
  "My limits are meant to be broken.",
  "I compete only with yesterday’s version of myself.",
  "Deep focus creates powerful results.",
  "I was built for bigger things.",
  "Strong mind. Strong life.",
  "The grind will pay off.",
  "I stay locked in on my mission."
];

export function Header({ hideVow = false, onNavigateToRank, onNavigateToDashboard }: { hideVow?: boolean, onNavigateToRank?: () => void, onNavigateToDashboard?: () => void }) {
  const { state } = useProgression();
  const displayVows = state.goals && state.goals.length > 0 ? state.goals : vows;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (hideVow) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % displayVows.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [hideVow, displayVows.length]);

  const getProgress = (xp: number) => {
    return (Math.max(0, xp) % 100);
  };

  return (
    <header className="h-[72px] md:h-20 bg-[#0a0a0c]/40 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-[90] sticky top-0 border-b border-white/5">
      <div
        className="flex items-center space-x-2 md:space-x-3 cursor-pointer group"
        onClick={() => {
          audio.playClick();
          if (onNavigateToDashboard) onNavigateToDashboard();
        }}
      >
        <div className="p-1.5 md:p-2 bg-primary/20 rounded-lg hidden xs:block group-hover:bg-primary/30 transition-colors">
          <Zap className="text-primary group-hover:scale-110 transition-transform" size={16} />
        </div>
        <div>
          <h2 className="text-xs md:text-base font-black text-textMain tracking-tight uppercase group-hover:text-primary transition-colors">
            QUANTUM <span className="text-primary group-hover:text-white transition-colors">GROWTH</span>
          </h2>
          <p className="text-[8px] md:text-[9px] text-textMuted uppercase tracking-[0.2em] font-bold opacity-50">
            CORE v2.4
          </p>
        </div>
      </div>

      {/* Center: Global Vow (Conditional) */}
      {!hideVow && (
        <div className="hidden lg:flex items-center space-x-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 shadow-inner max-w-md overflow-hidden">
          <ShieldCheck className="text-primary shrink-0" size={16} />
          <div className="relative h-5 overflow-hidden min-w-[200px]">
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.5, ease: "anticipate" }}
                className="text-xs font-bold text-textMain/80 absolute w-full whitespace-nowrap italic"
              >
                "{displayVows[index]}"
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Right: Rank & Progress */}
      <div
        className="flex items-center space-x-3 md:space-x-6 cursor-pointer group hover:bg-white/5 p-2 rounded-xl transition-colors"
        onClick={() => {
          audio.playClick();
          if (onNavigateToRank) onNavigateToRank();
        }}
      >
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] md:text-[10px] font-bold text-amber-400 uppercase tracking-wider group-hover:text-amber-300 transition-colors">{state.rank}</span>
            <Trophy size={13} className="text-amber-500 md:w-[14px] md:h-[14px] group-hover:scale-110 transition-transform" />
          </div>
          <div className="w-16 xs:w-20 md:w-32 h-1 bg-white/5 rounded-full overflow-hidden flex border border-white/5 shadow-inner relative group-hover:border-primary/30 transition-colors">
            <motion.div
              className="bg-gradient-to-r from-primary to-blue-400 h-full w-full"
              initial={{ width: 0 }}
              animate={{ width: `${getProgress(state.totalXp)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-1.5 md:p-2 bg-primary/10 border border-primary/20 rounded-lg md:rounded-xl min-w-[36px] md:min-w-[48px] group-hover:bg-primary/20 group-hover:border-primary/40 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <span className="text-[8px] md:text-[9px] text-primary font-bold uppercase leading-none mb-1 md:mb-1">Lvl</span>
          <span className="text-sm md:text-base font-black text-textMain leading-none">{state.totalLevel}</span>
        </div>
      </div>

    </header>
  );
}
