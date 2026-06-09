import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Wind, MessageSquare, Send, UserCheck, Code2 } from 'lucide-react';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';
import { useProgression } from '../hooks/useProgression';

const INTERVIEW_QUESTIONS = [
  "Explain the difference between a Work Area and an Internal Table in SAP ABAP.",
  "How does React's Virtual DOM actually work under the hood?",
  "What is the difference between MACRO and SUBROUTINE in ABAP?",
  "Describe useEffect's dependency array. What happens if you omit it completely?",
  "Explain the concepts of OData and CDS Views in modern SAP.",
];

export function GuardCard() {
  const { state: { settings }, updateProfile } = useProgression();
  const [panicMode, setPanicMode] = useState(false);
  const [interviewMode, setInterviewMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  
  const [breathingTimer, setBreathingTimer] = useState(60);
  const [commLog, setCommLog] = useState('');
  const [savedLogs, setSavedLogs] = useState<{ id: string, text: string }[]>([]);
  const [userId, setUserId] = useState<string>('default');

  useEffect(() => {
    let uid = 'default';
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        uid = session?.user?.id || 'default';
        setUserId(uid);
      });
    }
    
    if (settings?.comms) {
      setSavedLogs(settings.comms);
    } else {
      const logs = localStorage.getItem(`quantum_comms_${uid}`);
      if (logs) setSavedLogs(JSON.parse(logs));
    }
  }, [settings]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (panicMode && breathingTimer > 0) {
      interval = setInterval(() => {
        setBreathingTimer(prev => prev - 1);
      }, 1000);
    } else if (breathingTimer === 0) {
      setPanicMode(false);
      setBreathingTimer(60);
    }
    return () => clearInterval(interval);
  }, [panicMode, breathingTimer]);

  const triggerPanic = () => {
    audio.playClick();
    setBreathingTimer(60);
    setPanicMode(true);
  };

  const triggerInterview = () => {
    audio.playClick();
    setCurrentQuestion(INTERVIEW_QUESTIONS[Math.floor(Math.random() * INTERVIEW_QUESTIONS.length)]);
    setAnswer("");
    setFeedback("");
    setInterviewMode(true);
  };

  const submitAnswer = () => {
    if (answer.trim().length < 10) {
      setFeedback("Your answer is too short. Please provide a detailed response.");
      return;
    }
    audio.playSuccess();
    const length = answer.trim().length;
    let newFeedback = "";
    if (length < 50) {
      newFeedback = "Your response is a bit brief. Try to elaborate on the 'how' and 'why' to demonstrate deeper understanding.";
    } else if (length > 200 && (answer.toLowerCase().includes('because') || answer.toLowerCase().includes('example') || answer.toLowerCase().includes('how'))) {
      newFeedback = "Excellent structure! You provided good context and examples. Your technical accuracy appears high based on the detail provided.";
    } else {
      newFeedback = "Good effort. Your technical accuracy is decent, but consider adding more specific examples and confident tone.";
    }
    setFeedback(newFeedback);
  };

  const addCommLog = async () => {
    if (!commLog.trim()) return;
    const newLog = { id: Date.now().toString(), text: commLog };
    const updated = [newLog, ...savedLogs].slice(0, 5); // Keep last 5
    setSavedLogs(updated);
    localStorage.setItem(`quantum_comms_${userId}`, JSON.stringify(updated));
    
    if (userId !== 'default' && supabase) {
      await updateProfile({
        settings: {
          ...settings,
          comms: updated
        }
      });
    }
    setCommLog('');
  };

  return (
    <>
      <div className="h-full p-6 flex flex-col justify-between transition-colors relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <ShieldAlert size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-textMain">The Guard</h3>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button 
            onClick={triggerPanic}
            onMouseEnter={() => audio.playClick()}
            className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/60 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          >
            I Feel Anxious
          </button>
          
          <button 
            onClick={triggerInterview}
            onMouseEnter={() => audio.playClick()}
            className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:border-blue-500/60 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2"
          >
            <UserCheck size={18} /> Mock Interview
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-textMuted uppercase">Comm Log</span>
            <MessageSquare size={14} className="text-textMuted" />
          </div>
          
          <div className="flex space-x-2 mb-3">
            <input 
              type="text" 
              placeholder="1 sentence about today's interactions..." 
              value={commLog}
              onChange={(e) => setCommLog(e.target.value)}
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-textMain focus:border-blue-500 outline-none transition-colors"
            />
            <button 
              onClick={addCommLog}
              className="p-2 bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-500/50"
            >
              <Send size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2">
            {savedLogs.length === 0 ? (
              <p className="text-[10px] text-textMuted italic">No logs. Practice social confidence today.</p>
            ) : (
              <p className="text-[11px] text-textMuted italic truncate px-2 py-1 bg-surfaceHighlight/30 rounded border border-border/50">
                "{savedLogs[0].text}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Panic Overlay */}
      <AnimatePresence>
        {panicMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl text-center space-y-12"
            >
              <Wind size={64} className="mx-auto text-blue-400 mb-8 opacity-80" />
              
              <h1 className="text-4xl md:text-6xl font-bold text-textMain leading-tight tracking-tight drop-shadow-2xl">
                I am a developer.
              </h1>
              <h1 className="text-3xl md:text-5xl font-bold text-blue-400 leading-tight tracking-tight drop-shadow-lg">
                I speak with confidence.
              </h1>
              <h1 className="text-4xl md:text-6xl font-bold text-textMain leading-tight tracking-tight drop-shadow-2xl">
                I take action over thought.
              </h1>

              <div className="pt-16 flex flex-col items-center">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-24 h-24 rounded-full border-4 border-blue-500/30 flex items-center justify-center relative"
                >
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping" />
                  <span className="text-2xl font-mono font-bold text-blue-400">{breathingTimer}</span>
                </motion.div>
                <p className="text-textMuted mt-6 tracking-widest uppercase text-sm">Breathe slowly. System resetting.</p>
              </div>

              <button 
                onClick={() => setPanicMode(false)}
                className="mt-12 text-sm text-textMuted hover:text-textMain underline underline-offset-4"
              >
                Exit Override
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Full-Screen Interview Overlay */}
      <AnimatePresence>
        {interviewMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-3xl glass-panel p-8 flex flex-col gap-6"
            >
              <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                  <Code2 size={24} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-textMain">Technical Interviewer</h2>
                  <p className="text-sm text-blue-400">SAP & React Division</p>
                </div>
              </div>
              
              <div className="bg-surfaceHighlight p-6 rounded-xl border border-border/50">
                <p className="text-lg font-medium text-textMain leading-relaxed">
                  "{currentQuestion}"
                </p>
              </div>

              <textarea 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your structured answer here..."
                className="w-full h-32 bg-surface border border-border rounded-xl p-4 text-sm text-textMain outline-none focus:border-blue-500/50 transition-colors resize-none"
              />

              {feedback ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <p className="text-sm text-emerald-400 font-medium">{feedback}</p>
                </div>
              ) : (
                <button 
                  onClick={submitAnswer}
                  className="w-full py-3 bg-blue-500/20 hover:bg-blue-500 hover:text-white text-blue-400 border border-blue-500/50 rounded-xl font-bold uppercase tracking-widest transition-all"
                >
                  Submit for Review
                </button>
              )}

              <button 
                onClick={() => setInterviewMode(false)}
                className="mt-4 text-xs text-textMuted hover:text-textMain uppercase tracking-widest"
              >
                End Session
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
