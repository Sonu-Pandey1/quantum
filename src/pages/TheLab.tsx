
import { Activity, HeartPulse, Dna } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';

export function TheLab() {
  const { state: { xp, level } } = useProgression();

  return (
    <div className="flex-1 h-full flex flex-col p-8 overflow-y-auto">
      <div className="mb-8 flex items-center space-x-3">
        <Activity size={32} className="text-red-500" />
        <h1 className="text-3xl font-bold text-textMain tracking-tight">The Lab</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 border border-red-500/20 rounded-2xl">
          <div className="flex items-center space-x-2 mb-2">
            <HeartPulse className="text-red-500" size={24} />
            <h2 className="text-lg font-bold text-textMain">Vitality Level</h2>
          </div>
          <p className="text-4xl font-black text-red-400">{level.Health}</p>
          <p className="text-sm text-textMuted mt-1">Total Health XP: {xp.Health}</p>
        </div>

        <div className="glass-panel p-6 border border-white/10 rounded-2xl md:col-span-2 flex flex-col justify-center items-center text-center">
          <Dna className="text-textMuted mb-4" size={48} />
          <h2 className="text-xl font-bold text-textMain">Biometric & Pain Tracking Matrix</h2>
          <p className="text-sm text-textMuted mt-2 max-w-md">Sync wearable data or manually input vitality metrics to visualize your health progression. Coming in v2.0.</p>
        </div>
      </div>
    </div>
  );
}
