import { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, CheckCircle2, Play, ChevronLeft } from 'lucide-react';
import { audio } from '../lib/audio';
import { useProgression } from '../hooks/useProgression';

const PATTERNS = [
  {
    id: 1,
    title: 'Star Pyramid',
    topic: 'Nested Loops',
    difficulty: 'Easy',
    problem: 'Write a program to print a full pyramid of stars. The number of rows is defined by N.',
    pseudoCode: `FOR i = 1 TO N:
  PRINT (N - i) spaces
  PRINT (2 * i - 1) stars
  PRINT newline`,
  },
  {
    id: 2,
    title: 'ITAB Loop Performance',
    topic: 'Internal Tables',
    difficulty: 'Medium',
    problem: 'Optimize a loop through an internal table ITAB with 100,000 records. Avoid nested loops.',
    pseudoCode: `SORT itab BY key.
READ TABLE itab INTO wa WITH KEY key = target BINARY SEARCH.
IF sy-subrc = 0.
  " Process WA
ENDIF.`,
  },
  {
    id: 3,
    title: 'Diamond Pattern',
    topic: 'Logic',
    difficulty: 'Hard',
    problem: 'Print a diamond shape of stars for a given odd integer N.',
    pseudoCode: `N_HALF = N / 2 + 1
// Upper half
FOR i = 1 TO N_HALF:
  PRINT spaces, PRINT stars
// Lower half
FOR i = N_HALF - 1 DOWNTO 1:
  PRINT spaces, PRINT stars`,
  }
];

export function PatternDojo() {
  const [selectedPattern, setSelectedPattern] = useState<typeof PATTERNS[0] | null>(null);
  const [testCode, setTestCode] = useState('');
  const { addXp } = useProgression();
  const [masteredIds, setMasteredIds] = useState<number[]>([]);

  const handleMaster = async () => {
    if (!selectedPattern || masteredIds.includes(selectedPattern.id)) return;
    
    audio.playSuccess();
    const xpValue = selectedPattern.difficulty === 'Easy' ? 20 : selectedPattern.difficulty === 'Medium' ? 50 : 100;
    const awarded = await addXp('Study', `Completed Dojo: ${selectedPattern.title}`, xpValue);
    console.debug(`[PatternDojo] Awarded ${awarded} XP for ${selectedPattern.title}`);
    setMasteredIds([...masteredIds, selectedPattern.id]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full bg-background"
    >
      {/* Left Sidebar - Pattern List */}
      <div className={`w-full md:w-80 border-r border-border bg-surface/50 flex flex-col ${selectedPattern ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-border flex items-center space-x-3 text-primary">
          <Terminal size={24} />
          <h2 className="text-xl font-bold">Pattern Dojo</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {PATTERNS.map(pattern => (
            <button
              key={pattern.id}
              onClick={() => setSelectedPattern(pattern)}
              className={`w-full text-left p-4 rounded-xl transition-all border ${
                selectedPattern?.id === pattern.id 
                  ? 'bg-primary/20 border-primary text-primary' 
                  : 'bg-surfaceHighlight border-transparent hover:border-border text-textMain'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{pattern.title}</span>
                {masteredIds.includes(pattern.id) && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>
              <div className="text-xs mt-1 text-textMuted flex items-center justify-between">
                <span>{pattern.topic}</span>
                <span className={`font-bold ${pattern.difficulty === 'Easy' ? 'text-emerald-500' : pattern.difficulty === 'Medium' ? 'text-amber-500' : 'text-red-500'}`}>{pattern.difficulty}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Side - Workspace */}
      <div className={`flex-1 flex flex-col relative ${!selectedPattern ? 'hidden md:flex' : 'flex'}`}>
        {selectedPattern ? (
          <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-10 space-y-6 scrollbar-thin">
            
            <button 
              onClick={() => setSelectedPattern(null)}
              className="md:hidden flex items-center text-textMuted hover:text-textMain mb-4"
            >
              <ChevronLeft size={20} className="mr-1" /> Back to Dojo
            </button>

            <div>
              <h1 className="text-3xl font-bold text-textMain mb-2">{selectedPattern.title}</h1>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-surfaceHighlight rounded-full text-xs font-bold text-textMuted border border-border">{selectedPattern.topic}</span>
                <span className="px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary border border-primary/20">{selectedPattern.difficulty}</span>
              </div>
            </div>

            {/* Problem Statement */}
            <div className="glass-panel p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-textMuted mb-3">Problem Statement</h3>
              <p className="text-textMain">{selectedPattern.problem}</p>
            </div>

            {/* Pseudo-code */}
            <div className="glass-panel p-6 bg-[#0a0a0a]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Target Logic (Pseudo-code)</h3>
              <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">{selectedPattern.pseudoCode}</pre>
            </div>

            {/* Test Workspace */}
            <div className="glass-panel p-6 flex-1 flex flex-col min-h-[300px]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-textMuted mb-3">Test Your Logic</h3>
              <textarea 
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Write your implementation here..."
                className="flex-1 w-full bg-surfaceHighlight/50 border border-border rounded-xl p-4 text-sm font-mono text-textMain focus:outline-none focus:border-primary resize-none scrollbar-thin mb-4"
              />
              
              <div className="flex items-center justify-between mt-auto">
                <button className="flex items-center space-x-2 px-4 py-2 bg-surfaceHighlight text-textMuted hover:text-textMain rounded-lg transition-colors">
                  <Play size={16} /> <span>Simulate</span>
                </button>
                
                <button 
                  onClick={handleMaster}
                  disabled={masteredIds.includes(selectedPattern.id)}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-bold transition-all ${
                    masteredIds.includes(selectedPattern.id)
                      ? 'bg-emerald-500/10 text-emerald-500 cursor-not-allowed border border-emerald-500/20'
                      : 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:scale-105'
                  }`}
                >
                  <CheckCircle2 size={18} /> 
                  <span>{masteredIds.includes(selectedPattern.id) ? 'Mastered' : `Mark as Mastered (+${selectedPattern.difficulty === 'Easy' ? 20 : selectedPattern.difficulty === 'Medium' ? 50 : 100} XP)`}</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-textMuted flex-col">
            <Terminal size={48} className="mb-4 opacity-20" />
            <p>Select a pattern from the Dojo to enter the workspace.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
