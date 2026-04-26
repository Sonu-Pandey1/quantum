import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { EngineCard } from './EngineCard';
import { PathCard } from './PathCard';
import { VitalityCard } from './VitalityCard';
import { LedgerCard } from './LedgerCard';
import { GuardCard } from './GuardCard';
import { ForgeCard } from './ForgeCard';
import { SummaryCard } from './SummaryCard';
import { GithubCard } from './GithubCard';

const containerVars: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

interface BentoGridProps {
  onNavigateToLogic: () => void;
  onNavigate?: (view: string) => void;
  isPortfolioMode?: boolean;
}

import { useProgression } from '../hooks/useProgression';

export function BentoGrid({ onNavigateToLogic, onNavigate, isPortfolioMode }: BentoGridProps) {
  const { state } = useProgression();
  
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-10 md:pb-32 relative z-10 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent w-full">
      
      {/* Decorative gradient orb */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight text-textMain mb-1 uppercase tracking-tighter">
            {state.displayName ? `${state.displayName}'s ` : ''}Command Center
          </h1>
          <p className="text-[10px] md:text-sm text-textMuted mb-2 flex items-center space-x-2">
            <span className="flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              Operational Status: Online
            </span>
            {state.archetype !== 'None' && (
              <>
                <span className="w-1 h-1 bg-white/20 rounded-full" />
                <span className="text-primary font-bold uppercase tracking-widest text-[9px] md:text-[10px]">{state.archetype}</span>
              </>
            )}
          </p>
        </div>

        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6 auto-rows-auto lg:auto-rows-[180px]"
        >
          {/* Main Module - The Engine */}
          <div className="md:col-span-2 lg:col-span-7 lg:row-span-2 glass-panel glass-panel-hover overflow-hidden min-h-[300px] lg:min-h-0">
            <EngineCard />
          </div>

          {/* The Path - SAP Mastery */}
          <div className="md:col-span-2 lg:col-span-5 lg:row-span-2 glass-panel glass-panel-hover min-h-[400px] lg:min-h-0">
            <PathCard onNavigateToLogic={onNavigateToLogic} />
          </div>

          {isPortfolioMode ? (
            <>
              {/* Portfolio Mode Replacements */}
              <div className="lg:col-span-6 glass-panel glass-panel-hover min-h-[180px]">
                <SummaryCard />
              </div>
              <div className="lg:col-span-6 glass-panel glass-panel-hover min-h-[180px]">
                <GithubCard />
              </div>
            </>
          ) : (
            <>
              {/* Private Mode Cards */}
              <div onClick={() => onNavigate && onNavigate('analytics')} className="lg:col-span-3 glass-panel glass-panel-hover cursor-pointer min-h-[180px]">
                <VitalityCard />
              </div>
              <div onClick={() => onNavigate && onNavigate('analytics')} className="lg:col-span-3 glass-panel glass-panel-hover cursor-pointer min-h-[180px]">
                <LedgerCard />
              </div>
              <div onClick={() => onNavigate && onNavigate('dojo')} className="lg:col-span-3 glass-panel glass-panel-hover cursor-pointer min-h-[180px]">
                <ForgeCard />
              </div>
              <div className="lg:col-span-3 glass-panel glass-panel-hover min-h-[180px]">
                <GuardCard />
              </div>
            </>
          )}

        </motion.div>

      </div>
    </div>
  );
}
