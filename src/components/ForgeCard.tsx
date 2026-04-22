import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { audio } from '../lib/audio';

const ENTITIES = ["Shiva", "Vishnu", "Durga", "Kali", "Hanuman", "Ganesha"];
const STYLES = ["Cinematic Lighting", "Oil Painting", "Unreal Engine 5 3D Render", "Dark Fantasy", "Hyper-Realistic"];
const ACTIONS = ["Meditating in cosmic space", "Fierce battle stance", "Bestowing a blessing", "Performing the Tandava", "Holding a divine weapon"];

export function ForgeCard() {
  const [entity, setEntity] = useState(ENTITIES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [action, setAction] = useState(ACTIONS[0]);
  
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const generatePrompt = () => {
    audio.playClick();
    const result = `A highly detailed, ${style.toLowerCase()} of Lord ${entity}, ${action.toLowerCase()}. Divine aura, god rays, extremely detailed face, 8k resolution, masterpiece, trending on ArtStation.`;
    setPrompt(result);
    setCopied(false);
  };

  const handleCopy = () => {
    audio.playSuccess();
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel col-span-1 md:col-span-2 lg:col-span-2 row-span-2 p-6 flex flex-col hover:border-purple-500/50 transition-colors relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-purple-500/30 transition-colors" />

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center space-x-2">
          <Sparkles size={20} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-textMain">The Forge</h3>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        <select 
          value={entity} 
          onChange={(e) => setEntity(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg p-2 text-sm text-textMain outline-none focus:border-purple-500/50 transition-colors"
        >
          {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        
        <select 
          value={style} 
          onChange={(e) => setStyle(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg p-2 text-sm text-textMain outline-none focus:border-purple-500/50 transition-colors"
        >
          {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select 
          value={action} 
          onChange={(e) => setAction(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg p-2 text-sm text-textMain outline-none focus:border-purple-500/50 transition-colors"
        >
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <button 
          onClick={generatePrompt}
          onMouseEnter={() => audio.playClick()}
          className="w-full mt-2 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:border-purple-500/60 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          Generate Prompt
        </button>

        {prompt && (
          <div className="mt-4 p-3 bg-surfaceHighlight rounded-lg border border-border/50 relative">
            <p className="text-xs text-textMuted pr-8">{prompt}</p>
            <button 
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 bg-surface rounded text-textMuted hover:text-purple-400 border border-border hover:border-purple-500/50 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
