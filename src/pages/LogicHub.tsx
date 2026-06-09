import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Terminal, Search, Code2, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';
import { useProgression } from '../hooks/useProgression';

interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  completed: boolean;
}

const XP_BY_DIFF: Record<string, number> = { Easy: 20, Medium: 40, Hard: 80 };

const generateProblems = (): Problem[] => {
  const problems: Problem[] = [];
  const topics = ['Arrays', 'Strings', 'Internal Tables', 'ABAP SQL', 'Logic', 'Dynamic', 'Pointers'];
  const difficulties: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];

  problems.push({ id: 1,  title: 'Star Patterns: Pyramid',        difficulty: 'Easy',   topic: 'Logic',           completed: false });
  problems.push({ id: 2,  title: 'Fibonacci Sequence',             difficulty: 'Easy',   topic: 'Dynamic',         completed: false });
  problems.push({ id: 3,  title: 'SAP Internal Table Loops',       difficulty: 'Medium', topic: 'Internal Tables', completed: false });
  problems.push({ id: 4,  title: 'Array Sorting (Bubble & Merge)', difficulty: 'Medium', topic: 'Arrays',          completed: false });

  for (let i = 5; i <= 50; i++) {
    const diff = difficulties[i % difficulties.length];
    const topic = topics[i % topics.length];
    problems.push({ id: i, title: `${topic} Challenge #${i}`, difficulty: diff, topic, completed: false });
  }
  return problems;
};

export function LogicHub({ onBack }: { onBack: () => void }) {
  const { state: { settings }, addXp, updateProfile } = useProgression();
  const [problems, setProblems]   = useState<Problem[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [search, setSearch]       = useState('');
  const [userId, setUserId]       = useState<string>('default');
  const [solving, setSolving]     = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      let uid = 'default';
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) { uid = session.user.id; setUserId(uid); }
      }
      if (settings?.logicProblems) {
        setProblems(settings.logicProblems);
      } else {
        const saved = localStorage.getItem(`quantum_logic_problems_${uid}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setProblems(parsed);
          } catch {
            resetProblems(uid);
          }
        } else {
          resetProblems(uid);
        }
      }
    };
    init();
  }, []);

  // Sync state when loaded
  useEffect(() => {
    if (settings?.logicProblems) {
      setProblems(settings.logicProblems);
    }
  }, [settings?.logicProblems]);

  const resetProblems = async (uid: string) => {
    const fresh = generateProblems();
    setProblems(fresh);
    localStorage.setItem(`quantum_logic_problems_${uid}`, JSON.stringify(fresh));
    if (uid !== 'default' && supabase) {
      await updateProfile({
        settings: {
          ...settings,
          logicProblems: fresh
        }
      });
    }
  };

  const handleSolve = async (id: number) => {
    const problem = problems.find(p => p.id === id);
    if (!problem || problem.completed || solving === id) return;
    setSolving(id);
    audio.playSuccess();

    const xp = XP_BY_DIFF[problem.difficulty] ?? 20;

    // ✅ Route XP through global progression system (Study pillar)
    await addXp('Study', `Logic: ${problem.title}`, xp);

    const updated = problems.map(p => p.id === id ? { ...p, completed: true } : p);
    setProblems(updated);
    localStorage.setItem(`quantum_logic_problems_${userId}`, JSON.stringify(updated));
    if (userId !== 'default' && supabase) {
      await updateProfile({
        settings: {
          ...settings,
          logicProblems: updated
        }
      });
    }
    setSolving(null);
  };

  const filtered = problems.filter(p => {
    if (activeTab !== 'All' && p.difficulty !== activeTab) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const solvedCount = problems.filter(p => p.completed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col h-full w-full overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border flex flex-wrap items-center gap-3 bg-surface/50 backdrop-blur-md shrink-0">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-surfaceHighlight hover:bg-primary/20 text-textMuted hover:text-primary transition-colors border border-transparent hover:border-primary/50"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-black text-textMain flex items-center uppercase tracking-tight">
            <Terminal className="mr-2 text-primary shrink-0" size={20} /> Logic Repository
          </h1>
          <p className="text-[10px] text-textMuted uppercase tracking-widest">
            {solvedCount}/{problems.length} solved · XP routes to Study Pillar
          </p>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-surfaceHighlight px-3 py-2 rounded-xl border border-border w-full sm:w-48">
          <Search size={14} className="text-textMuted shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-textMain w-full"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 border-b border-border flex space-x-4 overflow-x-auto no-scrollbar shrink-0">
        {(['All', 'Easy', 'Medium', 'Hard'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 pt-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative ${
              activeTab === tab ? 'text-primary' : 'text-textMuted hover:text-textMain'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="logic-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Problem List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 scrollbar-thin">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-textMuted">
              <Terminal size={40} className="mb-4 opacity-20" />
              <p className="text-sm">No problems match your filter.</p>
            </div>
          ) : (
            filtered.map(problem => (
              <motion.div
                key={problem.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 md:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  problem.completed
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-surface border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${problem.completed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-surfaceHighlight text-textMuted'}`}>
                    {problem.completed ? <CheckCircle2 size={16} /> : <Code2 size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${problem.completed ? 'text-textMuted line-through' : 'text-textMain'}`}>
                      {problem.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-black uppercase ${
                        problem.difficulty === 'Easy' ? 'text-emerald-500' :
                        problem.difficulty === 'Medium' ? 'text-amber-500' : 'text-red-500'
                      }`}>{problem.difficulty}</span>
                      <span className="text-[10px] text-textMuted">·</span>
                      <span className="text-[10px] text-textMuted">{problem.topic}</span>
                      <span className="text-[10px] text-primary font-bold">+{XP_BY_DIFF[problem.difficulty]} XP</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSolve(problem.id)}
                  disabled={problem.completed || solving === problem.id}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    problem.completed
                      ? 'bg-emerald-500/10 text-emerald-500 cursor-not-allowed flex items-center gap-1'
                      : solving === problem.id
                        ? 'bg-primary/40 text-white cursor-not-allowed'
                        : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-white hover:scale-105'
                  }`}
                >
                  {problem.completed ? (
                    <><Lock size={11} /> Done</>
                  ) : solving === problem.id ? '...' : 'Solve'}
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
