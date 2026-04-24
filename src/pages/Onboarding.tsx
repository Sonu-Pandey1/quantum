
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Shield, TrendingUp, 
  ChevronRight, ArrowLeft, CheckCircle2, 
  Target, Rocket, Sparkles, BrainCircuit
} from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import type { Archetype } from '../hooks/useProgression';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const { setArchetype } = useProgression();
  const [formData, setFormData] = useState({
    name: '',
    archetype: 'None' as Archetype,
    goals: [] as string[]
  });

  const archetypes = [
    { 
      id: 'Technical Elite', 
      title: 'Technical Elite', 
      desc: 'Focused on absolute mastery of logic, patterns, and software engineering protocols.',
      icon: <Terminal className="text-primary" />,
      boost: '1.2x Study XP'
    },
    { 
      id: 'Wealth Architect', 
      title: 'Wealth Architect', 
      desc: 'Optimizing financial systems, asset growth, and long-term wealth preservation.',
      icon: <TrendingUp className="text-yellow-500" />,
      boost: '1.2x Finance XP'
    },
    { 
      id: 'Vitality Vanguard', 
      title: 'Vitality Vanguard', 
      desc: 'Engineering the ultimate biological vessel through recovery, nutrition, and metrics.',
      icon: <Shield className="text-red-500" />,
      boost: '1.2x Health XP'
    }
  ];

  const goals = [
    'Master ABAP & Logic',
    'Achieve Financial Freedom',
    'Optimize Physical Health',
    'Build Mental Resilience',
    'Increase Daily Productivity',
    'Strategic Career Growth'
  ];

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleComplete = () => {
    setArchetype(formData.archetype);
    // Save additional goal data to localStorage
    localStorage.setItem('quantum_onboarding_completed', 'true');
    localStorage.setItem('quantum_user_name', formData.name);
    localStorage.setItem('quantum_user_goals', JSON.stringify(formData.goals));
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full glass-panel p-8 md:p-12 border-primary/20 relative z-10"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-widest text-xs">
                  <Sparkles size={14} />
                  <span>Phase 01: Identification</span>
                </div>
                <h1 className="text-4xl font-black text-textMain tracking-tighter italic">NEURAL INITIALIZATION</h1>
                <p className="text-textMuted">Welcome to Quantum Growth OS. Please identify yourself to begin the synchronization protocol.</p>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-textMuted uppercase tracking-widest">Operator Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold text-textMain focus:outline-none focus:border-primary transition-all shadow-inner"
                />
              </div>

              <button 
                onClick={nextStep}
                disabled={!formData.name}
                className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center"
              >
                Continue Protocol <ChevronRight className="ml-2" size={18} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <button onClick={prevStep} className="flex items-center text-textMuted hover:text-primary text-xs font-bold transition-colors">
                  <ArrowLeft size={14} className="mr-1" /> Back
                </button>
                <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-widest text-xs">
                  <BrainCircuit size={14} />
                  <span>Phase 02: Archetype Selection</span>
                </div>
                <h1 className="text-4xl font-black text-textMain tracking-tighter italic uppercase">Choose Your Path</h1>
                <p className="text-textMuted">Your archetype defines your primary growth vector and grants permanent system buffs.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {archetypes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setFormData({ ...formData, archetype: a.id as Archetype })}
                    className={`w-full text-left p-6 rounded-2xl border transition-all relative group overflow-hidden ${
                      formData.archetype === a.id 
                        ? 'bg-primary/20 border-primary' 
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-4 relative z-10">
                      <div className={`p-3 rounded-xl bg-white/10 ${formData.archetype === a.id ? 'text-primary' : 'text-textMuted'}`}>
                        {a.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-textMain">{a.title}</h3>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">{a.boost}</span>
                        </div>
                        <p className="text-xs text-textMuted mt-1 leading-relaxed">{a.desc}</p>
                      </div>
                    </div>
                    {formData.archetype === a.id && (
                      <motion.div layoutId="active-bg" className="absolute inset-0 bg-primary/5 z-0" />
                    )}
                  </button>
                ))}
              </div>

              <button 
                onClick={nextStep}
                className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
              >
                Confirm Archetype <ChevronRight className="ml-2" size={18} />
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <button onClick={prevStep} className="flex items-center text-textMuted hover:text-primary text-xs font-bold transition-colors">
                  <ArrowLeft size={14} className="mr-1" /> Back
                </button>
                <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-widest text-xs">
                  <Target size={14} />
                  <span>Phase 03: Strategic Goals</span>
                </div>
                <h1 className="text-4xl font-black text-textMain tracking-tighter italic uppercase">Mission Objectives</h1>
                <p className="text-textMuted">Select the core metrics you wish to optimize within the Quantum OS.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {goals.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => {
                      if (formData.goals.includes(goal)) {
                        setFormData({ ...formData, goals: formData.goals.filter(g => g !== goal) });
                      } else {
                        setFormData({ ...formData, goals: [...formData.goals, goal] });
                      }
                    }}
                    className={`p-4 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                      formData.goals.includes(goal) 
                        ? 'bg-primary/20 border-primary text-textMain' 
                        : 'bg-white/5 border-white/10 text-textMuted hover:border-white/20'
                    }`}
                  >
                    <span>{goal}</span>
                    {formData.goals.includes(goal) && <CheckCircle2 size={14} className="text-primary" />}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleComplete}
                className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
              >
                Initialize System <Rocket className="ml-2" size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
