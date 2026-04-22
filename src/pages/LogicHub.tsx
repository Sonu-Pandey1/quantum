import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Terminal, Search, Star, Trophy, Code2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';

interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  completed: boolean;
}

const generateProblems = (): Problem[] => {
  const problems: Problem[] = [];
  const topics = ['Arrays', 'Strings', 'Internal Tables', 'ABAP SQL', 'Logic', 'Dynamic', 'Pointers'];
  const difficulties: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];
  
  // Specific requested ones
  problems.push({ id: 1, title: 'Star Patterns: Pyramid', difficulty: 'Easy', topic: 'Logic', completed: true });
  problems.push({ id: 2, title: 'Fibonacci Sequence', difficulty: 'Easy', topic: 'Dynamic', completed: true });
  problems.push({ id: 3, title: 'SAP Internal Table Loops', difficulty: 'Medium', topic: 'Internal Tables', completed: false });
  problems.push({ id: 4, title: 'Array Sorting (Bubble & Merge)', difficulty: 'Medium', topic: 'Arrays', completed: false });

  // Generate the rest to make 50
  for (let i = 5; i <= 50; i++) {
    const diff = difficulties[Math.floor(Math.random() * difficulties.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    problems.push({
      id: i,
      title: `${topic} Challenge #${i}`,
      difficulty: diff,
      topic: topic,
      completed: Math.random() > 0.8 // 20% chance completed initially
    });
  }
  return problems;
};

export function LogicHub({ onBack }: { onBack: () => void }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [search, setSearch] = useState('');
  const [logicXp, setLogicXp] = useState(0);

  useEffect(() => {
    setProblems(generateProblems());
    
    const loadXp = async () => {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('logic_xp')
            .select('xp_gained');
          if (data) {
            const totalXp = data.reduce((acc, curr) => acc + curr.xp_gained, 0);
            if (totalXp > 0) {
              setLogicXp(totalXp);
              return;
            }
          }
        } catch(e) {}
      }
      // fallback
      const savedXp = localStorage.getItem('quantum_logic_xp');
      if (savedXp) setLogicXp(parseInt(savedXp, 10));
    };

    loadXp();
  }, []);

  const handleSolve = async (id: number) => {
    audio.playSuccess();
    const problem = problems.find(p => p.id === id);
    if (!problem) return;

    setProblems(prev => prev.map(p => p.id === id ? { ...p, completed: true } : p));
    const newXp = logicXp + 5;
    setLogicXp(newXp);
    
    // Local fallback
    localStorage.setItem('quantum_logic_xp', newXp.toString());

    // Supabase Sync
    if (supabase) {
      try {
        await supabase.from('logic_xp').insert([{
          problem_name: problem.title,
          difficulty: problem.difficulty,
          xp_gained: 5
        }]);
      } catch (e) {
        console.error("Failed to sync logic XP");
      }
    }
  };

  const filtered = problems.filter(p => {
    if (activeTab !== 'All' && p.difficulty !== activeTab) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex h-full w-full relative z-10"
    >
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full border-r border-border overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="p-2 rounded-lg bg-surfaceHighlight hover:bg-primary/20 text-textMuted hover:text-primary transition-colors border border-transparent hover:border-primary/50"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-textMain flex items-center">
                <Terminal className="mr-2 text-primary" /> Logic Repository
              </h1>
              <p className="text-sm text-textMuted">Solve problems to increase system XP.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-surfaceHighlight px-4 py-2 rounded-xl border border-border">
            <Search size={16} className="text-textMuted" />
            <input 
              type="text" 
              placeholder="Search problems..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-textMain w-48"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-border flex space-x-6">
          {['All', 'Easy', 'Medium', 'Hard'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-4 text-sm font-semibold uppercase tracking-wider transition-colors relative ${
                activeTab === tab ? 'text-primary' : 'text-textMuted hover:text-textMain'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              )}
            </button>
          ))}
        </div>

        {/* Problem List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
          <AnimatePresence>
            {filtered.map((problem) => (
              <motion.div 
                key={problem.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between group ${
                  problem.completed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-surface border-border hover:border-primary/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${problem.completed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-surfaceHighlight text-textMuted group-hover:text-primary group-hover:bg-primary/10 transition-colors'}`}>
                    {problem.completed ? <CheckCircle2 size={20} /> : <Code2 size={20} />}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${problem.completed ? 'text-textMuted line-through' : 'text-textMain'}`}>{problem.title}</h3>
                    <div className="flex items-center space-x-3 mt-1 text-xs">
                      <span className={`font-bold uppercase tracking-wider ${
                        problem.difficulty === 'Easy' ? 'text-emerald-500' : 
                        problem.difficulty === 'Medium' ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {problem.difficulty}
                      </span>
                      <span className="text-textMuted flex items-center"><Star size={10} className="mr-1" /> {problem.topic}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    audio.playClick();
                    if (!problem.completed) handleSolve(problem.id);
                  }}
                  disabled={problem.completed}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    problem.completed 
                      ? 'bg-transparent text-emerald-500 cursor-not-allowed opacity-50' 
                      : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  }`}
                >
                  {problem.completed ? 'Solved' : 'Solve'}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Leaderboard Sidebar */}
      <div className="w-80 bg-surface/50 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-border bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex items-center space-x-2 text-primary font-bold text-lg mb-2">
            <Trophy size={20} /> <h2>Global Leaderboard</h2>
          </div>
          <p className="text-xs text-textMuted">Real-time planetary logic rankings.</p>
        </div>

        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Commander User (Current) */}
          <div className="p-4 rounded-xl bg-primary/20 border border-primary/50 relative overflow-hidden flex items-center space-x-3 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary blur-2xl opacity-20" />
            <div className="text-xl font-bold text-primary w-6 text-center">#3</div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                <span className="text-xs font-bold text-textMain">US</span>
              </div>
            </div>
            <div>
              <p className="font-bold text-textMain text-sm">Commander</p>
              <p className="text-xs text-primary font-mono">{logicXp} XP</p>
            </div>
          </div>

          {/* Mock Users */}
          {[
            { rank: 1, name: 'Turing_Ghost', xp: 250 },
            { rank: 2, name: 'SAP_God', xp: 180 },
            { rank: 4, name: 'NullPointer', xp: 95 },
            { rank: 5, name: 'ByteMaster', xp: 40 },
          ].map(user => (
            <div key={user.rank} className="p-3 rounded-lg bg-surface border border-border flex items-center space-x-3 opacity-80">
              <div className="text-lg font-bold text-textMuted w-6 text-center">#{user.rank}</div>
              <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center">
                <span className="text-[10px] font-bold text-textMuted">{user.name.slice(0,2).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-textMain text-sm">{user.name}</p>
                <p className="text-xs text-textMuted font-mono">{user.xp} XP</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
