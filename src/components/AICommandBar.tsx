import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Mic, Send, Command, CheckCircle2 } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { parseAICommand, executeAIResult } from '../lib/aiActionExecutor';
import { isApiKeyConfigured } from '../lib/aiService';
import toast from 'react-hot-toast';

export function AICommandBar() {
  const { state, updateProfile, setTheme, addXp } = useProgression();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExecute = async (inputPrompt?: string) => {
    const textToRun = inputPrompt || prompt;
    if (!textToRun.trim()) return;

    if (!isApiKeyConfigured()) {
      toast.error('Gemini API Key missing. Please input key in AI Counsel or Header.', { icon: '🔑' });
      return;
    }

    setLoading(true);
    setLastMessage(null);

    try {
      const telemetry = {
        displayName: state.displayName,
        archetype: state.archetype,
        levels: state.level,
        goals: state.goals.join(', '),
        streak: state.streakCount
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
    { label: '⚡ Auto-Schedule My Day', command: 'Auto-schedule my day with balanced study, gym, and mind tasks' },
    { label: '📚 Generate ABAP Quest', command: 'Generate a Hard ABAP coding quest for PracticeHub' },
    { label: '💼 Log ₹1500 Course', command: 'Log ₹1500 investment in SAP ABAP certification course' },
    { label: '🎨 Set Emerald Theme', command: 'Change theme to emerald' },
  ];

  return (
    <>
      {/* Persistent Floating AI Button (FAB) for Mobile Phone & Quick Access */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        title="Open AI Command Bar (Ctrl + K)"
        className="fixed bottom-6 right-6 z-[100] p-3.5 md:p-4 rounded-full bg-gradient-to-r from-primary to-purple-600 text-white shadow-[0_0_25px_rgba(59,130,246,0.5)] border border-white/20 flex items-center justify-center gap-2 group cursor-pointer"
      >
        <Sparkles size={22} className="animate-spin-slow group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline text-xs font-black uppercase tracking-wider pr-1">Tell AI</span>
      </motion.button>

      {/* AI Command Bar Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-background/80 backdrop-blur-md">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative z-10 w-full max-w-2xl bg-surface border border-primary/30 rounded-3xl p-5 md:p-6 shadow-[0_0_50px_rgba(59,130,246,0.3)] space-y-4 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl text-primary border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-textMain">Neural AI Co-Pilot Command</h3>
                    <p className="text-[10px] text-textMuted font-semibold uppercase tracking-wider">Type or Speak Natural Instructions • AI Automates App State</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-textMuted bg-surfaceHighlight px-2.5 py-1 rounded-lg border border-white/5">
                    <Command size={11} /> K
                  </span>
                  <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-textMuted hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Input Box */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleExecute()}
                  placeholder="Tell AI e.g. 'Schedule 1h ABAP study at 10 AM, 45m Gym at 4 PM (High priority)'..."
                  className="w-full bg-surfaceHighlight/80 border border-white/15 rounded-2xl pl-4 pr-24 py-3.5 text-xs sm:text-sm text-textMain focus:border-primary outline-none placeholder:text-textMuted/40 font-medium"
                />

                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    onClick={handleVoiceInput}
                    title="Voice Input (Speak command)"
                    className={`p-2 rounded-xl border transition-all ${
                      isListening
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                        : 'bg-white/5 text-textMuted hover:text-white border-white/10'
                    }`}
                  >
                    <Mic size={16} />
                  </button>

                  <button
                    onClick={() => handleExecute()}
                    disabled={loading || !prompt.trim()}
                    className="p-2 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin block" /> : <Send size={16} />}
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2 pt-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-textMuted opacity-50 block">Instant AI Presets</span>
                <div className="flex flex-wrap gap-2">
                  {presetChips.map(chip => (
                    <button
                      key={chip.label}
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
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-start gap-3 animate-fadeIn">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="uppercase text-[9px] tracking-widest font-black block">Execution Result</span>
                    <p className="leading-relaxed">{lastMessage}</p>
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
