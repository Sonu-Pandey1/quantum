import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, BrainCircuit, Search,
  CheckCircle2, Star, Lock, Timer
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';
import { useProgression } from '../hooks/useProgression';
import { QUESTIONS } from '../lib/questions';
import type { Question } from '../lib/questions';
import { formatDistanceToNow, parseISO, isAfter, addDays } from 'date-fns';
import { ListSkeleton } from '../components/Skeleton';

const LOCK_DAYS = 7; // 1 week lock after solve

// Validator: Easy = length only, Medium = some effort, Hard = strict
function validateAnswer(question: Question, input: string): { isValid: boolean; message: string } {
  const cleanInput = input.trim();
  const lower = cleanInput.toLowerCase();

  // Minimum length gate for all difficulties
  const minLen = question.difficulty === 'Easy' ? 5 : question.difficulty === 'Medium' ? 15 : 30;
  if (cleanInput.length < minLen) {
    return { isValid: false, message: `Answer too short. Minimum ${minLen} characters required.` };
  }

  // Easy questions: length check is sufficient — accept all
  if (question.difficulty === 'Easy') {
    return { isValid: true, message: 'Good work! Protocol accepted.' };
  }

  // Pattern questions (Medium/Hard): must show iteration + output concept
  if (question.category === 'Pattern') {
    const hasLoop = /for|while|loop|do|repeat|iterate/i.test(input);
    const hasOutput = /print|console|write|output|display|\*/i.test(input);
    if (hasLoop && hasOutput) return { isValid: true, message: 'Pattern logic verified.' };
    if (cleanInput.length >= 50) return { isValid: true, message: 'Detailed approach accepted.' };
    return { isValid: false, message: 'Pattern solution should show iteration and output logic.' };
  }

  // HR questions: check for relevant professional terms OR sufficient length
  if (question.category === 'HR') {
    const professionalTerms = ['talk', 'discuss', 'private', 'manager', 'learn', 'feedback', 'team',
      'communication', 'resolve', 'understand', 'approach', 'professional', 'meeting', 'concern'];
    const hasTerms = professionalTerms.some(t => lower.includes(t));
    if (hasTerms && cleanInput.length >= 20) return { isValid: true, message: 'Professional standard met.' };
    if (cleanInput.length >= 60) return { isValid: true, message: 'Accepted.' };
    return { isValid: false, message: 'Provide a professional response addressing the scenario.' };
  }

  // Logic & ABAP: flexible matching
  if (question.category === 'Logic' || question.category === 'ABAP') {
    if (!question.correctAnswer) return { isValid: true, message: 'Accepted.' };
    const target = question.correctAnswer.toLowerCase().trim();
    const normInput = lower.replace(/[^a-z0-9]/g, '');
    const normTarget = target.replace(/[^a-z0-9]/g, '');
    if (normInput === normTarget) return { isValid: true, message: 'Perfect match!' };
    if (lower.includes(target) || target.includes(lower)) return { isValid: true, message: 'Core logic identified.' };
    // For Hard: strict; for Medium: generous
    if (question.difficulty === 'Medium' && cleanInput.length >= 20) return { isValid: true, message: 'Approach accepted.' };
    return { isValid: false, message: 'Logic does not match. Review the expected protocol.' };
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
  const selectedQuestionRef = useRef<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string, bonus?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hardStreak, setHardStreak] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { addXp, state } = useProgression();
  const submissionsRef = useRef<Record<string, Submission>>({});
  const activeTabRef   = useRef<string>('All');

  const [userId, setUserId] = useState<string>('default');

  const saveHardStreak = (newStreak: number) => {
    setHardStreak(newStreak);
    localStorage.setItem(`quantum_hard_streak_${userId}`, newStreak.toString());
  };

  // Keep refs in sync with state for use inside closures/setTimeout
  const setSubmissionsWithRef = useCallback((updater: (prev: Record<string, Submission>) => Record<string, Submission>) => {
    setSubmissions(prev => {
      const next = updater(prev);
      submissionsRef.current = next;
      return next;
    });
  }, []);

  const setSelectedQuestionWithRef = useCallback((q: Question | null) => {
    selectedQuestionRef.current = q;
    setSelectedQuestion(q);
  }, []);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

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
          const existing = subMap[s.question_id];
          if (!existing || s.solve_count > existing.solve_count) {
            subMap[s.question_id] = s;
          }
        });
        // Smart merge: only overwrite an existing entry if the DB entry is newer
        setSubmissionsWithRef(prev => {
          const merged: Record<string, Submission> = { ...prev };
          Object.entries(subMap).forEach(([qId, dbEntry]) => {
            const cur = merged[qId];
            if (!cur) {
              merged[qId] = dbEntry;
            } else {
              const curTs = new Date(cur.last_solved_at).getTime();
              const dbTs  = new Date(dbEntry.last_solved_at).getTime();
              if (dbTs > curTs) merged[qId] = dbEntry;
            }
          });
          return merged;
        });
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
    if (!selectedQuestion || submitting) return;

    const validation = validateAnswer(selectedQuestion, userAnswer);
    if (!validation.isValid) {
      setFeedback({ type: 'error', message: validation.message });
      audio.playClick();
      return;
    }

    const sub = submissions[selectedQuestion.id];
    const now = new Date();
    
    // Enforce 7-day lock on ALL difficulties including Easy
    if (sub) {
      const lockUntil = addDays(parseISO(sub.last_solved_at), LOCK_DAYS);
      if (isAfter(lockUntil, now)) {
        setFeedback({ type: 'error', message: `Protocol locked for ${formatDistanceToNow(lockUntil)} more.` });
        return;
      }
    }

    setSubmitting(true);

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

    // Sync to DB — explicit UPDATE/INSERT to avoid duplicate rows
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const uid = session.user.id;
          const qid = selectedQuestion.id;
          const newSolveCount = (sub?.solve_count || 0) + 1;
          const totalXp = xpGained; // actual XP input passed to addXp (addXp multiplies further)

          // Check if a row already exists for this user+question
          const { data: existing } = await supabase
            .from('practice_submissions')
            .select('id')
            .eq('user_id', uid)
            .eq('question_id', qid)
            .limit(1)
            .maybeSingle();

          if (existing?.id) {
            await supabase
              .from('practice_submissions')
              .update({ last_solved_at: now.toISOString(), solve_count: newSolveCount, total_xp_earned: totalXp })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('practice_submissions')
              .insert({ user_id: uid, question_id: qid, last_solved_at: now.toISOString(), solve_count: 1, total_xp_earned: totalXp });
          }
        } catch (e) {
          console.error('DB Sync failed:', e);
        }
      }
    }

    // Breakdown for activity log
    const baseAmount = isRepeat ? selectedQuestion.xpRepeatSolve : selectedQuestion.xpFirstSolve;
    const durationMs = Date.now() - (startTime ?? Date.now());
    const durationSec = Math.floor(durationMs / 1000);
    const durationStr = durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;

    // Award XP — addXp handles ALL multipliers and returns the actual finalAmount awarded
    const awarded = await addXp(
      'Study',
      // Build a concise label; awarded XP recorded by addXp will be the ground truth
      `${selectedQuestion.title}|Solved in ${durationStr} (+${baseAmount} Base${timeBonus > 0 ? ` +${timeBonus} Speed` : ''})`,
      xpGained  // base + time bonus, addXp will scale further
    );

    // Now we know the exact XP added — show it accurately in the toast
    setFeedback({
      type: 'success',
      message: `Protocol Mastered! +${awarded} XP awarded.${timeBonus > 0 ? ` (includes +${timeBonus} speed bonus)` : ''}`,
      bonus: timeBonus > 0 ? timeBonus : undefined
    });
    
    // Optimistically lock this question immediately — survives fetchSubmissions merge
    const freshEntry: Submission = {
      question_id: selectedQuestion.id,
      last_solved_at: now.toISOString(),
      solve_count: (sub?.solve_count || 0) + 1,
    };
    const solvedId = selectedQuestion.id;
    setSubmissionsWithRef(prev => ({ ...prev, [solvedId]: freshEntry }));

    await fetchSubmissions();

    // Re-stamp after DB refresh to guarantee the lock is never lost
    setSubmissionsWithRef(prev => ({ ...prev, [solvedId]: freshEntry }));
    setSubmitting(false);

    // Auto-navigate — use refs so we read fresh data after the 3s delay
    setTimeout(() => {
      const latestSubs = submissionsRef.current;
      const latestTab  = activeTabRef.current;
      // Re-compute filtered list from scratch using latest tab (no stale closure)
      const candidateList = latestTab === 'Training' ? QUESTIONS : QUESTIONS.filter(q => {
        if (latestTab !== 'All' && q.category !== latestTab) return false;
        return true;
      });
      const currentIndex = candidateList.findIndex(q => q.id === solvedId);
      const nextQ = candidateList.slice(currentIndex + 1).find(q => {
        const sub = latestSubs[q.id];
        if (!sub) return true; // never solved — available
        const lockUntil = addDays(parseISO(sub.last_solved_at), LOCK_DAYS);
        return !isAfter(lockUntil, new Date());
      });
      setSelectedQuestionWithRef(nextQ || null);
      setUserAnswer('');
      setFeedback(null);
      setStartTime(nextQ ? Date.now() : null);
    }, 3000);
  };

  const getLockInfo = (qId: string) => {
    const sub = submissions[qId];
    if (!sub) return null;
    const lockUntil = addDays(parseISO(sub.last_solved_at), LOCK_DAYS);
    const now = new Date();
    return isAfter(lockUntil, now) ? lockUntil : null;
  };

  // Hard questions are open to everyone — no prerequisite gate
  const isHardLocked = (_q: Question) => false;

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

  // ── Pillar-level analytics (Study only in Practice Hub) ─────────────
  const studyXp   = state?.xp?.Study ?? 0;
  const studyLevel = state?.level?.Study ?? 1;
  // XP needed for next raw level — same formula as useProgression
  const xpForLevel = (lvl: number) => Math.pow(lvl - 1, 1.5) * 100;
  const nextLevelXp = xpForLevel(studyLevel + 1);
  const prevLevelXp = xpForLevel(studyLevel);
  const studyProgress = nextLevelXp > prevLevelXp
    ? Math.min(100, ((studyXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)
    : 100;

  const studyRank = studyLevel < 5 ? 'Novice' : studyLevel < 15 ? 'Scholar' : studyLevel < 30 ? 'Expert' : studyLevel < 50 ? 'Sage' : 'Master Mind';

  const solvedByCategory = (cat: string) =>
    QUESTIONS.filter(q => q.category === cat && !!submissions[q.id]).length;
  const totalByCategory  = (cat: string) => QUESTIONS.filter(q => q.category === cat).length;



  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col md:flex-row flex-1 w-full h-full bg-background relative z-10 overflow-hidden"
    >
      {/* Left List — full width on mobile when no question, fixed width on desktop */}
      <div className={`w-full md:w-96 border-r border-border bg-surface/30 backdrop-blur-xl flex flex-col ${selectedQuestion ? 'hidden md:flex' : 'flex'} h-full overflow-hidden shrink-0`}>
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
                <span className="text-[10px] font-black">{hardStreak}🔥</span>
              </div>
            )}
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search protocols..." 
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
                activeTab === tab ? 'text-primary' : 'text-textMuted hover:text-primary'
              }`}
            >
              {tab === 'Training' ? '🎯 Daily' : tab}
              {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 pb-40 md:pb-24 scrollbar-default">
          {loading ? (
            <ListSkeleton count={8} />
          ) : filtered.map(q => {
            const lockUntil = getLockInfo(q.id);
            const isSolved = !!submissions[q.id];
            const sub = submissions[q.id];
            const solveCount = sub?.solve_count || 0;
            return (
              <button
                key={q.id}
                onClick={() => {
                  if (isHardLocked(q) || !!lockUntil) return;
                  setSelectedQuestion(q);
                  setUserAnswer('');
                  setFeedback(null);
                  setStartTime(Date.now());
                }}
                disabled={isHardLocked(q) || !!lockUntil}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border group relative overflow-hidden ${
                  isHardLocked(q) ? 'opacity-40 cursor-not-allowed border-transparent bg-white/[0.02]' :
                  lockUntil ? 'border-amber-500/20 bg-amber-500/5 cursor-not-allowed' :
                  selectedQuestion?.id === q.id 
                    ? 'bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(59,130,246,0.08)]' 
                    : 'bg-white/[0.03] border-white/5 hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                {/* Difficulty color bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                  q.difficulty === 'Easy' ? 'bg-emerald-500' :
                  q.difficulty === 'Medium' ? 'bg-amber-500' : 'bg-red-500'
                } ${lockUntil ? 'opacity-20' : 'opacity-80'}`} />

                <div className="pl-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold text-sm leading-tight ${
                      lockUntil ? 'text-textMuted/50' :
                      selectedQuestion?.id === q.id ? 'text-primary' : 'text-textMain'
                    }`}>{q.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {lockUntil && <Lock size={11} className="text-amber-500" />}
                      {isSolved && !lockUntil && <CheckCircle2 size={13} className="text-emerald-400" />}
                      {solveCount > 0 && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          lockUntil ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>{solveCount}×</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-textMuted">{q.category}</span>
                      <span className={`font-black ${
                        q.difficulty === 'Easy' ? 'text-emerald-500' : 
                        q.difficulty === 'Medium' ? 'text-amber-500' : 'text-red-500'
                      }`}>{q.difficulty}</span>
                      <span className="font-bold text-white/20">+{solveCount > 0 ? q.xpRepeatSolve : q.xpFirstSolve} XP</span>
                    </div>
                    {lockUntil && (
                      <span className="text-[9px] font-black text-amber-500/80 flex items-center gap-1">
                        <Timer size={9} /> {formatDistanceToNow(lockUntil)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace — always visible on desktop, only visible when question selected on mobile */}
      <div className={`flex-1 flex flex-col bg-surface/10 overflow-hidden ${selectedQuestion ? 'flex' : 'hidden md:!flex'}`}>

        {/* ── Question panel ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {selectedQuestion && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 p-4 md:p-12 overflow-y-auto h-full scrollbar-default pb-40 md:pb-12"
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
                        disabled={!!getLockInfo(selectedQuestion.id) || isHardLocked(selectedQuestion) || submitting}
                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          getLockInfo(selectedQuestion.id) || isHardLocked(selectedQuestion)
                            ? 'bg-white/5 text-textMuted cursor-not-allowed border border-white/5'
                            : submitting
                              ? 'bg-primary/60 text-white cursor-not-allowed'
                              : 'bg-primary text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {submitting ? (
                          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Syncing...</>
                        ) : getLockInfo(selectedQuestion.id) ? (
                          <><Lock size={14} />Locked — {formatDistanceToNow(getLockInfo(selectedQuestion.id)!)} remaining</>
                        ) : 'Execute Protocol'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state — rendered directly, no AnimatePresence ─────── */}
        {!selectedQuestion && (
          <div className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-y-auto min-h-full">
            {activeTab === 'All' ? (
              /* Study Pillar Dashboard */
              <div className="w-full max-w-sm md:max-w-md mx-auto">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 relative">
                    <div className="absolute inset-0 rounded-2xl border border-primary/30 animate-ping opacity-10" />
                    <BrainCircuit size={32} className="text-primary" />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1">Study Pillar</div>
                  <h2 className="text-2xl md:text-3xl font-black text-textMain uppercase tracking-tight">{studyRank}</h2>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-textMuted">Level {studyLevel}</span>
                  <span className="text-sm font-black text-primary">{studyXp.toLocaleString()} XP</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-1">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${studyProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <div className="text-[10px] text-textMuted text-right mb-6">{Math.round(nextLevelXp - studyXp)} XP to Level {studyLevel + 1}</div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="text-xl font-black text-emerald-400">{Object.keys(submissions).length}</div>
                    <div className="text-[9px] text-textMuted uppercase font-bold mt-1">Solved</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="text-xl font-black text-primary">{QUESTIONS.length - Object.keys(submissions).filter(id => !!getLockInfo(id)).length}</div>
                    <div className="text-[9px] text-textMuted uppercase font-bold mt-1">Available</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="text-xl font-black text-amber-400">{Object.keys(submissions).filter(id => !!getLockInfo(id)).length}</div>
                    <div className="text-[9px] text-textMuted uppercase font-bold mt-1">Cooling</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['Pattern','Logic','HR','ABAP'] as const).map(cat => {
                    const solved = solvedByCategory(cat);
                    const total  = totalByCategory(cat);
                    const pct    = total > 0 ? Math.round((solved / total) * 100) : 0;
                    return (
                      <div key={cat} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-textMuted uppercase">{cat}</span>
                          <span className="text-[10px] font-black text-primary">{solved}/{total}</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-center text-[11px] text-textMuted opacity-40 mt-6">
                  Select a protocol from the left panel to begin.
                </p>
              </div>
            ) : (
              /* Neural Link Active — other tabs */
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/5 border border-primary/10 mb-6">
                  <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-10" />
                  <BrainCircuit size={36} className="text-primary/30" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-textMain mb-3 uppercase tracking-tight">Neural Link Active</h2>
                <p className="max-w-xs mx-auto text-sm leading-relaxed text-textMuted opacity-50">
                  Select a protocol to begin. Solve once for full XP — locks 7 days, then repeat for bonus XP.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
