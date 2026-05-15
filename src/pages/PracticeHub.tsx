import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, BrainCircuit, Search,
  CheckCircle2, Star, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';
import { useProgression } from '../hooks/useProgression';
import { QUESTIONS } from '../lib/questions';
import type { Question } from '../lib/questions';
import { formatDistanceToNow, parseISO, isAfter, addDays } from 'date-fns';
import { ListSkeleton } from '../components/Skeleton';

// Inlined validator logic to ensure stability
function validateAnswer(question: Question, input: string): { isValid: boolean; message: string } {
  const cleanInput = input.trim().toLowerCase();
  if (!cleanInput || cleanInput.length < 5) {
    return { isValid: false, message: 'Your solution is too brief. Please provide more detail.' };
  }

  // Logic & ABAP Technical
  if (question.category === 'Logic' || question.category === 'ABAP') {
    if (!question.correctAnswer) return { isValid: true, message: 'Accepted.' };
    const target = question.correctAnswer.toLowerCase().trim();
    if (cleanInput === target) return { isValid: true, message: 'Perfect! Logic is sound.' };
    const normalizedInput = cleanInput.replace(/[^a-z0-9]/g, '');
    const normalizedTarget = target.replace(/[^a-z0-9]/g, '');
    if (normalizedInput === normalizedTarget) return { isValid: true, message: 'Correct formatting.' };
    if (cleanInput.includes(target) || target.includes(cleanInput)) return { isValid: true, message: 'Core logic identified.' };
    return { isValid: false, message: 'Logic does not match expected protocol.' };
  }

  // HR questions
  if (question.category === 'HR') {
    if (!question.correctAnswer) return { isValid: true, message: 'Accepted.' };
    // Simple similarity check
    const isRelated = cleanInput.length > 20 && (cleanInput.includes('talk') || cleanInput.includes('private') || cleanInput.includes('manager') || cleanInput.includes('learn'));
    if (isRelated) return { isValid: true, message: 'Professional standard met.' };
    return { isValid: false, message: 'Response does not align with core principles.' };
  }

  // Pattern questions
  if (question.category === 'Pattern') {
    const hasLoop = /for|while|loop|do|repeat/i.test(input);
    const hasPrint = /print|console|write|output|\*/i.test(input);
    if (hasLoop && hasPrint) return { isValid: true, message: 'Pattern logic verified.' };
    return { isValid: false, message: 'Pattern requires iteration and output.' };
  }

  return { isValid: true, message: 'Accepted.' };
}

interface Submission {
  question_id: string;
  last_solved_at: string;
  solve_count: number;
}

export function PracticeHub({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'All' | 'Pattern' | 'Logic' | 'HR' | 'ABAP' | 'Training'>('All');
  const [difficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [search, setSearch] = useState('');
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string, bonus?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hardStreak, setHardStreak] = useState(0);
  const { addXp, state } = useProgression();

  const [userId, setUserId] = useState<string>('default');

  const saveHardStreak = (newStreak: number) => {
    setHardStreak(newStreak);
    localStorage.setItem(`quantum_hard_streak_${userId}`, newStreak.toString());
  };

  const fetchSubmissions = useCallback(async () => {
    if (!supabase) {
      const saved = localStorage.getItem('quantum_hard_streak_default');
      if (saved) setHardStreak(parseInt(saved));
      setLoading(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || 'default';
    setUserId(uid);

    const saved = localStorage.getItem(`quantum_hard_streak_${uid}`);
    if (saved) setHardStreak(parseInt(saved));

    if (!session) {
      setLoading(false);
      return;
    }

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

    const validation = validateAnswer(selectedQuestion, userAnswer);
    if (!validation.isValid) {
      setFeedback({ type: 'error', message: validation.message });
      audio.playClick();
      // Log failed attempt for analytics (0 XP)
      await addXp(selectedQuestion.category === 'HR' ? 'Mind' : 'Study', `FAILED: ${selectedQuestion.title}`, 0);
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
    let xpGained = isRepeat ? selectedQuestion.xpRepeatSolve : selectedQuestion.xpFirstSolve;
    
    // Time Bonus Logic
    let timeBonus = 0;
    if (startTime) {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const targetSeconds = selectedQuestion.difficulty === 'Easy' ? 45 : selectedQuestion.difficulty === 'Medium' ? 120 : 300;
      if (elapsedSeconds < targetSeconds) {
        timeBonus = Math.floor((targetSeconds - elapsedSeconds) / 10);
        xpGained += timeBonus;
      }
    }

    // Hard Streak Logic
    if (selectedQuestion.difficulty === 'Hard') {
      saveHardStreak(hardStreak + 1);
    }

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
            total_xp_earned: (sub?.solve_count || 0) * selectedQuestion.xpRepeatSolve + selectedQuestion.xpFirstSolve + timeBonus
          });
        } catch (e) {
          console.error('DB Sync failed:', e);
        }
      }
    }

    // Account for global streak multiplier (from useProgression.tsx)
    const today = new Date().toISOString().split('T')[0];
    const isFirstActionToday = state?.lastActivityDate !== today;
    const projectedStreak = isFirstActionToday ? ((state?.streakCount || 0) + 1) : (state?.streakCount || 0);
    const multiplier = projectedStreak >= 3 ? 1.5 : 1.0;
    const finalXpWithMultiplier = Math.floor(xpGained * multiplier);

    // --- Velocity Tracking ---
    const durationMs = Date.now() - (startTime ?? Date.now());
    const durationSec = Math.floor(durationMs / 1000);
    const durationStr = durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;

    // Construct detailed breakdown for activity log using | delimiter for UI separation
    const baseAmount = isRepeat ? selectedQuestion.xpRepeatSolve : selectedQuestion.xpFirstSolve;
    const streakBonus = finalXpWithMultiplier - xpGained;
    const breakdownStr = `${selectedQuestion.title}|Solved in ${durationStr} (+${baseAmount} Base${timeBonus > 0 ? ` + ${timeBonus} Speed` : ''}${streakBonus > 0 ? ` + ${streakBonus} Consistency` : ''})`;

    setFeedback({ 
      type: 'success', 
      message: `Protocol Mastered! +${finalXpWithMultiplier} XP Awarded.`,
      bonus: timeBonus > 0 ? timeBonus : undefined
    });
    
    // Award XP via existing progression system
    await addXp('Study', `Solved: ${breakdownStr}`, xpGained);
    
    fetchSubmissions();
    setTimeout(() => {
      setSelectedQuestion(null);
      setUserAnswer('');
      setFeedback(null);
      setStartTime(null);
    }, 6000); // Extended duration (6 seconds) as requested
  };

  const getMediumSolveCount = (category: string) => {
    return Object.keys(submissions).filter(qId => {
      const q = QUESTIONS.find(q => q.id === qId);
      return q && q.category === category && q.difficulty === 'Medium';
    }).length;
  };

  const getLockInfo = (qId: string) => {
    const sub = submissions[qId];
    if (!sub) return null;
    const lockUntil = addDays(parseISO(sub.last_solved_at), 7);
    const now = new Date();
    return isAfter(lockUntil, now) ? lockUntil : null;
  };

  const isHardLocked = (q: Question) => {
    if (q.difficulty !== 'Hard') return false;
    return getMediumSolveCount(q.category) < 5;
  };

  const getDailyTraining = () => {
    // Pick 1 Easy, 1 Medium, 1 Hard that aren't locked recently
    const daily: Question[] = [];
    ['Easy', 'Medium', 'Hard'].forEach(diff => {
      const available = QUESTIONS.filter(q => q.difficulty === diff && !getLockInfo(q.id) && !isHardLocked(q));
      if (available.length > 0) {
        // Deterministic daily pick based on date
        const index = new Date().getDate() % available.length;
        daily.push(available[index]);
      }
    });
    return daily;
  };

  const filtered = activeTab === 'Training' ? getDailyTraining() : QUESTIONS.filter(q => {
    if (activeTab !== 'All' && q.category !== activeTab) return false;
    if (difficultyFilter !== 'All' && q.difficulty !== difficultyFilter) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });



  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 w-full bg-background relative z-10 overflow-hidden"
    >
      {/* Left List */}
      <div className={`w-full md:w-96 border-r border-border bg-surface/30 backdrop-blur-xl flex flex-col ${selectedQuestion ? 'hidden md:flex' : 'flex'} h-full overflow-hidden`}>
        <div className="p-4 md:p-6 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center space-x-2">
              <button onClick={onBack} className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg text-textMuted hover:text-primary transition-colors">
                <ChevronLeft size={18} className="md:w-5 md:h-5" />
              </button>
              <h1 className="text-lg md:text-xl font-bold text-textMain flex items-center uppercase tracking-tighter">
                <BrainCircuit className="mr-2 text-primary md:w-5 md:h-5" size={18} /> Protocols
              </h1>
            </div>
            {hardStreak > 0 && (
              <div className="flex items-center bg-red-500/10 text-red-500 px-2 py-1 rounded-lg border border-red-500/20">
                <Star size={12} className="mr-1 fill-current" />
                <span className="text-[10px] font-black">{hardStreak}</span>
              </div>
            )}
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surfaceHighlight/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="flex border-b border-border px-2 overflow-x-auto no-scrollbar shrink-0">
          {['All', 'Training', 'Pattern', 'Logic', 'HR', 'ABAP'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all relative ${
                activeTab === tab ? 'text-primary' : 'text-textMuted hover:text-textMain'
              }`}
            >
              {tab === 'Training' ? '🎯 Daily' : tab}
              {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin pb-24">
          {loading ? (
            <ListSkeleton count={8} />
          ) : filtered.map(q => {
            const lockUntil = getLockInfo(q.id);
            const isSolved = !!submissions[q.id];
            return (
              <button
                key={q.id}
                onClick={() => {
                  if (isHardLocked(q)) return;
                  setSelectedQuestion(q);
                  setUserAnswer('');
                  setFeedback(null);
                  setStartTime(Date.now());
                }}
                disabled={isHardLocked(q)}
                className={`w-full text-left p-4 rounded-xl transition-all border group relative ${
                  isHardLocked(q) ? 'opacity-50 cursor-not-allowed bg-black/10' :
                  selectedQuestion?.id === q.id 
                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                    : 'bg-surfaceHighlight/30 border-transparent hover:border-white/10 hover:bg-white/5'
                }`}
              >
                {isHardLocked(q) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl z-20">
                    <div className="text-center">
                      <Lock size={16} className="mx-auto mb-1 text-white/40" />
                      <div className="text-[8px] font-black text-white/60 uppercase">Locked</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-bold text-sm ${selectedQuestion?.id === q.id ? 'text-primary' : 'text-textMain'}`}>{q.title}</span>
                  </div>
                  {isSolved && !lockUntil && <CheckCircle2 size={14} className="text-emerald-500" />}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-2">
                    <span className="text-textMuted">{q.category}</span>
                    <span className={`font-bold ${
                      q.difficulty === 'Easy' ? 'text-emerald-500' : 
                      q.difficulty === 'Medium' ? 'text-amber-500' : 'text-red-500'
                    }`}>{q.difficulty}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace */}
      <div className={`flex-1 flex flex-col bg-surface/10 ${!selectedQuestion ? 'hidden md:flex' : 'flex'} h-full md:h-auto overflow-hidden relative`}>
        <AnimatePresence mode="wait">
          {selectedQuestion ? (
            <motion.div 
              key={selectedQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-12 space-y-6 md:space-y-8 scrollbar-thin pb-32"
            >
              <button onClick={() => setSelectedQuestion(null)} className="md:hidden flex items-center text-textMuted hover:text-primary mb-2 transition-colors uppercase tracking-[0.2em] font-black text-[10px]">
                <ChevronLeft size={16} className="mr-1" /> Back to Protocols
              </button>

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-textMuted">{selectedQuestion.category} Protocol</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      selectedQuestion.difficulty === 'Easy' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 
                      selectedQuestion.difficulty === 'Medium' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 
                      'text-red-500 border-red-500/20 bg-red-500/5'
                    }`}>
                      {selectedQuestion.difficulty}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-4xl font-black text-textMain tracking-tight uppercase leading-none">{selectedQuestion.title}</h1>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-6">
                  <div className="glass-panel p-4 md:p-6 border-white/5 bg-white/[0.02]">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 md:mb-4">Objective</h3>
                    <p className="text-sm md:text-base text-textMain leading-relaxed">{selectedQuestion.description}</p>
                  </div>

                  {selectedQuestion.pseudoCode && (
                    <div className="glass-panel p-4 md:p-6 border-white/5 bg-black/40 font-mono">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 md:mb-4">Logic</h3>
                      <pre className="text-xs md:text-sm text-emerald-400/80 whitespace-pre-wrap">{selectedQuestion.pseudoCode}</pre>
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    <div className="flex-1 p-3 md:p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="text-[9px] font-bold text-textMuted uppercase mb-1">Standard</div>
                      <div className="text-lg md:text-xl font-black text-primary">+{selectedQuestion.xpFirstSolve} XP</div>
                    </div>
                    <div className="flex-1 p-3 md:p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="text-[9px] font-bold text-textMuted uppercase mb-1">Repeat</div>
                      <div className="text-lg md:text-xl font-black text-textMuted">+{selectedQuestion.xpRepeatSolve} XP</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-4 md:space-y-6">
                  <div className="glass-panel p-4 md:p-6 flex-1 flex flex-col min-h-[300px] border-primary/20 bg-primary/[0.01]">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-2 md:mb-4">Input</h3>
                    <textarea 
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder={selectedQuestion.category === 'Pattern' ? 'Implement protocol...' : 'Type solution...'}
                      className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-4 text-[13px] md:text-sm font-mono text-textMain focus:outline-none focus:border-primary resize-none scrollbar-thin transition-all min-h-[150px] md:min-h-[200px]"
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

                    <div className="mt-4 md:mt-6">
                      <button 
                        onClick={handleSolve}
                        disabled={!!getLockInfo(selectedQuestion.id) || isHardLocked(selectedQuestion)}
                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${
                          getLockInfo(selectedQuestion.id) || isHardLocked(selectedQuestion)
                            ? 'bg-white/5 text-textMuted cursor-not-allowed border border-white/5'
                            : 'bg-primary text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {isHardLocked(selectedQuestion) ? 'Locked' : getLockInfo(selectedQuestion.id) ? 'Locked' : 'Execute'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-textMuted p-12 text-center pb-32">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-16 md:w-24 h-16 md:h-24 rounded-full bg-primary/5 flex items-center justify-center mb-6 relative"
              >
                <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20" />
                <BrainCircuit size={48} className="opacity-20 text-primary" />
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold text-textMain mb-2 uppercase tracking-tighter">Neural Link Active</h2>
              <p className="max-w-md text-xs md:text-sm leading-relaxed opacity-60">
                Select a protocol from the manifest to begin system calibration and XP harvesting.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
