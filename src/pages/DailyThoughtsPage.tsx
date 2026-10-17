import { useState, useMemo } from 'react';
import { 
  Sparkles, Plus, Trash2, Pencil, Search, 
  Lightbulb, Quote, Copy, Check, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { 
  type DailyThought, 
  type ThoughtCategory, 
  DEFAULT_DAILY_THOUGHTS, 
  loadSavedThoughts, 
  saveStoredThoughts,
  getTodayThought 
} from '../lib/dailyThoughts';
import { useProgression } from '../hooks/useProgression';
import { audio } from '../lib/audio';
import toast from 'react-hot-toast';

const CATEGORIES: ('All' | ThoughtCategory)[] = ['All', 'Discipline', 'Mindset', 'Focus', 'Wisdom', 'Execution'];

export function DailyThoughtsPage({ onBack }: { onBack?: () => void }) {
  const { state, updateProfile } = useProgression();
  const [thoughts, setThoughts] = useState<DailyThought[]>(() => 
    loadSavedThoughts(state.settings?.customThoughts)
  );

  const [activeCategory, setActiveCategory] = useState<'All' | ThoughtCategory>('All');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingThought, setEditingThought] = useState<DailyThought | null>(null);
  const [formQuote, setFormQuote] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formCategory, setFormCategory] = useState<ThoughtCategory>('Mindset');

  // Today's Featured Thought
  const [todayOffset, setTodayOffset] = useState(0);
  const todayThought = useMemo(() => {
    if (thoughts.length === 0) return DEFAULT_DAILY_THOUGHTS[0];
    const base = getTodayThought(thoughts);
    const baseIndex = thoughts.findIndex(t => t.id === base.id);
    const effectiveIndex = (baseIndex + todayOffset + thoughts.length) % thoughts.length;
    return thoughts[effectiveIndex] || thoughts[0];
  }, [thoughts, todayOffset]);

  const saveAndSync = (nextThoughts: DailyThought[]) => {
    setThoughts(nextThoughts);
    saveStoredThoughts(nextThoughts);
    if (updateProfile) {
      updateProfile({
        settings: {
          ...state.settings,
          customThoughts: nextThoughts,
        }
      });
    }
  };

  const handleOpenAdd = () => {
    setEditingThought(null);
    setFormQuote('');
    setFormAuthor('');
    setFormCategory('Mindset');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: DailyThought) => {
    setEditingThought(t);
    setFormQuote(t.quote);
    setFormAuthor(t.author || '');
    setFormCategory(t.category);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    audio.playClick();
    if (thoughts.length <= 1) {
      toast.error('You must keep at least 1 thought in your vault.');
      return;
    }
    const next = thoughts.filter(t => t.id !== id);
    saveAndSync(next);
    toast.success('Thought removed from vault.');
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuote.trim()) {
      toast.error('Thought quote is required.');
      return;
    }

    audio.playSuccess();
    if (editingThought) {
      const next = thoughts.map(t => 
        t.id === editingThought.id 
          ? { ...t, quote: formQuote.trim(), author: formAuthor.trim() || undefined, category: formCategory }
          : t
      );
      saveAndSync(next);
      toast.success('Thought updated!');
    } else {
      const newThought: DailyThought = {
        id: `dt-custom-${Date.now()}`,
        quote: formQuote.trim(),
        author: formAuthor.trim() || 'My Reflection',
        category: formCategory,
        isCustom: true,
      };
      saveAndSync([newThought, ...thoughts]);
      toast.success('New daily thought added to vault!');
    }
    setIsModalOpen(false);
  };

  const handleCopy = (quote: string, id: string) => {
    audio.playClick();
    navigator.clipboard.writeText(quote);
    setCopiedId(id);
    toast.success('Copied thought to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredThoughts = useMemo(() => {
    return thoughts.filter(t => {
      const matchCat = activeCategory === 'All' || t.category === activeCategory;
      const matchSearch = t.quote.toLowerCase().includes(search.toLowerCase()) || 
        (t.author && t.author.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [thoughts, activeCategory, search]);

  const categoryColor = (cat: ThoughtCategory) => {
    switch (cat) {
      case 'Discipline': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'Mindset': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Focus': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'Wisdom': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Execution': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-primary bg-primary/10 border-primary/30';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-28 md:pb-8 scrollbar-none">
      {/* ─── HEADER / NAVIGATION ─── */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={() => {
                audio.playClick();
                onBack();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-colors"
              title="Return to Home"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Lightbulb size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase tracking-wider text-textMain flex items-center gap-2">
              <span>Daily Thoughts & Mindset Vault</span>
            </h1>
            <p className="text-xs text-textMuted">
              Curated mental models, philosophical anchors, and cognitive affirmations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-primary/20 transition-all hover:scale-105"
          >
            <Plus size={16} />
            <span>Add New Thought</span>
          </button>
        </div>
      </div>

      {/* ─── HERO: TODAY'S THOUGHT ─── */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-black/40 to-purple-500/5 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Sparkles size={12} /> Today's Focus Thought
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTodayOffset(prev => prev + 1)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-textMuted hover:text-white text-xs flex items-center gap-1 transition-colors"
              title="Cycle to another thought"
            >
              <RefreshCw size={13} />
              <span className="text-[10px] font-bold">Cycle</span>
            </button>
            <button
              onClick={() => handleCopy(todayThought.quote, todayThought.id)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-colors"
              title="Copy quote"
            >
              {copiedId === todayThought.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <p className="text-base md:text-xl font-bold text-textMain leading-relaxed italic">
            "{todayThought.quote}"
          </p>
          <div className="flex items-center gap-2 pt-2">
            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${categoryColor(todayThought.category)}`}>
              {todayThought.category}
            </span>
            {todayThought.author && (
              <span className="text-xs text-textMuted font-medium">
                — {todayThought.author}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── CONTROLS: CATEGORY TABS & SEARCH ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => {
                audio.playClick();
                setActiveCategory(cat);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white/5 text-textMuted hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            type="text"
            placeholder="Search thoughts & authors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-textMuted/60 outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* ─── THOUGHTS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredThoughts.map(t => (
          <div
            key={t.id}
            className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/15 bg-white/[0.01] hover:bg-white/[0.03] transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${categoryColor(t.category)}`}>
                  {t.category}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(t.quote, t.id)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-colors"
                    title="Copy"
                  >
                    {copiedId === t.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-red-500/20 text-textMuted hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <p className="text-xs font-semibold text-textMain leading-relaxed italic">
                "{t.quote}"
              </p>
            </div>

            {t.author && (
              <p className="text-[10px] text-textMuted font-medium pt-2 border-t border-white/5">
                — {t.author}
              </p>
            )}
          </div>
        ))}
      </div>

      {filteredThoughts.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <Quote size={32} className="mx-auto text-textMuted opacity-40" />
          <p className="text-sm font-bold text-textMuted">No thoughts match your query.</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase text-primary transition-colors"
          >
            + Add First Custom Thought
          </button>
        </div>
      )}

      {/* ─── MODAL: ADD / EDIT THOUGHT ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11131e] border border-white/20 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-400" />
                <span>{editingThought ? 'Edit Daily Thought' : 'Add New Daily Thought'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-textMuted hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-textMuted block mb-1">
                  Thought / Quote
                </label>
                <textarea
                  required
                  rows={3}
                  value={formQuote}
                  onChange={e => setFormQuote(e.target.value)}
                  placeholder="e.g., Action over thinking. The obstacle is the way..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-textMuted block mb-1">
                  Author / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={formAuthor}
                  onChange={e => setFormAuthor(e.target.value)}
                  placeholder="e.g., Marcus Aurelius, Personal Rule..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-textMuted block mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as ThoughtCategory)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="Discipline">Discipline</option>
                  <option value="Mindset">Mindset</option>
                  <option value="Focus">Focus</option>
                  <option value="Wisdom">Wisdom</option>
                  <option value="Execution">Execution</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-textMuted text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase shadow-lg shadow-primary/20"
                >
                  {editingThought ? 'Update Thought' : 'Save to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyThoughtsPage;
