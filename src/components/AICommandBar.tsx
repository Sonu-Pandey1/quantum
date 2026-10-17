import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Mic, Send, Command, CheckCircle2, Calendar, CheckSquare, Palette, Compass } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { parseAICommand, executeAIResult } from '../lib/aiActionExecutor';
import { isApiKeyConfigured } from '../lib/aiService';
import { audio } from '../lib/audio';
import toast from 'react-hot-toast';

export function AICommandBar() {
  const { state, updateProfile, setTheme, addXp } = useProgression();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'schedule' | 'todos' | 'theme' | 'nav'>('all');

  // Keyboard shortcut Ctrl+K / Cmd+K & Custom Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    const handleOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('quantum_open_ai_command', handleOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('quantum_open_ai_command', handleOpen);
    };
  }, []);

  const handleExecute = async (inputPrompt?: string) => {
    const textToRun = inputPrompt || prompt;
    if (!textToRun.trim()) return;

    if (!isApiKeyConfigured()) {
      toast.error('Gemini API Key missing. Please input key in Settings > Neural AI Engine.', { icon: '🔑' });
      return;
    }

    setLoading(true);
    setLastMessage(null);
    audio.playClick();

    try {
      const telemetry = {
        displayName: state.displayName,
        archetype: state.archetype,
        levels: state.level,
        goals: state.goals?.join(', ') || '',
        streak: state.streakCount,
        theme: state.theme
      };

      const parsedResult = await parseAICommand(textToRun, telemetry);

      // Get current user ID
      const uidKey = Object.keys(localStorage).find(k => k.startsWith('quantum_buffs_'));
      const userId = uidKey ? uidKey.replace('quantum_buffs_', '') : 'default';

      const executionMsg = await executeAIResult(parsedResult, {
        userId,
        updateProfile,
        setTheme,
        addXp,
        reloadTimetable: () => {
          window.dispatchEvent(new Event('quantum_timetable_updated'));
        }
      });

      audio.playSuccess();
      setLastMessage(executionMsg);
      setPrompt('');
    } catch (err: any) {
      console.error('AI Command Error:', err);
      toast.error(err.message || 'AI Execution failed');
    } finally {
      setLoading(false);
    }
  };

  // Voice Speech Recognition setup
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        audio.playClick();
        toast('Listening for AI command...', { icon: '🎙️' });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsListening(false);
        handleExecute(transcript);
      };

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition failed to start', e);
      setIsListening(false);
    }
  };

  const presetChips = [
    { cat: 'schedule', label: '⚡ Auto-Schedule Today', command: 'Auto-schedule my day with balanced study, gym workout, and evening decompression' },
    { cat: 'schedule', label: '🏋️ Add Gym at 5 PM', command: 'Add timetable task Gym workout from 17:00 to 18:00 (High priority, Health pillar)' },
    { cat: 'schedule', label: '🧹 Clear Today Schedule', command: 'Clear all timetable tasks for today' },
    { cat: 'todos', label: '✅ Add High-Priority Todo', command: 'Add high priority todo: Complete math worksheet at 18:30 (Study pillar)' },
    { cat: 'todos', label: '💧 Add Daily Habit', command: 'Add habit: Drink 3 Liters Water' },
    { cat: 'todos', label: '🎯 Complete Routine', command: 'Check off Morning Routine & Movement' },
    { cat: 'theme', label: '🎨 Cyber Cyan Theme', command: 'Change theme matrix to cyber cyan' },
    { cat: 'theme', label: '☀️ Solar Orange Theme', command: 'Change theme matrix to solar orange' },
    { cat: 'theme', label: '👑 Set Name Neo', command: 'Change my display name to Neo' },
    { cat: 'nav', label: '⚔️ Go to The Arena', command: 'Go to The Arena' },
    { cat: 'nav', label: '📊 Open Settings', command: 'Open Settings' },
    { cat: 'nav', label: '💼 Log ₹1200 Course', command: 'Log ₹1200 investment in advanced coding course in Vault' },
  ];

  const filteredChips = activeCategory === 'all' 
    ? presetChips 
    : presetChips.filter(c => c.cat === activeCategory);

  return (
    <>
      {/* Persistent Floating AI Button (FAB) positioned safely above mobile navigation */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => { audio.playClick(); setIsOpen(true); }}
        title="Open AI Command Bar (Ctrl + K)"
        className="fixed bottom-24 md:bottom-7 right-5 md:right-7 z-[90] px-4 py-3 md:py-3.5 rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-purple-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.45)] border border-white/20 flex items-center justify-center gap-2 group cursor-pointer backdrop-blur-xl"
      >
        <Sparkles size={18} className="animate-spin-slow group-hover:rotate-12 transition-transform text-amber-300" />
        <span className="text-xs font-black uppercase tracking-wider pr-0.5">Tell AI</span>
        <span className="hidden lg:inline text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded text-white/90">Ctrl+K</span>
      </motion.button>

      {/* AI Command Bar Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex items-start justify-center pt-14 sm:pt-20 px-4 bg-background/80 backdrop-blur-xl">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative z-10 w-full max-w-2xl bg-surface/95 border border-primary/40 rounded-3xl p-5 md:p-6 shadow-[0_0_60px_rgba(59,130,246,0.35)] space-y-4 overflow-hidden backdrop-blur-2xl ring-1 ring-white/10"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/20 rounded-2xl text-primary border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <Sparkles size={20} className="animate-pulse text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-textMain flex items-center gap-2">
                      Autonomous Neural Co-Pilot
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Full OS Automation
                      </span>
                    </h3>
                    <p className="text-[10px] text-textMuted font-semibold uppercase tracking-wider">
                      Schedule tasks, manage habits, toggle todos, switch themes & navigate by text or voice
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-textMuted bg-surfaceHighlight px-2.5 py-1 rounded-lg border border-white/5">
                    <Command size={11} /> K
                  </span>
                  <button 
                    onClick={() => { audio.playClick(); setIsOpen(false); }} 
                    className="p-1.5 rounded-xl hover:bg-white/10 text-textMuted hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Input Box */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={prompt}
                  autoFocus
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleExecute()}
                  placeholder="Tell AI e.g. 'Add gym block at 5 PM', 'Add habit drink 3L water', 'Switch theme to cyan'..."
                  className="w-full bg-surfaceHighlight/90 border border-white/15 rounded-2xl pl-4 pr-24 py-3.5 text-xs sm:text-sm text-textMain focus:border-primary outline-none placeholder:text-textMuted/50 font-medium transition-all shadow-inner"
                />

                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    title="Voice Input (Speak command)"
                    className={`p-2.5 rounded-xl border transition-all ${
                      isListening
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse ring-2 ring-red-500/20'
                        : 'bg-white/5 text-textMuted hover:text-white border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Mic size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecute()}
                    disabled={loading || !prompt.trim()}
                    className="p-2.5 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin block" /> : <Send size={15} />}
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px] font-bold">
                {[
                  { id: 'all', label: 'All Actions', icon: Sparkles },
                  { id: 'schedule', label: 'Timetable', icon: Calendar },
                  { id: 'todos', label: 'Todos & Habits', icon: CheckSquare },
                  { id: 'theme', label: 'Theme & Identity', icon: Palette },
                  { id: 'nav', label: 'Navigation & Vault', icon: Compass },
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategory(c.id as any)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                      activeCategory === c.id
                        ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                        : 'bg-surfaceHighlight/50 border-white/5 text-textMuted hover:text-textMain hover:border-white/15'
                    }`}
                  >
                    <c.icon size={12} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-none">
                  {filteredChips.map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleExecute(chip.command)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-xl bg-surfaceHighlight hover:bg-primary/20 border border-white/5 hover:border-primary/40 text-[10px] font-bold text-textMuted hover:text-white transition-all cursor-pointer disabled:opacity-40"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Feedback */}
              {lastMessage && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold flex items-start gap-3 animate-fadeIn">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
                  <div className="space-y-1 flex-1">
                    <span className="uppercase text-[9px] tracking-widest font-black block text-emerald-400/70">Autonomous OS Confirmation</span>
                    <p className="leading-relaxed text-textMain">{lastMessage}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
