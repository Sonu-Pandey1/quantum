import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock, Loader2, BrainCircuit, Flag, Code2 } from 'lucide-react';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';

interface RoadmapPhase {
  id: number;
  phase: string;
  title: string;
  desc: string;
  status: string;
  type: 'partial' | 'current' | 'locked';
}

const defaultRoadmap: RoadmapPhase[] = [
  {
    id: 1,
    phase: 'Phase 1',
    title: 'ABAP Fundamentals',
    desc: 'Variables, Data Types, Internal Tables, Work Areas',
    status: '60% Complete',
    type: 'partial',
  },
  {
    id: 2,
    phase: 'Phase 2',
    title: 'Modularization',
    desc: 'Includes, Function Modules, Subroutines',
    status: 'CURRENT FOCUS',
    type: 'current',
  },
  {
    id: 3,
    phase: 'Phase 3',
    title: 'Advanced ABAP & RAP',
    desc: 'OData, CDS Views, RAP Business Objects',
    status: 'LOCKED',
    type: 'locked',
  },
  {
    id: 4,
    phase: 'Phase 4',
    title: 'SAP UI5 & Fiori Mastery',
    desc: 'Frontend Framework Integration',
    status: 'LOCKED',
    type: 'locked',
  }
];

export function PathCard({ onNavigateToLogic }: { onNavigateToLogic?: () => void }) {
  const [solvedCount, setSolvedCount] = useState(0);
  const [sapTarget, setSapTarget] = useState('SAP JOB IN 90 DAYS');
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      let uid = 'default';
      
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          uid = session.user.id;
        }
      }

      // Check Database first if logged in
      if (uid !== 'default' && supabase) {
        try {
          const { data } = await supabase.from('profiles').select('settings').eq('id', uid).single();
          if (data && data.settings) {
            const dbSettings = data.settings;
            if (dbSettings.sapTarget) setSapTarget(dbSettings.sapTarget.toUpperCase());
            if (dbSettings.roadmap) {
              setRoadmap(dbSettings.roadmap);
            }
          }
        } catch (e) {
          // DB fetch error, proceed to localStorage
        }
      }

      // If roadmap is still empty, try localStorage
      setRoadmap((prev) => {
        if (prev.length > 0) return prev;
        const savedRoadmap = localStorage.getItem(`quantum_roadmap_${uid}`);
        if (savedRoadmap && savedRoadmap !== "undefined") {
          try { return JSON.parse(savedRoadmap); } catch(e) { console.error("Roadmap parse error", e); }
        }
        if (uid === 'default') {
          const globalR = localStorage.getItem('quantum_roadmap');
          if (globalR && globalR !== "undefined") {
            try { return JSON.parse(globalR); } catch(e) { console.error("Global Roadmap parse error", e); }
          }
        }
        return defaultRoadmap;
      });
      
      // If sapTarget is default, try localStorage
      setSapTarget((prev) => {
        if (prev !== 'SAP JOB IN 90 DAYS') return prev;
        const savedSap = localStorage.getItem(`quantum_sap_target_${uid}`);
        if (savedSap) return savedSap.toUpperCase();
        if (uid === 'default') {
          const globalSaved = localStorage.getItem('quantum_sap_target');
          if (globalSaved) return globalSaved.toUpperCase();
        }
        return prev;
      });

      if (uid !== 'default' && supabase) {
        try {
          const { count, error } = await supabase
            .from('practice_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid);
          
          if (!error && count !== null) setSolvedCount(count);
        } catch (e) {
          // Fallback or ignore
        }
      }
    };
    fetchUserData();
    
    const interval = setInterval(fetchUserData, 5000);
    return () => clearInterval(interval);
  }, []);

  const masteryPercent = Math.min(100, solvedCount); // Out of 100 questions

  return (
    <div className="h-full p-6 flex flex-col relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex items-center space-x-3 mb-6 relative z-10">
        <div className="p-3 bg-purple-500/20 rounded-xl">
          <BrainCircuit className="text-purple-500" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-textMain">The Path</h2>
          <p className="text-xs text-purple-400 font-medium tracking-wide mt-1 uppercase">{sapTarget}</p>
        </div>
      </div>

      {/* Skill Tree Timeline */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 relative z-10 space-y-4 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
        {roadmap.map((item, idx) => {
          const isLast = idx === roadmap.length - 1;
          
          return (
            <div key={item.id} className={`relative flex items-start ${item.type === 'locked' ? 'opacity-50' : 'opacity-100'}`}>
              
              {/* Timeline Connector */}
              {!isLast && (
                <div className="absolute left-4 top-8 bottom-[-16px] w-0.5 bg-surfaceHighlight" />
              )}
              
              {/* Timeline Icon */}
              <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-border mt-1 shrink-0">
                {item.type === 'partial' && <CheckCircle2 size={16} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                {item.type === 'current' && <Loader2 size={16} className="text-primary animate-spin" />}
                {item.type === 'locked' && <Lock size={14} className="text-textMuted" />}
              </div>
              
              {/* Content */}
              <div className="ml-4 flex-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold tracking-wider text-textMuted uppercase">{item.phase}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.type === 'current' ? 'bg-primary/20 text-primary border border-primary/30 animate-pulse' :
                    item.type === 'partial' ? 'bg-emerald-500/10 text-emerald-500' :
                    'bg-surfaceHighlight text-textMuted'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-textMain mt-1">{item.title}</h4>
                <p className="text-xs text-textMuted mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logic Laboratory Section */}
      <div className="mt-6 pt-5 border-t border-border relative z-10">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h4 className="text-sm font-semibold text-textMain flex items-center">
              <Code2 size={16} className="mr-2 text-primary" /> Practice Protocol
            </h4>
            <p className="text-xs text-textMuted mt-1">Mastery of Logic & Patterns</p>
          </div>
          <span className="text-lg font-bold text-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">{masteryPercent}%</span>
        </div>
        
        <div className="w-full bg-surfaceHighlight rounded-full h-3 mb-4 overflow-hidden shadow-inner">
          <motion.div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full relative" 
            initial={{ width: 0 }}
            animate={{ width: `${masteryPercent}%` }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/40 animate-pulse" />
          </motion.div>
        </div>

        <button 
          onClick={() => {
            audio.playClick();
            if (onNavigateToLogic) onNavigateToLogic();
          }}
          onMouseEnter={() => audio.playClick()}
          className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:border-blue-500/60 rounded-lg text-sm font-medium transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center"
        >
          <Code2 size={16} className="mr-2" /> Enter Practice Hub
        </button>
      </div>

      {/* Mission Target */}
      <div className="mt-4 bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-center">
        <Flag size={16} className="text-primary mr-2" />
        <span className="text-xs font-bold text-primary tracking-wide">TARGET: {sapTarget}</span>
      </div>

    </div>
  );
}
