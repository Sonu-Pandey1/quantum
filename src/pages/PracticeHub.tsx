import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Search, Star, CheckCircle2, 
  ChevronLeft, Play, Lock, Clock, BrainCircuit, Cpu, MessageSquare 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';
import { useProgression } from '../hooks/useProgression';
import { QUESTIONS } from '../lib/questions';
import type { Question } from '../lib/questions';
import { formatDistanceToNow, parseISO, isAfter, addDays } from 'date-fns';

interface Submission {
  question_id: string;
  last_solved_at: string;
  solve_count: number;
}

export function PracticeHub({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'All' | 'Pattern' | 'Logic' | 'HR' | 'ABAP'>('All');
  const [search, setSearch] = useState('');
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { addXp } = useProgression();

  const fetchSubmissions = useCallback(async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('practice_submissions')
        .select('question_id, last_solved_at, solve_count')
        .eq('user_id', session.user.id);

      if (!error && data) {
        const subMap: Record<string, Submission> = {};
        data.forEach(s => {
          subMap[s.question_id] = s;
        });
        setSubmissions(subMap);
      }
    } catch (e) {
      console.error('Error fetching submissions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleSolve = async () => {
    if (!selectedQuestion) return;

    // Effort-based validation: System accepts any answer longer than 10 characters
    const isCorrect = userAnswer.trim().length >= 10; 

    if (!isCorrect) {
      setFeedback({ type: 'error', message: 'Incorrect logic. System rejected submission.' });
      audio.playClick(); // Error sound?
      return;
    }

    const sub = submissions[selectedQuestion.id];
    const now = new Date();
    
    // Check lock
    if (sub) {
      const lockUntil = addDays(parseISO(sub.last_solved_at), 7);
      if (isAfter(lockUntil, now)) {
        setFeedback({ type: 'error', message: `Protocol Locked. Available in ${formatDistanceToNow(lockUntil)}.` });
        return;
      }
    }

    audio.playSuccess();
    const isRepeat = !!sub;
    const xpGained = isRepeat ? selectedQuestion.xpRepeatSolve : selectedQuestion.xpFirstSolve;

    // Award XP via existing progression system
    await addXp('Study', `Solved: ${selectedQuestion.title}`, xpGained);

    // Sync to DB
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          await supabase.from('practice_submissions').upsert({
            user_id: session.user.id,
            question_id: selectedQuestion.id,
            last_solved_at: now.toISOString(),
            solve_count: (sub?.solve_count || 0) + 1,
            total_xp_earned: (sub?.solve_count || 0) * selectedQuestion.xpRepeatSolve + selectedQuestion.xpFirstSolve // rough calc
          });
        } catch (e) {
          console.error('DB Sync failed:', e);
        }
      }
    }

    setFeedback({ type: 'success', message: `Protocol Mastered! +${xpGained} XP Awarded.` });
    fetchSubmissions();
    setTimeout(() => {
      setSelectedQuestion(null);
      setUserAnswer('');
      setFeedback(null);
    }, 2000);
  };

  const filtered = QUESTIONS.filter(q => {
    if (activeTab !== 'All' && q.category !== activeTab) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getLockInfo = (qId: string) => {
    const sub = submissions[qId];
    if (!sub) return null;
    const lockUntil = addDays(parseISO(sub.last_solved_at), 7);
    const now = new Date();
    return isAfter(lockUntil, now) ? lockUntil : null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full bg-background relative z-10"
    >
      {/* Left List */}
      <div className={`w-full md:w-96 border-r border-border bg-surface/30 backdrop-blur-xl flex flex-col ${selectedQuestion ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3 mb-6">
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-textMuted hover:text-primary transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-textMain flex items-center">
              <BrainCircuit className="mr-2 text-primary" size={20} /> Practice Hub
            </h1>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search challenges..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surfaceHighlight/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="flex border-b border-border px-2 overflow-x-auto no-scrollbar">
          {['All', 'Pattern', 'Logic', 'HR', 'ABAP'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all relative ${
                activeTab === tab ? 'text-primary' : 'text-textMuted hover:text-textMain'
              }`}
            >
              {tab}
              {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs">Fetching Protocol Data...</p>
            </div>
          ) : filtered.map(q => {
            const lockUntil = getLockInfo(q.id);
            const isSolved = !!submissions[q.id];
            return (
              <button
                key={q.id}
                onClick={() => {
                  setSelectedQuestion(q);
                  setUserAnswer('');
                  setFeedback(null);
                }}
                className={`w-full text-left p-4 rounded-xl transition-all border group ${
                  selectedQuestion?.id === q.id 
                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                    : 'bg-surfaceHighlight/30 border-transparent hover:border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-sm ${selectedQuestion?.id === q.id ? 'text-primary' : 'text-textMain'}`}>{q.title}</span>
                  {isSolved && !lockUntil && <CheckCircle2 size={14} className="text-emerald-500" />}
                  {lockUntil && <Clock size={14} className="text-amber-500" />}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-2">
                    <span className="text-textMuted">{q.category}</span>
                    <span className={`font-bold ${
                      q.difficulty === 'Easy' ? 'text-emerald-500' : 
                      q.difficulty === 'Medium' ? 'text-amber-500' : 'text-red-500'
                    }`}>{q.difficulty}</span>
                  </div>
                  {lockUntil && <span className="text-amber-500/80 font-mono">LOCKED</span>}
                  {isSolved && !lockUntil && <span className="text-emerald-500/80 font-mono">REPEATABLE</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace */}
      <div className={`flex-1 flex flex-col bg-surface/10 ${!selectedQuestion ? 'hidden md:flex' : 'flex'}`}>
        <AnimatePresence mode="wait">
          {selectedQuestion ? (
            <motion.div 
              key={selectedQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-12 space-y-8 scrollbar-thin"
            >
              <button onClick={() => setSelectedQuestion(null)} className="md:hidden flex items-center text-textMuted hover:text-primary mb-4 transition-colors">
                <ChevronLeft size={20} className="mr-1" /> All Challenges
              </button>

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    {selectedQuestion.category === 'Pattern' && <Cpu size={16} className="text-primary" />}
                    {selectedQuestion.category === 'Logic' && <Star size={16} className="text-amber-500" />}
                    {selectedQuestion.category === 'HR' && <MessageSquare size={16} className="text-purple-500" />}
                    {selectedQuestion.category === 'ABAP' && <Terminal size={16} className="text-emerald-500" />}
                    <span className="text-xs font-bold uppercase tracking-widest text-textMuted">{selectedQuestion.category} Protocol</span>
                  </div>
                  <h1 className="text-4xl font-black text-textMain tracking-tight">{selectedQuestion.title}</h1>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-1">Status</div>
                  {getLockInfo(selectedQuestion.id) ? (
                    <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold border border-amber-500/20 flex items-center">
                      <Lock size={12} className="mr-1" /> Locked for 7d
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center">
                      <Play size={12} className="mr-1" /> Active
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="glass-panel p-6 border-white/5 bg-white/[0.02]">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Objective</h3>
                    <p className="text-textMain leading-relaxed">{selectedQuestion.description}</p>
                  </div>

                  {selectedQuestion.pseudoCode && (
                    <div className="glass-panel p-6 border-white/5 bg-black/40 font-mono">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4">Reference Logic</h3>
                      <pre className="text-sm text-emerald-400/80 whitespace-pre-wrap">{selectedQuestion.pseudoCode}</pre>
                    </div>
                  )}

                  <div className="flex items-center space-x-6">
                    <div className="flex-1 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="text-[10px] font-bold text-textMuted uppercase mb-1">Standard Reward</div>
                      <div className="text-xl font-black text-primary">+{selectedQuestion.xpFirstSolve} XP</div>
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="text-[10px] font-bold text-textMuted uppercase mb-1">Repeat Reward</div>
                      <div className="text-xl font-black text-textMuted">+{selectedQuestion.xpRepeatSolve} XP</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-6">
                  <div className="glass-panel p-6 flex-1 flex flex-col min-h-[300px] border-primary/20 bg-primary/[0.01]">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-textMuted mb-4">Input Terminal</h3>
                    <textarea 
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder={selectedQuestion.category === 'Pattern' ? 'Implement the pattern logic here...' : 'Type your answer here...'}
                      className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm font-mono text-textMain focus:outline-none focus:border-primary resize-none scrollbar-thin transition-all"
                    />
                    
                    {feedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-4 p-3 rounded-lg text-xs font-bold ${
                          feedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {feedback.message}
                      </motion.div>
                    )}

                    <div className="mt-6">
                      <button 
                        onClick={handleSolve}
                        disabled={!!getLockInfo(selectedQuestion.id)}
                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${
                          getLockInfo(selectedQuestion.id)
                            ? 'bg-white/5 text-textMuted cursor-not-allowed border border-white/5'
                            : 'bg-primary text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {getLockInfo(selectedQuestion.id) ? 'Locked for 7 Days' : 'Execute Submission'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-textMuted p-12 text-center">
              <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                <BrainCircuit size={48} className="opacity-20 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-textMain mb-2">Neural Link Ready</h2>
              <p className="max-w-md text-sm leading-relaxed">
                Select a challenge from the Practice Hub to begin your training. Master patterns, logic, and interview protocols to upgrade your system XP.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
