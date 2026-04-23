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

export function BentoGrid({ onNavigateToLogic, onNavigate, isPortfolioMode }: BentoGridProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-8 pb-24 md:pb-8 relative z-10 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent w-full">
      
      {/* Decorative gradient orb */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-textMain mb-1">Command Center</h1>
          <p className="text-textMuted mb-6">Overview of active systems and protocols.</p>
        </div>

        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 auto-rows-auto md:auto-rows-[180px]"
        >
          {/* Main Module - The Engine */}
          <div className="md:col-span-2 lg:col-span-3 row-span-2 glass-panel glass-panel-hover overflow-hidden">
            <EngineCard />
          </div>

          {/* The Path - SAP Mastery */}
          <div className="md:col-span-2 lg:col-span-2 glass-panel glass-panel-hover">
            <PathCard onNavigateToLogic={onNavigateToLogic} />
          </div>

          {isPortfolioMode ? (
            <>
              {/* Portfolio Mode Replacements */}
              <div className="glass-panel glass-panel-hover">
                <SummaryCard />
              </div>
              <div className="glass-panel glass-panel-hover">
                <GithubCard />
              </div>
            </>
          ) : (
            <>
              {/* Private Mode Cards */}
              <div onClick={() => onNavigate && onNavigate('analytics')} className="glass-panel glass-panel-hover cursor-pointer">
                <VitalityCard />
              </div>
              <div onClick={() => onNavigate && onNavigate('analytics')} className="glass-panel glass-panel-hover cursor-pointer">
                <LedgerCard />
              </div>
              <div onClick={() => onNavigate && onNavigate('dojo')} className="glass-panel glass-panel-hover cursor-pointer">
                <ForgeCard />
              </div>
            </>
          )}

          {/* The Guard */}
          <div className="md:col-span-2 lg:col-span-2 glass-panel glass-panel-hover">
            <GuardCard />
          </div>

        </motion.div>

      </div>
    </div>
  );
}
