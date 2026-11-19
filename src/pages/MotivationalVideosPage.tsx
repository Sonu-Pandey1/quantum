import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Film, 
  ExternalLink, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Grid, 
  Smartphone, 
  Search, 
  HelpCircle,
  Copy,
  Check,
  AlertTriangle,
  TrendingDown
} from 'lucide-react';

function InstagramIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import type { 
  MotivationalVideo, 
  VideoCategory 
} from '../lib/motivationalVideos';
import { 
  loadSavedVideos, 
  saveStoredVideos, 
  parsePastedLinks 
} from '../lib/motivationalVideos';
import { useProgression } from '../hooks/useProgression';
import { audio } from '../lib/audio';
import toast from 'react-hot-toast';

interface MotivationalVideosPageProps {
  onBack: () => void;
}

const CATEGORIES: ('All' | VideoCategory)[] = ['All', 'Discipline', 'Mindset', 'Focus', 'Stoic', 'Execution'];

export function MotivationalVideosPage({ onBack }: MotivationalVideosPageProps) {
  const { state, deductXp, updateProfile } = useProgression();
  const userId = state.displayName || 'operator';

  // Video repository state
  const [videos, setVideos] = useState<MotivationalVideo[]>(() => {
    return loadSavedVideos(state.settings?.motivationalVideos, userId);
  });

  const [activeCategory, setActiveCategory] = useState<'All' | VideoCategory>('All');
  const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedContent, setPastedContent] = useState('');
  const [importCategory, setImportCategory] = useState<VideoCategory>('Discipline');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reels container ref
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filtered video list
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchesCat = activeCategory === 'All' || v.category === activeCategory;
      const matchesQuery = !searchQuery.trim() || 
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.platform.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [videos, activeCategory, searchQuery]);

  // Keep index within bounds when filter changes
  useEffect(() => {
    if (activeIndex >= filteredVideos.length && filteredVideos.length > 0) {
      setActiveIndex(0);
    }
  }, [filteredVideos.length, activeIndex]);

  // Sync to local storage & profile settings
  const persistVideos = async (updated: MotivationalVideo[]) => {
    setVideos(updated);
    saveStoredVideos(updated, userId);
    try {
      await updateProfile({
        settings: {
          ...(state.settings || {}),
          motivationalVideos: updated,
        }
      });
    } catch (err) {
      console.warn('Failed to sync motivational videos to cloud profile:', err);
    }
  };

  // Deduct 15 XP for viewing or scrolling to each reel
  const handleApplyDopamineCost = async (video: MotivationalVideo) => {
    if (video.xpDeducted) return;

    audio.playClick();
    try {
      await deductXp('Mind', video.title, 15);
      
      const updated = videos.map(v => 
        v.id === video.id ? { ...v, watched: true, xpDeducted: true } : v
      );
      await persistVideos(updated);

      toast('Reel Viewed: -15 Mind XP Deducted 📉', {
        icon: '⚠️',
        duration: 3500,
        style: {
          border: '1px solid rgba(239, 68, 68, 0.4)',
          background: '#140c10',
          color: '#f87171',
        },
      });
    } catch (err) {
      console.error('Error applying reel XP deduction:', err);
    }
  };

  // Trigger -15 XP deduction on each reel view or scroll
  useEffect(() => {
    if (viewMode !== 'reels') return;
    const currentVideo = filteredVideos[activeIndex];
    if (currentVideo && !currentVideo.xpDeducted) {
      handleApplyDopamineCost(currentVideo);
    }
  }, [activeIndex, viewMode, filteredVideos]);

  // Delete a video
  const handleDeleteVideo = async (videoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audio.playClick();
    if (!confirm('Remove this reel from your vault?')) return;

    const updated = videos.filter(v => v.id !== videoId);
    await persistVideos(updated);
    toast.success('Reel removed from vault.');
  };

  // Keyboard navigation for reels
  useEffect(() => {
    if (viewMode !== 'reels') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isImportModalOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeIndex, isImportModalOpen, filteredVideos.length]);

  // Scroll to a specific reel index
  const scrollToIndex = (index: number) => {
    if (index < 0 || index >= filteredVideos.length) return;
    setActiveIndex(index);
    const targetEl = videoRefs.current[index];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Detect active reel on scroll snap
  const handleScroll = () => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    
    let closestIndex = 0;
    let closestDistance = Infinity;

    videoRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top - containerTop);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestIndex = idx;
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  };

  // Import handler for links pasted from WhatsApp, Notes, or Instagram
  const handleImportLinks = async () => {
    if (!pastedContent.trim()) {
      toast.error('Please paste at least one YouTube or Instagram link.');
      return;
    }

    const parsed = parsePastedLinks(pastedContent, importCategory);
    if (parsed.length === 0) {
      toast.error('No valid YouTube or Instagram links found. Please check format.');
      return;
    }

    // Filter out already existing mediaIds
    const existingIds = new Set(videos.map(v => v.mediaId || v.youtubeId));
    const newItems: MotivationalVideo[] = [];

    parsed.forEach((item, idx) => {
      if (!existingIds.has(item.mediaId)) {
        existingIds.add(item.mediaId);
        newItems.push({
          ...item,
          id: `mv-custom-${Date.now()}-${idx}`,
        });
      }
    });

    if (newItems.length === 0) {
      toast('All pasted reels are already in your vault! 📁', { icon: 'ℹ️' });
      setIsImportModalOpen(false);
      setPastedContent('');
      return;
    }

    const updated = [...newItems, ...videos];
    await persistVideos(updated);
    audio.playSuccess();
    toast.success(`Imported ${newItems.length} reel(s) into Vault! 🎉`, { duration: 4000 });
    
    setIsImportModalOpen(false);
    setPastedContent('');
    setActiveIndex(0);
  };

  // Live count of detected links in modal
  const detectedCount = useMemo(() => {
    return parsePastedLinks(pastedContent, importCategory).length;
  }, [pastedContent, importCategory]);

  return (
    <div className="h-full flex flex-col bg-background text-textMain overflow-hidden relative">
      {/* ─── TOP CONTROL BAR ─── */}
      <header className="shrink-0 glass-panel border-b border-white/10 px-3 sm:px-4 py-2.5 sm:py-3 z-30 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => { audio.playClick(); onBack(); }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-textMuted hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Return to Command Deck"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight flex items-center gap-1.5 truncate">
                <Film className="text-red-500 shrink-0" size={18} />
                <span className="truncate max-w-[120px] sm:max-w-none">Reels Vault</span>
              </h1>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 shrink-0 flex items-center gap-1">
                <TrendingDown size={10} className="text-rose-400" />
                -15 XP
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-textMuted hidden sm:block truncate">
              Instagram Reels & YouTube videos • -15 XP cost per view/scroll
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* View Mode Toggle: Reels vs Grid */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-0.5 sm:p-1 flex items-center">
            <button
              onClick={() => { audio.playClick(); setViewMode('reels'); }}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 ${
                viewMode === 'reels' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-textMuted hover:text-white'
              }`}
              title="Reels Snap Scroll Mode"
            >
              <Smartphone size={13} />
              <span className="hidden md:inline">Reels</span>
            </button>
            <button
              onClick={() => { audio.playClick(); setViewMode('grid'); }}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 ${
                viewMode === 'grid' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-textMuted hover:text-white'
              }`}
              title="Grid Library View"
            >
              <Grid size={13} />
              <span className="hidden md:inline">Library</span>
            </button>
          </div>

          {/* Import Button */}
          <button
            onClick={() => { audio.playClick(); setIsImportModalOpen(true); }}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-500 via-pink-600 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add Links</span>
          </button>
        </div>
      </header>

      {/* ─── CATEGORY & FILTER STRIP ─── */}
      <div className="shrink-0 px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar z-20">
        <div className="flex items-center gap-1.5 shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { audio.playClick(); setActiveCategory(cat); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                  : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {viewMode === 'grid' && (
          <div className="relative min-w-[160px] sm:min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reels..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-textMuted focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
        )}
      </div>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 overflow-hidden relative">
        {filteredVideos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl text-red-400">
              <Film size={32} />
            </div>
            <h3 className="text-lg font-black text-textMain">No Reels Found</h3>
            <p className="text-xs text-textMuted max-w-sm">
              Your vault is empty for this category. Import your Instagram Reels and YouTube motivational videos saved on WhatsApp or Notes.
            </p>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              Import Links Now
            </button>
          </div>
        ) : viewMode === 'reels' ? (
          /* ─── REELS VERTICAL SNAP SCROLL ─── */
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar relative flex flex-col items-center py-1 sm:py-2 px-1 sm:px-2"
          >
            {filteredVideos.map((video, idx) => {
              const isCurrent = idx === activeIndex;
              const isInstagram = video.platform === 'instagram';

              return (
                <div
                  key={video.id}
                  ref={el => { videoRefs.current[idx] = el; }}
                  className="h-full w-full max-h-full snap-center snap-always flex items-center justify-center p-1 sm:p-2 relative my-auto shrink-0"
                >
                  {/* Reel Card */}
                  <div className="relative w-full max-w-[390px] sm:max-w-[420px] md:max-w-[440px] h-full max-h-[96%] sm:max-h-[92%] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-black/95 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between group">
                    {/* Media Embed Player */}
                    <div className="relative w-full flex-1 bg-black overflow-hidden flex items-center justify-center">
                      {isInstagram ? (
                        <iframe
                          src={`https://www.instagram.com/reel/${video.mediaId}/embed`}
                          title={video.title}
                          className="w-full h-full border-0 absolute inset-0 bg-black"
                          frameBorder="0"
                          scrolling="no"
                          allowTransparency={true}
                          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        />
                      ) : (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${video.mediaId}?autoplay=${isCurrent ? 1 : 0}&enablejsapi=1&rel=0&playsinline=1&modestbranding=1`}
                          title={video.title}
                          className="w-full h-full border-0 absolute inset-0 bg-black"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      )}
                    </div>

                    {/* Bottom Metadata & Penalty Indicator */}
                    <div className="relative z-10 p-3 sm:p-4 pr-12 sm:pr-14 bg-gradient-to-t from-black via-black/90 to-transparent border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                            isInstagram 
                              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border-pink-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}>
                            {isInstagram ? <InstagramIcon size={11} /> : <Film size={11} />}
                            {isInstagram ? 'Instagram' : 'YouTube'}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                            {video.category}
                          </span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-textMuted font-mono">
                          {idx + 1}/{filteredVideos.length}
                        </span>
                      </div>

                      <h2 className="text-xs sm:text-sm md:text-base font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
                        {video.title}
                      </h2>

                      {/* -15 Mind XP Dopamine Cost Status */}
                      <div className="w-full py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                          <span className="text-[11px] sm:text-xs font-bold text-rose-300 truncate">
                            {video.xpDeducted ? 'Dopamine Cost Applied' : 'View / Scroll Cost'}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-xs font-black font-mono text-rose-300 bg-rose-500/20 px-1.5 sm:px-2 py-0.5 rounded-md border border-rose-500/30 shrink-0">
                          -15 XP
                        </span>
                      </div>
                    </div>

                    {/* Floating Right Action Rail (Shorts / Reels Style) */}
                    <div className="absolute right-2 sm:right-3 bottom-16 sm:bottom-20 z-20 flex flex-col items-center gap-2 sm:gap-2.5">
                      {/* Prev Reel */}
                      {idx > 0 && (
                        <button
                          onClick={() => scrollToIndex(idx - 1)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                          title="Previous Reel (Arrow Up)"
                        >
                          <ChevronUp size={18} />
                        </button>
                      )}

                      {/* Next Reel */}
                      {idx < filteredVideos.length - 1 && (
                        <button
                          onClick={() => scrollToIndex(idx + 1)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                          title="Next Reel (Arrow Down)"
                        >
                          <ChevronDown size={18} />
                        </button>
                      )}

                      {/* External Link */}
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                        title={isInstagram ? 'Open on Instagram' : 'Open on YouTube'}
                      >
                        <ExternalLink size={15} />
                      </a>

                      {/* Copy Link */}
                      <button
                        onClick={() => {
                          audio.playSuccess();
                          navigator.clipboard.writeText(video.url);
                          setCopiedId(video.id);
                          toast.success('Link copied! 📋');
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                        title="Copy Reel Link"
                      >
                        {copiedId === video.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                      </button>

                      {/* Delete Reel */}
                      <button
                        onClick={(e) => handleDeleteVideo(video.id, e)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-red-500/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-red-400 shadow-lg transition-all active:scale-90"
                        title="Remove from vault"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── GRID / LIBRARY VIEW ─── */
          <div className="h-full overflow-y-auto p-4 md:p-6 no-scrollbar">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video, idx) => {
                const isInstagram = video.platform === 'instagram';

                return (
                  <div
                    key={video.id}
                    onClick={() => {
                      audio.playClick();
                      setActiveIndex(idx);
                      setViewMode('reels');
                    }}
                    className="glass-panel p-3.5 rounded-2xl border border-white/10 hover:border-primary/40 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                      {isInstagram ? (
                        <div className="w-full h-full bg-gradient-to-tr from-yellow-500/20 via-pink-500/30 to-purple-600/40 flex flex-col items-center justify-center space-y-2 p-4 text-center">
                          <InstagramIcon size={32} className="text-pink-400 drop-shadow-md group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] font-bold text-white/90">Instagram Reel</span>
                        </div>
                      ) : (
                        <img
                          src={`https://img.youtube.com/vi/${video.mediaId}/hqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      )}

                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/20">
                        {video.category}
                      </span>
                      <span className="absolute bottom-2 right-2 text-[9px] font-black font-mono tracking-wider px-2 py-0.5 rounded-md bg-rose-500/80 backdrop-blur-md text-white flex items-center gap-1">
                        <TrendingDown size={10} /> -15 XP
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                        <AlertTriangle size={11} /> -15 XP Cost
                      </span>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-all"
                          title={isInstagram ? 'Open on Instagram' : 'Open on YouTube'}
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          onClick={(e) => handleDeleteVideo(video.id, e)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-textMuted hover:text-red-400 transition-all"
                          title="Delete reel"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── IMPORT MODAL (PASTE LINKS FROM WHATSAPP, INSTAGRAM & NOTES) ─── */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel w-full max-w-lg rounded-3xl border border-white/15 bg-[#0f111a] p-6 shadow-2xl relative space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Plus className="text-primary" size={20} />
                    Import Reels & Video Links
                  </h3>
                  <p className="text-xs text-textMuted mt-1">
                    Paste Instagram Reels or YouTube links copied directly from your WhatsApp chats, Instagram app, Notes, or bookmarks.
                  </p>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Category Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-textMuted uppercase tracking-wider">
                  Category Tag
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(CATEGORIES.filter(c => c !== 'All') as VideoCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setImportCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        importCategory === cat
                          ? 'bg-primary text-white border border-primary/50 shadow-md'
                          : 'bg-white/5 text-textMuted hover:text-white border border-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paste Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-textMuted uppercase tracking-wider">
                    Paste Links (Instagram Reels / YouTube)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {detectedCount} valid link(s) detected
                  </span>
                </div>
                <textarea
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder={`https://www.instagram.com/reel/C...\nhttps://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://www.youtube.com/shorts/...`}
                  rows={5}
                  className="w-full bg-black/50 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-textMuted/60 font-mono focus:outline-none focus:border-primary transition-all resize-none"
                  autoFocus
                />
                <p className="text-[10px] text-textMuted flex items-center gap-1">
                  <HelpCircle size={12} />
                  Paste links from Instagram or YouTube separated by newlines, spaces, or commas.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportLinks}
                  disabled={detectedCount === 0}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                    detectedCount > 0
                      ? 'bg-gradient-to-r from-red-500 via-pink-600 to-purple-600 text-white hover:scale-105 active:scale-95 shadow-lg cursor-pointer'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <Plus size={16} />
                  <span>Save to Vault ({detectedCount})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
