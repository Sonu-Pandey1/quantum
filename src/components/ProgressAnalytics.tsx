import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingDown, Lightbulb, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { Skeleton } from './Skeleton';

export function ProgressAnalytics() {
  const { data } = useAnalytics();
  const [scope, setScope] = useState<'today' | 'lifetime'>('today');

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const currentMetrics = scope === 'today' ? data.today : data.lifetime;

  return (
    <div className="space-y-6">
      {/* Category Breakdown & Matrix (Neural Accuracy & Velocity Matrix) */}
      <div className="glass-panel p-6 border border-white/5 bg-black/20 rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black text-textMuted uppercase tracking-[0.2em]">Neural Accuracy & Velocity Matrix</h3>
            <p className="text-[10px] text-textMuted/70 font-semibold uppercase tracking-wider">
              {scope === 'today' ? "Today's Cognitive Precision & Execution Speed" : "All-Time Algorithmic Precision & Telemetry"}
            </p>
          </div>

          {/* Scope Switcher */}
          <div className="flex items-center bg-surfaceHighlight/60 p-0.5 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-wider self-start sm:self-auto">
            <button
              onClick={() => setScope('today')}
              className={`px-3 py-1 rounded-md transition-all ${
                scope === 'today'
                  ? 'bg-primary text-background shadow-xs font-black'
                  : 'text-textMuted hover:text-textMain'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setScope('lifetime')}
              className={`px-3 py-1 rounded-md transition-all ${
                scope === 'lifetime'
                  ? 'bg-primary text-background shadow-xs font-black'
                  : 'text-textMuted hover:text-textMain'
              }`}
            >
              Lifetime
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {currentMetrics.categoryStats.map(stat => (
            <div key={stat.category} className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-textMain">{stat.category}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                    stat.status === 'Mastered' ? 'bg-emerald-500/20 text-emerald-400' :
                    stat.status === 'Fading' ? 'bg-amber-500/20 text-amber-400' :
                    stat.status === 'Untapped' ? 'bg-white/5 text-textMuted' : 'bg-primary/20 text-primary'
                  }`}>
                    {stat.status}
                  </span>
                  {stat.solved > 0 && (
                    <span className="text-[9px] text-textMuted font-mono">({stat.solved} solved)</span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-[10px] font-mono">
                  <span className="text-textMuted uppercase">Velocity: {stat.avgVelocitySec > 0 ? `${Math.round(stat.avgVelocitySec)}s` : '--'}</span>
                  <span className={`font-bold ${stat.accuracy < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {Math.round(stat.accuracy)}% ACC
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.accuracy}%` }}
                  className={`h-full rounded-full ${stat.accuracy < 60 ? 'bg-red-500' : 'bg-primary'}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overview Row (Today's Solved, Accuracy, and Total XP) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 border border-white/5 bg-white/[0.02] rounded-2xl">
          <div className="flex items-center space-x-2 text-textMuted text-[10px] font-bold uppercase tracking-widest mb-1">
            <CheckCircle size={12} className="text-emerald-500" />
            <span>{scope === 'today' ? "Today's Solved" : "Total Solved"}</span>
          </div>
          <p className="text-2xl font-black text-textMain">{currentMetrics.totalSolved}</p>
        </div>

        <div className="glass-panel p-4 border border-white/5 bg-white/[0.02] rounded-2xl">
          <div className="flex items-center space-x-2 text-textMuted text-[10px] font-bold uppercase tracking-widest mb-1">
            <Target size={12} className="text-primary" />
            <span>{scope === 'today' ? "Today's Accuracy" : "Overall Accuracy"}</span>
          </div>
          <p className="text-2xl font-black text-textMain">{Math.round(currentMetrics.overallAccuracy)}%</p>
        </div>

        <div className="glass-panel p-4 border border-white/5 bg-white/[0.02] rounded-2xl">
          <div className="flex items-center space-x-2 text-textMuted text-[10px] font-bold uppercase tracking-widest mb-1">
            <BarChart3 size={12} className="text-purple-400" />
            <span>{scope === 'today' ? "Today's XP" : "XP Harvested"}</span>
          </div>
          <p className="text-2xl font-black text-textMain">{currentMetrics.totalXp.toLocaleString()}</p>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weak Areas */}
        <div className="glass-panel p-5 border border-red-500/20 bg-red-500/5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
              <TrendingDown size={14} />
              <span>Weak Areas</span>
            </div>
            {data.weakAreas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.weakAreas.map(area => (
                  <span key={area} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg uppercase">
                    {area}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-textMuted">No critical weak areas identified.</p>
            )}
          </div>
          <p className="text-[9px] text-textMuted/60 uppercase font-semibold mt-3 pt-2 border-t border-red-500/10">Dynamic diagnostic check</p>
        </div>

        {/* Retention Risks */}
        <div className="glass-panel p-5 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-amber-500 text-xs font-bold uppercase tracking-widest mb-3">
              <AlertCircle size={14} />
              <span>Retention Risks</span>
            </div>
            {data.fadingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.fadingSkills.map(area => (
                  <span key={area} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black rounded-lg uppercase">
                    {area}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-textMuted">Retention stable.</p>
            )}
          </div>
          <p className="text-[9px] text-textMuted/60 uppercase font-semibold mt-3 pt-2 border-t border-amber-500/10">Circadian memory decay audit</p>
        </div>

        {/* Suggestions */}
        <div className="glass-panel p-5 border border-primary/20 bg-primary/5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-primary text-xs font-bold uppercase tracking-widest mb-3">
              <Lightbulb size={14} />
              <span>Strategic Suggestions</span>
            </div>
            <ul className="space-y-2">
              {data.suggestions.map((s, i) => (
                <li key={i} className="flex items-start space-x-2 text-[11px] text-textMain/80 leading-tight">
                  <span className="text-primary mt-1">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[9px] text-textMuted/60 uppercase font-semibold mt-3 pt-2 border-t border-primary/10">AI-calibrated recommendations</p>
        </div>
      </div>
    </div>
  );
}
