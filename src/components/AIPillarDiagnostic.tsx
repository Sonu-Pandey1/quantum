import { useState, useEffect } from 'react';
import { Brain, Heart, DollarSign, Sparkles, TrendingUp, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { isApiKeyConfigured, generateStrategyReport } from '../lib/aiService';
import toast from 'react-hot-toast';

export function AIPillarDiagnostic() {
  const { state } = useProgression();
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(`quantum_pillar_report_${state.displayName || 'Agent'}`);
    if (cached) setReport(cached);
  }, [state.displayName]);

  const handleGenerateReport = async () => {
    if (!isApiKeyConfigured()) {
      toast.error('Gemini API Key missing. Please input key in AI Counsel or Header.');
      return;
    }

    setLoading(true);
    try {
      const generated = await generateStrategyReport({
        displayName: state.displayName,
        archetype: state.archetype,
        totalLevel: state.totalLevel,
        totalXp: state.totalXp,
        streakCount: state.streakCount,
        goals: state.goals.join(', '),
        level: state.level,
        xp: state.xp
      });

      setReport(generated);
      localStorage.setItem(`quantum_pillar_report_${state.displayName || 'Agent'}`, generated);
      toast.success('AI Pillar Diagnostic synthesized successfully!', { icon: '📊' });
    } catch (e: any) {
      console.error('Failed generating pillar report:', e);
      toast.error(e.message || 'AI Pillar report synthesis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success('Report copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Find bottleneck pillar
  const pillarLevels = [
    { key: 'Study', label: 'Study (Coding & Skills)', level: state.level.Study, icon: Brain, color: 'text-blue-400' },
    { key: 'Health', label: 'Health (Fitness & Energy)', level: state.level.Health, icon: Heart, color: 'text-emerald-400' },
    { key: 'Finance', label: 'Finance (Vault & Growth)', level: state.level.Finance, icon: DollarSign, color: 'text-amber-400' },
    { key: 'Mind', label: 'Mind (Focus & Discipline)', level: state.level.Mind, icon: Sparkles, color: 'text-purple-400' },
  ];

  const sortedPillars = [...pillarLevels].sort((a, b) => a.level - b.level);
  const bottleneckPillar = sortedPillars[0];

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6 border border-primary/20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <TrendingUp size={22} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-widest text-textMain">AI Pillar Skill Growth Diagnostic</h3>
            <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider">Live Neural Telemetry & Real-World Improvement Directives</p>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              Synthesizing...
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Synthesize Diagnostic
            </>
          )}
        </button>
      </div>

      {/* Bottleneck Warning Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-black text-amber-400 uppercase tracking-wider">Pillar Bottleneck Detected</p>
            <p className="text-[11px] text-textMuted">
              Your <span className="text-white font-bold">{bottleneckPillar.label}</span> is currently your lowest pillar (Level {bottleneckPillar.level}). Focus schedule blocks on this pillar to balance your progression matrix.
            </p>
          </div>
        </div>
      </div>

      {/* Report Markdown View */}
      {report ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-background/50 px-4 py-2 rounded-xl border border-white/5 text-[10px] font-bold text-textMuted uppercase tracking-wider">
            <span>Diagnostic Status: Live Telemetry Synced</span>
            <button onClick={handleCopy} className="flex items-center gap-1 hover:text-white transition-colors">
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-background/60 border border-white/5 max-h-[320px] overflow-y-auto scrollbar-thin text-xs text-textMuted leading-relaxed font-sans prose prose-invert max-w-none">
            {report.split('\n').map((line, idx) => {
              if (line.trim().startsWith('### ')) {
                return <h4 key={idx} className="text-textMain font-bold text-xs uppercase tracking-wider mt-4 mb-2">{line.replace('### ', '')}</h4>;
              }
              if (line.trim().startsWith('## ')) {
                return <h3 key={idx} className="text-primary font-black text-sm uppercase tracking-widest mt-5 mb-2.5">{line.replace('## ', '')}</h3>;
              }
              if (line.trim().startsWith('# ')) {
                return <h2 key={idx} className="text-primary font-black text-base uppercase tracking-widest mt-6 mb-3 border-b border-primary/20 pb-2">{line.replace('# ', '')}</h2>;
              }
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return <div key={idx} className="flex gap-2 pl-2 my-1 items-start"><span className="text-primary mt-1">•</span><span>{line.substring(2)}</span></div>;
              }
              if (line.trim().startsWith('1. ') || line.trim().startsWith('2. ') || line.trim().startsWith('3. ')) {
                return <p key={idx} className="text-xs text-textMain/90 font-bold mt-3 mb-1.5">{line}</p>;
              }
              return <p key={idx} className="my-1.5">{line}</p>;
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-surface border border-dashed border-border rounded-2xl">
          <TrendingUp size={36} className="text-textMuted/40 mx-auto mb-3" />
          <p className="text-xs text-textMuted max-w-md mx-auto leading-relaxed">
            Click <span className="text-primary font-bold">"Synthesize Diagnostic"</span> above to compile a real-world AI skill improvement report from your live pillar telemetry.
          </p>
        </div>
      )}
    </div>
  );
}
