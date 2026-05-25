import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, BrainCircuit, Activity, Settings, 
  Send, RefreshCw, Key, ShieldCheck, HelpCircle, ArrowRight,
  Eye, EyeOff, Zap, Flame, Dna
} from 'lucide-react';
import toast from 'react-hot-toast';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';
import { useProgression } from '../hooks/useProgression';
import { 
  queryCounselChat, 
  generateStrategyReport, 
  optimizeSchedule, 
  isApiKeyConfigured
} from '../lib/aiService';
import type { ChatMessage } from '../lib/aiService';
import { cn } from '../lib/utils';

interface SavedTask {
  id: number;
  start: string;
  end: string;
  title: string;
  pillar?: string;
  priority?: string;
}

const PRESET_CHIPS = [
  { text: '🧬 Compile Quantum Strategy Report', category: 'Strategy' },
  { text: '💪 Optimize my Health & routine blocks', category: 'Health' },
  { text: '💼 Suggest high-yield Finance pillars', category: 'Finance' },
  { text: '🧘 Share daily Mindful focus techniques', category: 'Mind' }
];

export function AiCounsel() {
  const { state } = useProgression();
  const { archetype } = state;
  
  // Navigation & Config States
  const [activeTab, setActiveTab] = useState<'chat' | 'strategy' | 'optimizer' | 'matrix'>('chat');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Chat Coach States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Strategy Planner States
  const [strategyReport, setStrategyReport] = useState<string>('');
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState('');

  // Schedule Optimizer States
  const [optimizerReport, setOptimizerReport] = useState<string>('');
  const [optimizerLoading, setOptimizerLoading] = useState(false);
  const [optimizerError, setOptimizerError] = useState('');
  const [userTasks, setUserTasks] = useState<SavedTask[]>([]);
  const [optimizedTasksList, setOptimizedTasksList] = useState<any[]>([]);

  // Init & Load states
  useEffect(() => {
    setIsKeySaved(isApiKeyConfigured());
    const savedKey = localStorage.getItem('quantum_counsel_api_key') || '';
    setInputApiKey(savedKey);

    // Initial greeting in Chat
    setChatHistory([
      {
        role: 'model',
        parts: [{ text: `System online. Neural Counsel Link established, Commander ${state.displayName || 'Agent'}.

I am the strategic brain of your Quantum Growth OS. I monitor your Study, Health, Finance, and Mind progression matrices.

How shall we optimize your path today? You can converse with me directly, compile your comprehensive **Growth strategy Report**, or trigger the **Daily Timetable Optimizer**.` }]
      }
    ]);

    // Load active timetable tasks for the optimizer
    const loadTimetable = async () => {
      let uid = 'default';
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) uid = session.user.id;
        } catch (e) {}
      }

      const localTasks = localStorage.getItem(`quantum_timetable_${uid}`);
      if (localTasks && localTasks !== "undefined") {
        try {
          setUserTasks(JSON.parse(localTasks));
        } catch (e) {
          console.error("Failed to parse local tasks in AiCounsel", e);
        }
      }
    };
    loadTimetable();
  }, [state.displayName]);

  // Scroll Chat to Bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  // Save API Key
  const handleSaveApiKey = () => {
    if (inputApiKey.trim()) {
      localStorage.setItem('quantum_counsel_api_key', inputApiKey.trim());
      setIsKeySaved(true);
      setApiKeyModalOpen(false);
      audio.playSuccess();
    } else {
      localStorage.removeItem('quantum_counsel_api_key');
      setIsKeySaved(false);
      setApiKeyModalOpen(false);
      audio.playClick();
    }
  };

  // Chat Send
  const handleSendChat = async (messageText: string) => {
    if (!messageText.trim() || chatLoading) return;

    if (!isApiKeyConfigured()) {
      setApiKeyModalOpen(true);
      return;
    }

    const nextUserMsg: ChatMessage = {
      role: 'user',
      parts: [{ text: messageText.trim() }]
    };

    setChatHistory(prev => [...prev, nextUserMsg]);
    setUserInput('');
    setChatLoading(true);
    setChatError('');
    audio.playClick();

    try {
      const response = await queryCounselChat(chatHistory, messageText.trim());
      setChatHistory(prev => [...prev, {
        role: 'model',
        parts: [{ text: response }]
      }]);
      audio.playSuccess();
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || 'Connection lost. Check API Configuration.');
      audio.playClick();
    } finally {
      setChatLoading(false);
    }
  };

  // Generate Strategy Growth Report
  const handleGenerateStrategy = async () => {
    if (!isApiKeyConfigured()) {
      setApiKeyModalOpen(true);
      return;
    }

    setStrategyLoading(true);
    setStrategyError('');
    audio.playClick();

    try {
      const report = await generateStrategyReport({
        displayName: state.displayName,
        archetype: state.archetype,
        level: state.level,
        xp: state.xp,
        totalXp: state.totalXp,
        totalLevel: state.totalLevel,
        streakCount: state.streakCount,
        goals: Array.isArray(state.goals) ? state.goals.join(', ') : (state.goals || '')
      });
      setStrategyReport(report);
      audio.playSuccess();
    } catch (err: any) {
      console.error(err);
      setStrategyError(err.message || 'Neural Strategizer failed to build report.');
      audio.playClick();
    } finally {
      setStrategyLoading(false);
    }
  };

  // Generate Timetable Schedule Optimizer
  const handleOptimizeSchedule = async () => {
    if (!isApiKeyConfigured()) {
      setApiKeyModalOpen(true);
      return;
    }

    setOptimizerLoading(true);
    setOptimizerError('');
    audio.playClick();

    try {
      const res = await optimizeSchedule(userTasks);
      setOptimizerReport(res.report);
      setOptimizedTasksList(res.tasks);
      audio.playSuccess();
    } catch (err: any) {
      console.error(err);
      setOptimizerError(err.message || 'Neural Optimizer failed to process timetable.');
      audio.playClick();
    } finally {
      setOptimizerLoading(false);
    }
  };

  // Apply AI Optimized Schedule directly to LocalStorage/Supabase
  const handleApplySchedule = async () => {
    if (optimizedTasksList.length === 0) return;
    audio.playSuccess();

    let uid = 'default';
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) uid = session.user.id;
      } catch (e) {}
    }

    const activeDay = new Date().getDay();
    const formatted = optimizedTasksList.map((t, idx) => {
      const categoryMap: Record<string, string> = {
        Study: 'study',
        Health: 'gym',
        Finance: 'work',
        Mind: 'mind'
      };

      return {
        id: Date.now() + idx,
        user_id: uid === 'default' ? undefined : uid,
        name: t.name,
        category: categoryMap[t.pillar] || 'other',
        pillar: t.pillar,
        duration_minutes: t.duration_minutes || 45,
        day_of_week: activeDay,
        is_weekend: activeDay === 0 || activeDay === 6,
        task_target: t.priority || 'Medium',
        start_time: t.start_time || '09:00',
        order_index: idx
      };
    });

    // Save locally
    localStorage.setItem(`quantum_timetable_${uid}`, JSON.stringify(formatted));

    // Save to Supabase if session active
    if (supabase && uid !== 'default') {
      try {
        // Clear existing tasks for this day first
        await supabase
          .from('timetable_tasks')
          .delete()
          .eq('user_id', uid)
          .eq('day_of_week', activeDay);

        // Batch insert optimized ones
        const { error } = await supabase
          .from('timetable_tasks')
          .insert(formatted.map(f => ({
            user_id: uid,
            name: f.name,
            category: f.category,
            pillar: f.pillar,
            duration_minutes: f.duration_minutes,
            day_of_week: f.day_of_week,
            is_weekend: f.is_weekend,
            task_target: f.task_target,
            start_time: f.start_time,
            order_index: f.order_index
          })));

        if (error) console.error("Supabase timetable clear/insert error:", error.message);
      } catch (err) {
        console.error("Supabase timetable clear/insert catch:", err);
      }
    }

    import('react-hot-toast').then(({ default: toast }) => {
      toast.success("Timeline Synced! AI Optimized Schedule is now active.");
    });
  };

  // Parse Strategy markdown helper to clean visual cyber elements
  const formatReport = (reportText: string) => {
    if (!reportText) return null;
    
    return reportText.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // H1 Header
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl md:text-2xl font-black text-primary uppercase tracking-tight mb-4 border-b border-primary/20 pb-2 mt-6">
            {trimmed.substring(2)}
          </h1>
        );
      }
      
      // H2 Header
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-base md:text-lg font-black text-textMain uppercase tracking-widest mb-3 mt-5 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
            <span>{trimmed.substring(3)}</span>
          </h2>
        );
      }

      // H3 Header
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm font-bold text-textMain uppercase tracking-wider mb-2 mt-4 text-glow">
            {trimmed.substring(4)}
          </h3>
        );
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <div key={idx} className="flex items-start space-x-2.5 my-2 pl-2">
            <ArrowRight size={12} className="text-primary shrink-0 mt-1" />
            <p className="text-xs md:text-sm text-textMain/90 leading-relaxed font-medium">
              {trimmed.substring(2)}
            </p>
          </div>
        );
      }

      // Numbered items
      if (/^\d+\.\s/.test(trimmed)) {
        const dotIdx = trimmed.indexOf('.');
        return (
          <div key={idx} className="flex items-start space-x-2.5 my-2.5 pl-2">
            <span className="text-[10px] font-black text-primary font-mono shrink-0 mt-0.5 border border-primary/30 rounded px-1 py-0.2 bg-primary/10">
              {trimmed.substring(0, dotIdx)}
            </span>
            <p className="text-xs md:text-sm text-textMain/90 leading-relaxed font-medium">
              {trimmed.substring(dotIdx + 2)}
            </p>
          </div>
        );
      }

      // Normal paragraph text
      if (trimmed.length > 0) {
        return (
          <p key={idx} className="text-xs md:text-sm text-textMuted leading-relaxed my-2.5 pl-1">
            {trimmed}
          </p>
        );
      }

      return null;
    });
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden w-full">
      {/* Sci-Fi Decorative Gradient Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="p-4 md:p-8 flex items-center justify-between border-b border-white/5 bg-surface/20 shrink-0 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary/15 rounded-2xl text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse-slow">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black text-textMain uppercase tracking-tighter">
              Neural Strategy Counsel
            </h1>
            <p className="text-[10px] text-textMuted uppercase tracking-widest font-semibold flex items-center space-x-1.5 mt-0.5">
              <span>Hyper-Advisor Workspace</span>
              <span>•</span>
              <span className={isKeySaved ? "text-emerald-400 font-bold" : "text-amber-500 font-bold animate-pulse"}>
                {isKeySaved ? "Synapse Online" : "Synapse Keys Incomplete"}
              </span>
            </p>
          </div>
        </div>

        {/* API Settings Trigger */}
        <button
          onClick={() => { audio.playClick(); setApiKeyModalOpen(true); }}
          className={cn(
            "flex items-center space-x-1.5 text-xs font-bold border rounded-xl px-4 py-2.5 transition-all duration-300 shadow-sm",
            isKeySaved 
              ? "bg-white/5 border-white/10 hover:border-white/20 text-textMain"
              : "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60 text-amber-400 animate-pulse"
          )}
        >
          <Settings size={14} className={isKeySaved ? "" : "animate-spin"} />
          <span className="hidden sm:inline">Synapse Keys</span>
        </button>
      </div>

      {/* Tabs Menu Row */}
      <div className="px-4 md:px-8 border-b border-white/5 flex overflow-x-auto no-scrollbar shrink-0 bg-surface/10 relative z-10">
        <button
          onClick={() => { audio.playClick(); setActiveTab('chat'); }}
          className={cn(
            "py-4 px-6 text-xs font-black uppercase tracking-wider relative transition-all whitespace-nowrap",
            activeTab === 'chat' ? "text-primary font-black" : "text-textMuted hover:text-textMain"
          )}
        >
          Neural Advisor
          {activeTab === 'chat' && <motion.div layoutId="counselUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
        </button>
        <button
          onClick={() => { audio.playClick(); setActiveTab('strategy'); }}
          className={cn(
            "py-4 px-6 text-xs font-black uppercase tracking-wider relative transition-all whitespace-nowrap",
            activeTab === 'strategy' ? "text-primary font-black" : "text-textMuted hover:text-textMain"
          )}
        >
          Strategy Planner
          {activeTab === 'strategy' && <motion.div layoutId="counselUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
        </button>
        <button
          onClick={() => { audio.playClick(); setActiveTab('optimizer'); }}
          className={cn(
            "py-4 px-6 text-xs font-black uppercase tracking-wider relative transition-all whitespace-nowrap",
            activeTab === 'optimizer' ? "text-primary font-black" : "text-textMuted hover:text-textMain"
          )}
        >
          Schedule Optimizer
          {activeTab === 'optimizer' && <motion.div layoutId="counselUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
        </button>
        <button
          onClick={() => { audio.playClick(); setActiveTab('matrix'); }}
          className={cn(
            "py-4 px-6 text-xs font-black uppercase tracking-wider relative transition-all whitespace-nowrap",
            activeTab === 'matrix' ? "text-primary font-black" : "text-textMuted hover:text-textMain"
          )}
        >
          Neural Matrix
          {activeTab === 'matrix' && <motion.div layoutId="counselUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
        </button>
      </div>

      {/* Viewport Frame */}
      <div className="flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: Real-time Counselor chat */}
          {activeTab === 'chat' && (
            <motion.div
              key="chatTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="h-full flex flex-col md:flex-row overflow-hidden"
            >
              {/* Chat Thread */}
              <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 pb-28 md:pb-6">
                
                {/* Scrolling Thread */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                  {chatHistory.map((msg, index) => {
                    const isModel = msg.role === 'model';
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex w-full items-start space-x-3 my-2 max-w-[85%] md:max-w-[75%]",
                          isModel ? "mr-auto text-left" : "ml-auto flex-row-reverse text-right space-x-reverse"
                        )}
                      >
                        {/* Sci-Fi Icon Bubble */}
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 text-glow",
                          isModel 
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                        )}>
                          {isModel ? <BrainCircuit size={14} /> : <Activity size={14} />}
                        </div>

                        {/* Speech Bubble */}
                        <div className={cn(
                          "p-4 rounded-2xl text-xs md:text-sm font-medium leading-relaxed shadow-lg border relative",
                          isModel
                            ? "bg-[#121214]/80 border-white/5 text-textMain/90 rounded-tl-sm whitespace-pre-wrap"
                            : "bg-primary/10 border-primary/25 text-primary rounded-tr-sm whitespace-pre-wrap"
                        )}>
                          {msg.parts[0].text}
                        </div>
                      </div>
                    );
                  })}

                  {/* Holographic Typing Indicator */}
                  {chatLoading && (
                    <div className="flex items-start space-x-3 mr-auto text-left max-w-[75%]">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 animate-pulse">
                        <RefreshCw size={14} className="animate-spin" />
                      </div>
                      <div className="p-4 bg-[#121214]/80 border border-white/5 text-textMuted rounded-2xl rounded-tl-sm text-xs font-black uppercase tracking-widest flex items-center space-x-2 shadow-inner">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="pl-1">Aligning Synaptic Arrays...</span>
                      </div>
                    </div>
                  )}

                  {chatError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs font-bold text-red-400 max-w-[320px] mx-auto text-center animate-shake">
                      {chatError}
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                {/* Direct Message Input deck */}
                <div className="mt-4 border border-white/5 bg-surface/50 backdrop-blur-xl p-3 rounded-2xl relative">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(userInput); }}
                      placeholder="Input strategic parameters to consult Neural Counsel..."
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-xs md:text-sm font-medium text-textMain focus:outline-none focus:border-primary transition-all pr-12 font-sans"
                    />
                    <button
                      onClick={() => handleSendChat(userInput)}
                      disabled={!userInput.trim() || chatLoading}
                      className={cn(
                        "p-3 rounded-xl transition-all duration-300 shrink-0",
                        userInput.trim() && !chatLoading
                          ? "bg-primary hover:bg-primary-hover text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105"
                          : "bg-white/5 text-textMuted cursor-not-allowed border border-white/5"
                      )}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>

              </div>

              {/* Side Panels - Strategy Chips Selector (Desktop only) */}
              <div className="hidden lg:flex w-72 h-full border-l border-white/5 bg-[#0a0a0c]/20 p-6 flex-col justify-between shrink-0">
                <div className="space-y-5">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-2">Preset Directives</h4>
                    <p className="text-[11px] text-textMuted leading-relaxed mb-4">
                      Trigger direct strategic analysis chips to generate growth vectors immediately.
                    </p>
                  </div>
                  
                  <div className="space-y-2.5">
                    {PRESET_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(chip.text)}
                        disabled={chatLoading}
                        className="w-full text-left p-3 bg-white/[0.02] border border-white/5 hover:border-primary/20 hover:bg-primary/5 rounded-xl text-xs font-semibold text-textMain leading-snug transition-all duration-200 cursor-pointer shadow-sm"
                      >
                        {chip.text}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sci-fi System Status Badge */}
                <div className="bg-[#10b981]/5 border border-[#10b981]/15 rounded-xl p-3.5 flex flex-col text-center">
                  <span className="text-[10px] font-black uppercase text-[#10b981] tracking-widest animate-pulse mb-1">
                    Neural Uplink Stable
                  </span>
                  <span className="text-[9px] text-textMuted leading-relaxed font-mono uppercase">
                    Gemini model 2.5 flash active
                  </span>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 2: Pillar growth strategy reports */}
          {activeTab === 'strategy' && (
            <motion.div
              key="strategyTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="h-full overflow-y-auto p-4 md:p-8 pb-32 scrollbar-default"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Generation Card */}
                <div className="glass-panel p-6 border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="space-y-1.5 relative z-10">
                    <h3 className="text-base font-bold text-textMain uppercase tracking-tight">🧬 Pillar Growth Strategy Report</h3>
                    <p className="text-xs text-textMuted leading-relaxed max-w-lg">
                      Scans your display goals, streaks, Study, Health, Finance, and Mind matrices, feeding them to Gemini to synthesize a personalized acceleration plan.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateStrategy}
                    disabled={strategyLoading}
                    className="shrink-0 py-3 px-6 rounded-xl bg-primary text-white font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:bg-white/5 disabled:text-textMuted disabled:cursor-not-allowed disabled:border disabled:border-white/5"
                  >
                    {strategyLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Compile strategy</span>
                      </>
                    )}
                  </button>
                </div>

                {strategyError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 text-center">
                    {strategyError}
                  </div>
                )}

                {/* Strategy Output Deck */}
                {strategyLoading ? (
                  <div className="glass-panel p-12 border-white/5 text-center flex flex-col items-center justify-center min-h-[300px] bg-white/[0.01]">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <h4 className="text-sm font-black uppercase tracking-widest text-textMain mb-1.5 animate-pulse">
                      Analyzing Progression Matrices...
                    </h4>
                    <p className="text-xs text-textMuted max-w-xs leading-relaxed font-mono">
                      Querying strategic neural centers for bespoke growth optimization.
                    </p>
                  </div>
                ) : strategyReport ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-6 md:p-8 border-white/5 bg-[#121214]/40"
                  >
                    <div className="prose prose-invert max-w-none text-glow-none">
                      {formatReport(strategyReport)}
                    </div>
                  </motion.div>
                ) : (
                  /* Strategy Empty State */
                  <div className="glass-panel p-12 border-dashed border-white/10 text-center flex flex-col items-center justify-center min-h-[300px] bg-white/[0.01]">
                    <BrainCircuit size={48} className="text-textMuted opacity-25 mb-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-textMain mb-1.5">
                      No Active Strategy Report
                    </h4>
                    <p className="text-xs text-textMuted max-w-xs leading-relaxed mb-6">
                      Click the compilation trigger button above to analyze your profile and synthesize strategy vectors immediately.
                    </p>
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {/* TAB 3: Timetable Optimizers */}
          {activeTab === 'optimizer' && (
            <motion.div
              key="optimizerTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="h-full overflow-y-auto p-4 md:p-8 pb-32 scrollbar-default"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Generation Card */}
                <div className="glass-panel p-6 border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="space-y-1.5 relative z-10">
                    <h3 className="text-base font-bold text-textMain uppercase tracking-tight">⚡ Daily Timetable Optimizer</h3>
                    <p className="text-xs text-textMuted leading-relaxed max-w-lg">
                      Examines your structured timetable sequence blocks (total scheduled: {userTasks.length} slots). Gemini analyzes the list to optimize pacing, mental endurance, recovery routines, and focus blocks.
                    </p>
                  </div>

                  <button
                    onClick={handleOptimizeSchedule}
                    disabled={optimizerLoading || userTasks.length === 0}
                    className="shrink-0 py-3 px-6 rounded-xl bg-primary text-white font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:bg-white/5 disabled:text-textMuted disabled:cursor-not-allowed disabled:border disabled:border-white/5"
                  >
                    {optimizerLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Re-structuring...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Optimize Routine</span>
                      </>
                    )}
                  </button>
                </div>

                {optimizerError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 text-center">
                    {optimizerError}
                  </div>
                )}

                {/* Timetable Optimizer Output Deck */}
                {optimizerLoading ? (
                  <div className="glass-panel p-12 border-white/5 text-center flex flex-col items-center justify-center min-h-[300px] bg-white/[0.01]">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <h4 className="text-sm font-black uppercase tracking-widest text-textMain mb-1.5 animate-pulse">
                      Analyzing scheduled slots...
                    </h4>
                    <p className="text-xs text-textMuted max-w-xs leading-relaxed font-mono">
                      Querying Gemini schedule optimizer to refactor sequencing pacing.
                    </p>
                  </div>
                ) : optimizerReport ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-6 md:p-8 border-white/5 bg-[#121214]/40 space-y-6"
                  >
                    {optimizedTasksList.length > 0 && (
                      <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-110 transition-transform pointer-events-none" />
                        <div>
                          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center">
                            <Zap size={12} className="mr-1 animate-pulse" />
                            <span>Optimized Layout Synthesized</span>
                          </h4>
                          <p className="text-[10px] text-textMuted mt-0.5">Directly inject Gemini's pacing block layout ({optimizedTasksList.length} slots) into today's timeline.</p>
                        </div>
                        <button
                          onClick={handleApplySchedule}
                          className="shrink-0 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02]"
                        >
                          Apply AI Schedule
                        </button>
                      </div>
                    )}

                    <div className="prose prose-invert max-w-none text-glow-none border-t border-white/5 pt-4">
                      {formatReport(optimizerReport)}
                    </div>
                  </motion.div>
                ) : (
                  /* Optimizer Empty State */
                  <div className="glass-panel p-12 border-dashed border-white/10 text-center flex flex-col items-center justify-center min-h-[300px] bg-white/[0.01]">
                    <BrainCircuit size={48} className="text-textMuted opacity-25 mb-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-textMain mb-1.5">
                      {userTasks.length === 0 ? "No active Timetable Tasks Scheduled" : "Optimizer Protocol Dormant"}
                    </h4>
                    <p className="text-xs text-textMuted max-w-xs leading-relaxed mb-6">
                      {userTasks.length === 0 
                        ? "You have zero routine slots scheduled in your Control Room. Please compile timetable tasks in System before invoking AI optimizer!"
                        : "Click the routine optimization button above to evaluate your structured blocks and suggestion charts immediately."}
                    </p>
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {/* TAB 4: Neural Activity Matrix & Reports log */}
          {activeTab === 'matrix' && (
            <motion.div
              key="matrixTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="h-full overflow-y-auto p-4 md:p-8 pb-32 scrollbar-default"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Archetype & Calibration Card */}
                <div className="glass-panel p-6 border-white/5 bg-white/[0.02] rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BrainCircuit size={100} className="text-primary" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest block">Neural Calibration Identity</span>
                      <h3 className="text-lg font-black text-textMain uppercase tracking-tight">
                        {archetype !== 'None' ? archetype : 'Identity Not Calibrated'}
                      </h3>
                      <p className="text-xs text-textMuted leading-relaxed max-w-md">
                        {archetype === 'Technical Elite' ? '🔬 Specializing in Study (Systems & Code execution). Active Buff: +20% Study XP.' :
                         archetype === 'Wealth Architect' ? '💼 Specializing in Finance (Ledgers & Capital growth). Active Buff: +20% Finance XP.' :
                         archetype === 'Vitality Vanguard' ? '💪 Specializing in Health (Vitality & Biological optimization). Active Buff: +20% Health XP.' :
                         'Calibrate your tactical growth archetype in settings to unlock target passive buffs.'}
                      </p>
                    </div>
                    
                    {archetype !== 'None' && (
                      <span className="shrink-0 py-1.5 px-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Zap size={10} className="animate-pulse" />
                        <span>Archetype Buff Active</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Goals & Dynamic Strategy log */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Goals Panel */}
                  <div className="glass-panel p-5 border-white/5 bg-black/30 rounded-2xl flex flex-col">
                    <div className="flex items-center space-x-2 mb-4 border-b border-white/5 pb-2">
                      <Activity size={14} className="text-primary" />
                      <h4 className="text-[10px] font-black text-textMain uppercase tracking-widest">Tactical Objectives</h4>
                    </div>
                    <div className="flex-1 space-y-2">
                      {state.goals && state.goals.length > 0 ? (
                        state.goals.map((g, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs font-semibold text-textMuted">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{g}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-textMuted italic">No custom goals registered in tactical core.</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats Panel */}
                  <div className="glass-panel p-5 border-white/5 bg-black/30 rounded-2xl flex flex-col">
                    <div className="flex items-center space-x-2 mb-4 border-b border-white/5 pb-2">
                      <Flame size={14} className="text-primary" />
                      <h4 className="text-[10px] font-black text-textMain uppercase tracking-widest">Progress Vectors</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-textMuted">Global Experience</span>
                        <span className="text-textMain font-mono font-bold">{(state.totalXp || 0).toLocaleString()} XP</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-textMuted">Global Calibration</span>
                        <span className="text-textMain font-bold">Level {state.totalLevel || 1}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-textMuted">Calibrated Rank</span>
                        <span className="text-primary font-bold">{state.rank || 'Initiate'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Latest Strategy report quick view */}
                {strategyReport && (
                  <div className="glass-panel p-5 border-white/5 bg-black/30 rounded-2xl">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                      <div className="flex items-center space-x-2">
                        <Dna size={14} className="text-primary" />
                        <h4 className="text-[10px] font-black text-textMain uppercase tracking-widest">Latest Calibrated Growth Dossier</h4>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(strategyReport);
                          toast.success("Dossier copied to clipboard!");
                        }}
                        className="py-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider text-textMuted hover:text-textMain transition-all cursor-pointer"
                      >
                        Copy Dossier
                      </button>
                    </div>
                    <div className="prose prose-invert max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent text-glow-none">
                      {formatReport(strategyReport)}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* SECURE API KEY CONFIGURATION MODAL */}
      <AnimatePresence>
        {apiKeyModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApiKeyModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            {/* Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="glass-panel p-6 w-full max-w-md border-white/10 bg-[#0f111a]/95 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 bg-amber-500/15 border border-amber-500/25 rounded-xl text-amber-400">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textMain uppercase tracking-widest">Synaptic Neural Key Settings</h3>
                  <p className="text-[9px] text-textMuted uppercase tracking-wider mt-0.5">Secure direct browser AI access</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-start space-x-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-textMuted leading-relaxed font-medium">
                    Keys are processed strictly client-side inside your local browser storage and query the official Gemini secure REST servers directly. They are never sent to third-party endpoints.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-textMuted opacity-70">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={inputApiKey}
                      onChange={(e) => setInputApiKey(e.target.value)}
                      placeholder="Enter AI model API key..."
                      className="w-full bg-black/40 border border-white/10 focus:border-primary rounded-xl p-3 pr-10 text-xs font-mono text-textMain focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => { audio.playClick(); setShowApiKey(!showApiKey); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain transition-colors cursor-pointer"
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[9px] text-textMuted flex items-center space-x-1 pl-1">
                    <HelpCircle size={9} />
                    <span>Get a free key instantly from Google AI Studio.</span>
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => setApiKeyModalOpen(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-textMuted border border-white/5 rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black uppercase transition-all shadow-[0_0_15px_rgba(59,130,246,0.25)] flex items-center justify-center space-x-1.5"
                  >
                    <ShieldCheck size={14} />
                    <span>Configure Key</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
