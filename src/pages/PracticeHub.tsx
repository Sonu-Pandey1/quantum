import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, BrainCircuit, Search,
  CheckCircle2, Star, Lock, Timer,
  Terminal, Play, Sparkles, Code, Cpu, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';
import { useProgression } from '../hooks/useProgression';
import { QUESTIONS } from '../lib/questions';
import type { Question } from '../lib/questions';
import { formatDistanceToNow, parseISO, isAfter, addDays } from 'date-fns';
import { ListSkeleton } from '../components/Skeleton';
import { gradeAnswerWithAI, isApiKeyConfigured, generateAIQuestion } from '../lib/aiService';
import type { AIGradeResult } from '../lib/aiService';
import { cn } from '../lib/utils';

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
  const [aiResult, setAiResult] = useState<AIGradeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hardStreak, setHardStreak] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<Question[]>([]);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [sandboxConsoleLogs, setSandboxConsoleLogs] = useState<string[]>([]);
  const [sandboxExecutionSuccess, setSandboxExecutionSuccess] = useState<boolean | null>(null);
  const { addXp, state } = useProgression();
  const submissionsRef = useRef<Record<string, Submission>>({});
  const activeTabRef   = useRef<string>('All');

  const [userId, setUserId] = useState<string>('default');
  
  // Dynamic AI Protocol Forge and daily quest constraints
  const [topicPrompt, setTopicPrompt] = useState('');
  const [aiSolvesCountToday, setAiSolvesCountToday] = useState(0);

  // Load and filter dynamic quests and daily solved quest counts on mount
  useEffect(() => {
    if (userId && userId !== 'default') {
      // 1. Filter out expired dynamic questions (older than 24 hours)
      const savedQuests = localStorage.getItem(`quantum_dynamic_quests_${userId}`);
      if (savedQuests) {
        try {
          const parsed = JSON.parse(savedQuests);
          const now = Date.now();
          const valid = parsed.filter((q: any) => {
            if (!q.expiresAt) return true; // keep if no expiry
            return new Date(q.expiresAt).getTime() > now;
          });
          setDynamicQuestions(valid);
          localStorage.setItem(`quantum_dynamic_quests_${userId}`, JSON.stringify(valid));
        } catch (e) {
          console.error("Failed to parse local dynamic quests", e);
        }
      }

      // 2. Load daily solved count
      const todayStr = new Date().toISOString().split('T')[0];
      const solvesKey = `quantum_ai_solves_today_${userId}_${todayStr}`;
      const savedSolves = localStorage.getItem(solvesKey);
      if (savedSolves) {
        setAiSolvesCountToday(parseInt(savedSolves));
      } else {
        setAiSolvesCountToday(0);
      }
    }
  }, [userId]);

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

  const handleGenerateQuestion = async () => {
    if (!isApiKeyConfigured()) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error("Gemini API Key missing. Please configure key in Neural Settings.");
      });
      return;
    }

    setGeneratingQuestion(true);
    audio.playClick();

    try {
      const newQuestion = await generateAIQuestion(
        activeTab,
        difficultyFilter,
        state.level.Study || 1,
        topicPrompt.trim() || undefined
      );

      // Add 24-hour expiration timestamp
      const expiresAt = addDays(new Date(), 1).toISOString();
      const dynamicQuest: Question = { ...newQuestion, expiresAt } as any;

      // Append new question to dynamic question array and save to local storage
      const updatedQuests = [dynamicQuest, ...dynamicQuestions];
      setDynamicQuestions(updatedQuests);
      localStorage.setItem(`quantum_dynamic_quests_${userId}`, JSON.stringify(updatedQuests));
      
      // Select the question automatically
      setSelectedQuestion(dynamicQuest);
      setUserAnswer(dynamicQuest.pseudoCode || '');
      setFeedback(null);
      setAiResult(null);
      setStartTime(Date.now());
      setIsSandboxMode(false);
      setSandboxConsoleLogs([]);
      setSandboxExecutionSuccess(null);
      setTopicPrompt(''); // Clear input after successful forge

      import('react-hot-toast').then(({ default: toast }) => {
        toast.success(`Protocol Synthesized: ${dynamicQuest.title}!`);
      });
      audio.playSuccess();
    } catch (e: any) {
      console.error(e);
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(e.message || "Failed to synthesize dynamic protocol.");
      });
    } finally {
      setGeneratingQuestion(false);
    }
  };

  const runCodeSandbox = (code: string) => {
    setSandboxConsoleLogs([]);
    setSandboxExecutionSuccess(null);
    audio.playClick();

    const logs: string[] = [];
    const customConsole = {
      log: (...args: any[]) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      },
      error: (...args: any[]) => {
        logs.push(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      },
      warn: (...args: any[]) => {
        logs.push(`[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      }
    };

    try {
      // Setup a safe evaluation box
      const sandboxFn = new Function('console', `
        try {
          ${code}
        } catch(err) {
          console.error(err.message || err);
          throw err;
        }
      `);

      sandboxFn(customConsole);
      setSandboxExecutionSuccess(true);
      setSandboxConsoleLogs(logs.length > 0 ? logs : ["Code executed successfully with 0 output logs."]);
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success("Execution Completed Successfully.");
      });
      audio.playSuccess();
    } catch (err: any) {
      setSandboxExecutionSuccess(false);
      const errorMsg = err.message || String(err);
      if (!logs.some(l => l.includes(errorMsg))) {
        logs.push(`[RUNTIME ERROR] ${errorMsg}`);
      }
      setSandboxConsoleLogs(logs);
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(`Execution Failed: ${errorMsg}`);
      });
    }
  };

  const handleSolve = async () => {
    if (!selectedQuestion || submitting) return;

    // Enforce basic offline validation checks first
    const offlineVal = validateAnswer(selectedQuestion, userAnswer);
    if (!offlineVal.isValid) {
      setFeedback({ type: 'error', message: offlineVal.message });
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
    setFeedback(null);
    setAiResult(null);

    let isAiGraded = false;
    let aiGradeScore = 100;
    let aiXpBonus = 0;

    // Try AI grading if key configured
    if (isApiKeyConfigured()) {
      try {
        setFeedback({ type: 'success', message: 'Initiating Holographic Code Assessment via Gemini...' });
        const gradeResult = await gradeAnswerWithAI(selectedQuestion, userAnswer, isSandboxMode ? sandboxConsoleLogs : undefined);
        setAiResult(gradeResult);
        isAiGraded = true;
        aiGradeScore = gradeResult.score;

        if (!gradeResult.isValid) {
          setFeedback({ 
            type: 'error', 
            message: `Holographic Analysis Rejected (Score: ${gradeResult.score}/100). Review suggestions below.` 
          });
          audio.playClick();
          setSubmitting(false);
          return;
        }

        // Calculate AI Performance XP Bonus
        if (gradeResult.score >= 90) {
          aiXpBonus = 20; // Excellence Bonus
        } else if (gradeResult.score >= 75) {
          aiXpBonus = 10; // Proficiency Bonus
        }
      } catch (err: any) {
        console.warn("AI grading failed, falling back to local protocol validation:", err);
        setFeedback({ type: 'success', message: 'Gemini Link offline. Falling back to local validator...' });
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

    // Add AI Performance XP Bonus
    xpGained += aiXpBonus;

    // Hard Streak Logic
    if (selectedQuestion.difficulty === 'Hard') {
      saveHardStreak(hardStreak + 1);
    }

    // Sync to DB
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const uid = session.user.id;
          const qid = selectedQuestion.id;
          const newSolveCount = (sub?.solve_count || 0) + 1;

          // Check if row already exists
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
              .update({ last_solved_at: now.toISOString(), solve_count: newSolveCount, total_xp_earned: xpGained })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('practice_submissions')
              .insert({ user_id: uid, question_id: qid, last_solved_at: now.toISOString(), solve_count: 1, total_xp_earned: xpGained });
          }
        } catch (e) {
          console.error('DB Sync failed:', e);
        }
      }
    }

    const baseAmount = isRepeat ? selectedQuestion.xpRepeatSolve : selectedQuestion.xpFirstSolve;
    const durationMs = Date.now() - (startTime ?? Date.now());
    const durationSec = Math.floor(durationMs / 1000);
    const durationStr = durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;

    // Award XP — addXp handles multipliers
    const label = isAiGraded
      ? `${selectedQuestion.title}|Solved (Grade: ${aiGradeScore}% + ${aiXpBonus > 0 ? `AI Bonus` : 'No Bonus'})`
      : `${selectedQuestion.title}|Solved in ${durationStr} (+${baseAmount} Base${timeBonus > 0 ? ` +${timeBonus} Speed` : ''})`;

    const awarded = await addXp('Study', label, xpGained);

    // Increment Daily AI Quest solves count and evaluate Syndicate Synergy Bonus
    if (userId && userId !== 'default') {
      const todayStr = new Date().toISOString().split('T')[0];
      const solvesKey = `quantum_ai_solves_today_${userId}_${todayStr}`;
      const nextSolvesCount = aiSolvesCountToday + 1;
      setAiSolvesCountToday(nextSolvesCount);
      localStorage.setItem(solvesKey, nextSolvesCount.toString());

      if (nextSolvesCount === 20) {
        // Syndicate Synergy achieved! Award 200 XP
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
        });
        await addXp('Study', 'Complete 20 Daily AI Protocols Syndicate Synergy Bonus', 200);
        import('react-hot-toast').then(({ default: toast }) => {
          toast.success("🏆 SYNDICATE SYNERGY ACHIEVED! +200 XP Complete Daily Mastery Bonus awarded!", { duration: 8000 });
        });
      }
    }

    // Set dynamic feedback
    let successMsg = `Protocol Mastered! +${awarded} XP awarded.`;
    if (isAiGraded) {
      successMsg += ` Grade: ${aiGradeScore}/100.`;
      if (aiXpBonus > 0) successMsg += ` Included +${aiXpBonus} AI Performance Bonus!`;
    }
    if (timeBonus > 0) successMsg += ` (includes +${timeBonus} speed bonus)`;

    setFeedback({
      type: 'success',
      message: successMsg,
      bonus: timeBonus > 0 ? timeBonus : undefined
    });
    
    // Lock standard 7 days
    const freshEntry: Submission = {
      question_id: selectedQuestion.id,
      last_solved_at: now.toISOString(),
      solve_count: (sub?.solve_count || 0) + 1,
    };
    const solvedId = selectedQuestion.id;
    setSubmissionsWithRef(prev => ({ ...prev, [solvedId]: freshEntry }));

    await fetchSubmissions();

    setSubmissionsWithRef(prev => ({ ...prev, [solvedId]: freshEntry }));
    setSubmitting(false);

    // Auto-navigate after 5 seconds to let them read Gemini's feedback notes!
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
    const daily: Question[] = [];
    const dayOffset = new Date().getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    // Helper to check if a question was solved today
    const isSolvedToday = (qId: string) => {
      const sub = submissions[qId];
      if (!sub) return false;
      const solvedDateStr = new Date(sub.last_solved_at).toISOString().split('T')[0];
      return solvedDateStr === todayStr;
    };

    // We must always include logic-019 (Render Discipline) in the daily pool
    const renderDisciplineQuest = QUESTIONS.find(q => q.id === 'logic-019');
    if (renderDisciplineQuest) {
      daily.push(renderDisciplineQuest);
    }

    const selectForDifficulty = (diff: 'Easy' | 'Medium' | 'Hard', count: number) => {
      // Find questions of this difficulty that are:
      // 1. Solved today (keep showing them)
      // 2. OR not locked at all
      let available = QUESTIONS.filter(q => {
        if (q.difficulty !== diff) return false;
        if (isHardLocked(q)) return false;
        if (isSolvedToday(q.id)) return true;
        return !getLockInfo(q.id);
      });

      // Fallback: if not enough available, allow previously solved/locked questions
      if (available.length < count) {
        available = QUESTIONS.filter(q => q.difficulty === diff && !isHardLocked(q));
      }

      if (available.length === 0) return;

      let added = 0;
      // Adjust target count if logic-019 (Medium) was already added to this pool
      const targetCount = (diff === 'Medium' && renderDisciplineQuest) ? count - 1 : count;

      for (let i = 0; i < available.length && added < targetCount; i++) {
        const qIndex = (dayOffset + i) % available.length;
        const selected = available[qIndex];
        if (!daily.some(d => d.id === selected.id)) {
          daily.push(selected);
          added++;
        }
      }
    };

    selectForDifficulty('Easy', 5);
    selectForDifficulty('Medium', 10);
    selectForDifficulty('Hard', 5);

    // Final fallback to fill up to exactly 20 questions
    if (daily.length < 20) {
      const remainingCount = 20 - daily.length;
      const allPossible = QUESTIONS.filter(q => !isHardLocked(q) && !daily.some(d => d.id === q.id));
      for (let i = 0; i < remainingCount && i < allPossible.length; i++) {
        daily.push(allPossible[i]);
      }
    }

    return daily;
  };

  const allAvailableQuestions = [...dynamicQuestions, ...QUESTIONS];
  let filtered = activeTab === 'Training' ? getDailyTraining() : allAvailableQuestions.filter(q => {
    if (activeTab !== 'All' && q.category !== activeTab) return false;
    if (difficultyFilter !== 'All' && q.difficulty !== difficultyFilter) return false;
    return true;
  });

  if (search) {
    filtered = filtered.filter(q => q.title.toLowerCase().includes(search.toLowerCase()));
  }

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

          <div className="relative group mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search protocols..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surfaceHighlight/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Dynamic AI Protocol Forge Input Deck */}
          <div className="flex flex-col space-y-2 mb-4">
            <input 
              type="text" 
              placeholder="Enter custom focus topic (e.g. React hooks, ABAP SELECT)..." 
              value={topicPrompt}
              onChange={(e) => setTopicPrompt(e.target.value)}
              className="w-full bg-surfaceHighlight/30 border border-border/80 focus:border-primary/50 rounded-xl px-3 py-2 text-xs text-textMain focus:outline-none transition-all placeholder:text-textMuted/50 font-sans"
            />
            <button
              onClick={handleGenerateQuestion}
              disabled={generatingQuestion}
              className="w-full py-2.5 px-4 bg-primary/10 border border-primary/25 hover:border-primary/50 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer shadow-inner disabled:opacity-50"
            >
              {generatingQuestion ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Calibrating AI Protocol...</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} className="animate-pulse" />
                  <span>Synthesize AI Protocol</span>
                </>
              )}
            </button>
          </div>

          {/* Quest Synergy Progress Calibrator */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 mb-4 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-textMuted mb-2">
              <span>Quest Synergy</span>
              <span className="text-primary font-bold">{aiSolvesCountToday} / 20 Completed</span>
            </div>
            <div className="w-full bg-surfaceHighlight/50 rounded-full h-2 overflow-hidden shadow-inner border border-white/5">
              <motion.div 
                className="h-full bg-primary" 
                style={{ width: `${Math.min(100, (aiSolvesCountToday / 20) * 100)}%` }} 
                animate={{ width: `${Math.min(100, (aiSolvesCountToday / 20) * 100)}%` }}
              />
            </div>
            {aiSolvesCountToday >= 20 ? (
              <p className="text-[9px] text-emerald-400 font-black uppercase tracking-wider mt-2.5 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-ping" />
                <span>Syndicate Bonus Active (+200 XP)</span>
              </p>
            ) : (
              <p className="text-[9px] text-textMuted/60 leading-normal mt-2.5">
                Complete 20 AI dynamic protocols today to claim your +200 XP Syndicate calibrator bonus.
              </p>
            )}
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
                  setAiResult(null);
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
              <button onClick={() => { setSelectedQuestion(null); setAiResult(null); }} className="md:hidden flex items-center text-textMuted hover:text-primary mb-2 transition-colors uppercase tracking-[0.2em] font-black text-[10px]">
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
                    <div className="flex items-center justify-between mb-2 md:mb-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-textMuted flex items-center">
                        {isSandboxMode ? <Terminal size={12} className="mr-1 text-primary animate-pulse" /> : <Code size={12} className="mr-1 text-primary" />}
                        <span>{isSandboxMode ? "JS Sandbox Code Console" : "Input Solution"}</span>
                      </h3>
                      <button
                        onClick={() => {
                          audio.playClick();
                          setIsSandboxMode(!isSandboxMode);
                        }}
                        className="py-1 px-3 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-wider text-textMuted hover:text-primary transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <Cpu size={10} />
                        <span>{isSandboxMode ? "Text Mode" : "JS Sandbox"}</span>
                      </button>
                    </div>

                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder={isSandboxMode ? "// Write valid JavaScript code here...\nconsole.log('Intercepting Synaptic Buffers...');" : (selectedQuestion.category === 'Pattern' ? 'Implement protocol...' : 'Type solution...')}
                      className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-4 text-[13px] md:text-sm font-mono text-textMain focus:outline-none focus:border-primary resize-none scrollbar-thin transition-all min-h-[150px] md:min-h-[200px]"
                    />

                    {isSandboxMode && (
                      <div className="flex flex-col space-y-3 mt-3">
                        <button
                          onClick={() => runCodeSandbox(userAnswer)}
                          className="py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/45 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer shadow-sm active:scale-95"
                        >
                          <Play size={11} className="fill-current text-emerald-400" />
                          <span>Run JS Code</span>
                        </button>

                        <div className="bg-black/50 border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed relative min-h-[120px] max-h-[200px] overflow-y-auto scrollbar-thin shadow-inner">
                          <div className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider flex items-center space-x-2">
                            {sandboxExecutionSuccess === true && <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded text-[8px] animate-pulse">Success</span>}
                            {sandboxExecutionSuccess === false && <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.2 rounded text-[8px]">Error</span>}
                            <div className="text-textMuted opacity-55 flex items-center">
                              <Terminal size={10} className="mr-1 text-primary" />
                              <span>Execution Log</span>
                            </div>
                          </div>
                          <div className="space-y-1 mt-3">
                            {sandboxConsoleLogs.length === 0 ? (
                              <p className="text-textMuted italic">Console idle. Awaiting execution trigger...</p>
                            ) : (
                              sandboxConsoleLogs.map((log, idx) => (
                                <p
                                  key={idx}
                                  className={cn(
                                    log.startsWith('[ERROR]') || log.startsWith('[RUNTIME ERROR]') ? "text-red-400" :
                                    log.startsWith('[WARN]') ? "text-amber-400" : "text-emerald-400/80"
                                  )}
                                >
                                  &gt; {log}
                                </p>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

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

                    {aiResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "mt-4 p-4 rounded-xl border flex flex-col space-y-3 relative overflow-hidden",
                          aiResult.isValid
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                            : "bg-red-950/20 border-red-500/30 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                        )}
                      >
                        {/* Grade Indicator Badge */}
                        <div className={cn(
                          "absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-wider",
                          aiResult.isValid ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        )}>
                          AI Grade Score: {aiResult.score}/100
                        </div>

                        <div className="flex items-center space-x-2">
                          <BrainCircuit size={15} className={aiResult.isValid ? "text-emerald-400 animate-pulse animate-pulse-slow" : "text-red-400"} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-textMain/80">
                            Neural Assessment Code Review
                          </span>
                        </div>

                        <div className="text-xs font-medium leading-relaxed max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent whitespace-pre-line text-textMain/90 border-t border-white/5 pt-2">
                          {aiResult.feedback}
                        </div>
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
