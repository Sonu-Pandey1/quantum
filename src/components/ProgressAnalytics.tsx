import { motion } from 'framer-motion';
import { Target, TrendingDown, Lightbulb, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { Skeleton } from './Skeleton';

export function ProgressAnalytics() {
  const { data } = useAnalytics();

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

  return (
    <div className="space-y-6">
      {/* Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 border border-white/5 bg-white/[0.02] rounded-2xl">
          <div className="flex items-center space-x-2 text-textMuted text-[10px] font-bold uppercase tracking-widest mb-1">
            <CheckCircle size={12} className="text-emerald-500" />
            <span>Total Solved</span>
          </div>
          <p className="text-2xl font-black text-textMain">{data.totalSolved}</p>
        </div>

        <div className="glass-panel p-4 border border-white/5 bg-white/[0.02] rounded-2xl">
          <div className="flex items-center space-x-2 text-textMuted text-[10px] font-bold uppercase tracking-widest mb-1">
            <Target size={12} className="text-primary" />
            <span>Overall Accuracy</span>
          </div>
          <p className="text-2xl font-black text-textMain">{Math.round(data.overallAccuracy)}%</p>
        </div>

        <div className="glass-panel p-4 border border-white/5 bg-white/[0.02] rounded-2xl">
          <div className="flex items-center space-x-2 text-textMuted text-[10px] font-bold uppercase tracking-widest mb-1">
            <BarChart3 size={12} className="text-purple-400" />
            <span>XP Harvested</span>
          </div>
          <p className="text-2xl font-black text-textMain">{data.totalXp.toLocaleString()}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="glass-panel p-6 border border-white/5 bg-black/20 rounded-3xl space-y-6">
        <h3 className="text-xs font-black text-textMuted uppercase tracking-[0.2em] mb-4">Neural Accuracy & Velocity Matrix</h3>
        <div className="space-y-5">
          {data.categoryStats.map(stat => (
            <div key={stat.category} className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-textMain">{stat.category}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${stat.status === 'Mastered' ? 'bg-emerald-500/20 text-emerald-400' :
                      stat.status === 'Fading' ? 'bg-amber-500/20 text-amber-400' :
                        stat.status === 'Untapped' ? 'bg-white/5 text-textMuted' : 'bg-primary/20 text-primary'
                    }`}>
                    {stat.status}
                  </span>
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

      {/* Insights & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weak Areas */}
        <div className="glass-panel p-5 border border-red-500/20 bg-red-500/5 rounded-2xl">
          <div className="flex items-center space-x-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
            <TrendingDown size={14} />
            <span>Weak Areas</span>
          </div>
          {data.weakAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.weakAreas.map(area => (
                <span key={area} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black rounded-lg uppercase">
                  {area}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-textMuted">No critical weak areas.</p>
          )}
        </div>

        {/* Fading Skills */}
        <div className="glass-panel p-5 border border-amber-500/20 bg-amber-500/5 rounded-2xl">
          <div className="flex items-center space-x-2 text-amber-500 text-xs font-bold uppercase tracking-widest mb-3">
            <AlertCircle size={14} />
            <span>Retention Risks</span>
          </div>
          {data.fadingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.fadingSkills.map(area => (
                <span key={area} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black rounded-lg uppercase">
                  {area}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-textMuted">Retention stable.</p>
          )}
        </div>

        {/* Suggestions */}
        <div className="glass-panel p-5 border border-primary/20 bg-primary/5 rounded-2xl">
          <div className="flex items-center space-x-2 text-primary text-xs font-bold uppercase tracking-widest mb-3">
            <Lightbulb size={14} />
            <span>Suggestions</span>
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
      </div>
    </div>
  );
}
