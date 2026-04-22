
import { Briefcase, TrendingUp, DollarSign } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';

export function Vault() {
  const { state: { xp, level } } = useProgression();

  return (
    <div className="flex-1 h-full flex flex-col p-8 overflow-y-auto">
      <div className="mb-8 flex items-center space-x-3">
        <Briefcase size={32} className="text-yellow-500" />
        <h1 className="text-3xl font-bold text-textMain tracking-tight">The Vault</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 border border-yellow-500/20 rounded-2xl">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="text-yellow-500" size={24} />
            <h2 className="text-lg font-bold text-textMain">Finance Level</h2>
          </div>
          <p className="text-4xl font-black text-yellow-400">{level.Finance}</p>
          <p className="text-sm text-textMuted mt-1">Total Finance XP: {xp.Finance}</p>
        </div>

        <div className="glass-panel p-6 border border-white/10 rounded-2xl md:col-span-2 flex flex-col justify-center items-center text-center">
          <TrendingUp className="text-textMuted mb-4" size={48} />
          <h2 className="text-xl font-bold text-textMain">Financial Forecasting Engine</h2>
          <p className="text-sm text-textMuted mt-2 max-w-md">Connect your accounts or manually enter data to unlock the forecasting matrix. Coming in v2.0.</p>
        </div>
      </div>
    </div>
  );
}
