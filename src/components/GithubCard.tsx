import { GitCommit } from 'lucide-react';

export function GithubCard() {
  // Generate random mock commit data
  const generateCommits = () => {
    const cols = 20;
    const rows = 7;
    const grid = [];
    for (let c = 0; c < cols; c++) {
      const col = [];
      for (let r = 0; r < rows; r++) {
        // Higher probability of commits on weekdays
        const isWeekend = r === 0 || r === 6;
        const commitIntensity = isWeekend ? Math.random() * 0.4 : Math.random();
        col.push(commitIntensity);
      }
      grid.push(col);
    }
    return grid;
  };

  const grid = generateCommits();

  const getIntensityClass = (val: number) => {
    if (val < 0.2) return "bg-surfaceHighlight border border-border";
    if (val < 0.4) return "bg-emerald-500/20";
    if (val < 0.7) return "bg-emerald-500/50";
    if (val < 0.9) return "bg-emerald-500/80";
    return "bg-emerald-500";
  };

  return (
    <div className="glass-panel col-span-1 md:col-span-2 lg:col-span-3 p-6 flex flex-col justify-center hover:border-emerald-500/50 transition-colors relative overflow-hidden group">
      <div className="flex items-center space-x-2 mb-6">
        <GitCommit size={20} className="text-emerald-500" />
        <h3 className="text-lg font-semibold text-textMain">Execution Matrix (Github Activity)</h3>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 p-2 bg-surface rounded-xl border border-border/50 shadow-inner">
          {grid.map((col, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {col.map((cell, j) => (
                <div 
                  key={j} 
                  className={`w-3 h-3 rounded-sm ${getIntensityClass(cell)} transition-colors duration-500 hover:scale-125`}
                  title={`Execution Intensity: ${Math.floor(cell * 100)}%`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-[10px] text-textMuted font-medium uppercase tracking-widest">
        <span>6 Months Trace</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div className="w-2 h-2 rounded-sm bg-surfaceHighlight border border-border" />
          <div className="w-2 h-2 rounded-sm bg-emerald-500/20" />
          <div className="w-2 h-2 rounded-sm bg-emerald-500/50" />
          <div className="w-2 h-2 rounded-sm bg-emerald-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
