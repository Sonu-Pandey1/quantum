import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Settings, Clock, Activity, Target } from 'lucide-react';
import { audio } from '../lib/audio';

const defaultTimetable = JSON.stringify([
  { id: 1, title: 'Morning Optimization', timeStart: '07:00', timeEnd: '08:00', icon: 'Sun' },
  { id: 2, title: 'Office Mission', timeStart: '10:00', timeEnd: '19:00', icon: 'Briefcase' },
  { id: 3, title: 'Deep Study (SAP)', timeStart: '20:00', timeEnd: '22:00', icon: 'Book' },
], null, 2);

export function ControlRoom() {
  const [timetable, setTimetable] = useState(() => localStorage.getItem('quantum_timetable') || defaultTimetable);
  const [weightGoal, setWeightGoal] = useState(() => localStorage.getItem('quantum_weight_goal') || '70');
  const [sapTarget, setSapTarget] = useState(() => localStorage.getItem('quantum_sap_target') || 'Master ABAP Objects');
  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = () => {
    try {
      // Validate JSON Schema
      const parsed = JSON.parse(timetable);
      if (!Array.isArray(parsed)) throw new Error('Invalid Format: Root must be an array');
      
      // Basic structure check
      parsed.forEach((item, index) => {
        if (!item.title || !item.timeStart || !item.timeEnd) {
          throw new Error(`Invalid Item at index ${index}: Missing title, timeStart, or timeEnd`);
        }
      });

      audio.playSuccess();
      localStorage.setItem('quantum_timetable', timetable);
      localStorage.setItem('quantum_weight_goal', weightGoal);
      localStorage.setItem('quantum_sap_target', sapTarget);
      
      setSavedMessage('Configuration Saved Successfully');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (e: any) {
      setSavedMessage(`Error: ${e.message || 'Invalid Timetable JSON'}`);
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col h-full overflow-y-auto scrollbar-thin p-6 md:p-10 space-y-8"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-textMain">
          <Settings size={32} className="text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">The Control Room</h1>
        </div>
        
        <button 
          onClick={handleSave}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-primary/20 hover:bg-primary/30 text-primary px-6 py-3 rounded-xl font-bold transition-all border border-primary/50"
        >
          <Save size={18} />
          <span>Save Changes</span>
        </button>
      </div>

      {savedMessage && (
        <div className={`p-4 rounded-xl border font-bold ${savedMessage.includes('Error') ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'}`}>
          {savedMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Timetable Configuration */}
        <div className="glass-panel p-6 flex flex-col space-y-4 h-[600px]">
          <div className="flex items-center space-x-2 text-primary font-bold">
            <Clock size={20} />
            <h2>Timetable Configuration (JSON)</h2>
          </div>
          <p className="text-xs text-textMuted">Modify the exact execution blocks that drive The Engine.</p>
          <textarea 
            value={timetable}
            onChange={(e) => setTimetable(e.target.value)}
            className="flex-1 w-full bg-surfaceHighlight border border-border rounded-xl p-4 text-sm font-mono text-textMain focus:outline-none focus:border-primary resize-none scrollbar-thin"
          />
        </div>

        {/* System Variables */}
        <div className="space-y-8">
          
          {/* Weight Goal */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-500 font-bold">
              <Activity size={20} />
              <h2>Vitality Parameters</h2>
            </div>
            <div>
              <label className="text-xs text-textMuted font-bold uppercase tracking-wider mb-2 block">Target Weight (kg)</label>
              <input 
                type="number" 
                value={weightGoal}
                onChange={(e) => setWeightGoal(e.target.value)}
                className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3 text-textMain outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* SAP Target */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center space-x-2 text-amber-500 font-bold">
              <Target size={20} />
              <h2>Career & Finance Objectives</h2>
            </div>
            <div>
              <label className="text-xs text-textMuted font-bold uppercase tracking-wider mb-2 block">Current SAP Target</label>
              <input 
                type="text" 
                value={sapTarget}
                onChange={(e) => setSapTarget(e.target.value)}
                className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3 text-textMain outline-none focus:border-amber-500"
              />
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
