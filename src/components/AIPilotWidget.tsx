import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { parseAICommand, executeAIResult } from '../lib/aiActionExecutor';
import { isApiKeyConfigured } from '../lib/aiService';
import toast from 'react-hot-toast';

export function AIPilotWidget() {
  const { state, updateProfile, setTheme, addXp } = useProgression();
  const [loading, setLoading] = useState(false);

  const handleAutoSchedule = async () => {
    if (!isApiKeyConfigured()) {
      toast.error('Gemini API Key missing. Please input key in AI Counsel or Header.', { icon: '🔑' });
      return;
    }

    setLoading(true);
    try {
      const uidKey = Object.keys(localStorage).find(k => k.startsWith('quantum_buffs_'));
      const userId = uidKey ? uidKey.replace('quantum_buffs_', '') : 'default';

      const prompt = `Auto-schedule an ideal day for me focusing on my lowest pillar levels (Study: Lv ${state.level.Study}, Health: Lv ${state.level.Health}, Finance: Lv ${state.level.Finance}, Mind: Lv ${state.level.Mind}). Include a 1-hour study block, a 45-min gym block, and a focus mind block.`;

      const result = await parseAICommand(prompt, {
        displayName: state.displayName,
        archetype: state.archetype,
        levels: state.level,
        goals: state.goals.join(', ')
      });

      await executeAIResult(result, {
        userId,
        updateProfile,
        setTheme,
        addXp,
        reloadTimetable: () => {
          window.dispatchEvent(new Event('quantum_timetable_updated'));
        }
      });

      toast.success('⚡ AI Auto-Schedule Applied to your Timetable!', { icon: '📅' });
    } catch (e: any) {
      console.error('Auto schedule failed:', e);
      toast.error(e.message || 'AI Auto-Schedule failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-primary/10 via-surface to-surfaceHighlight border border-primary/25 relative overflow-hidden shadow-xl"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-primary/20 border border-primary/30 rounded-2xl text-primary shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Proactive Neural Co-Pilot</span>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Live Synced</span>
            </div>
            <h3 className="text-base font-black text-textMain tracking-tight">
              Good day, {state.displayName || 'Agent'}! Ready to balance your growth matrix?
            </h3>
            <p className="text-xs text-textMuted mt-1 max-w-xl leading-relaxed">
              Your overall rank is <span className="text-white font-bold">{state.rank}</span> (Level {state.totalLevel}). Tell AI to automate your schedule or click below to program a balanced routine in 1 second.
            </p>
          </div>
        </div>

        <button
          onClick={handleAutoSchedule}
          disabled={loading}
          className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.03] active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Automating Schedule...
            </>
          ) : (
            <>
              <Zap size={16} />
              1-Click Auto-Schedule My Day
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
