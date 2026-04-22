import { Briefcase, Code, Terminal, Cpu } from 'lucide-react';

export function SummaryCard() {
  return (
    <div className="glass-panel col-span-1 md:col-span-2 lg:col-span-2 p-6 flex flex-col justify-between hover:border-blue-500/50 transition-colors relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-blue-500/20" />

      <div className="flex items-center space-x-2 mb-4">
        <Briefcase size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold text-textMain">Professional Summary</h3>
      </div>

      <div className="flex-1 space-y-4">
        <p className="text-sm text-textMuted leading-relaxed">
          Highly disciplined and execution-oriented Senior Fullstack Engineer. Proven ability to architect complex enterprise operating systems under strict performance constraints. Deep expertise in SAP ABAP and Modern Web Technologies.
        </p>
        
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center text-xs text-textMain bg-surfaceHighlight p-2 rounded-lg border border-border">
            <Code size={14} className="text-blue-400 mr-2" /> React & TypeScript Architecture
          </div>
          <div className="flex items-center text-xs text-textMain bg-surfaceHighlight p-2 rounded-lg border border-border">
            <Terminal size={14} className="text-purple-400 mr-2" /> Advanced SAP ABAP & Internal Tables
          </div>
          <div className="flex items-center text-xs text-textMain bg-surfaceHighlight p-2 rounded-lg border border-border">
            <Cpu size={14} className="text-emerald-400 mr-2" /> Performance Optimization & Systems Design
          </div>
        </div>
      </div>
    </div>
  );
}
