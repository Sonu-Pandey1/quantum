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
  TrendingDown,
  Shuffle,
  ShieldAlert,
  Edit3,
  Sparkles
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

function FacebookIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
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
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
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
  parsePastedLinks,
  getFacebookEmbedUrl,
  DAILY_REELS_LIMIT,
  getDailyViewedReelIds,
  recordDailyReelView,
  shuffleVideos
} from '../lib/motivationalVideos';
import { useProgression } from '../hooks/useProgression';
import { audio } from '../lib/audio';
import { defineVideoLinksWithAI } from '../lib/aiService';
import toast from 'react-hot-toast';

interface MotivationalVideosPageProps {
  onBack: () => void;
}

const CATEGORIES: ('All' | VideoCategory)[] = ['All', 'Discipline', 'Mindset', 'Focus', 'Stoic', 'Execution'];

const QUICK_MOOD_OPTIONS = [
  'Sad 🌧️',
  'Gym Beast 🔥',
  'Focus 🎯',
  'Stoic 🛡️',
  'Late Night 🌙',
  'Relentless ⚡',
  'Heartbreak 💔',
  'Cold Discipline 🧊',
];

export function MotivationalVideosPage({ onBack }: MotivationalVideosPageProps) {
  const { state, deductXp, updateProfile } = useProgression();
  const userId = state.displayName || 'operator';

  // Video repository state - shuffled on mount so every open starts with fresh/different reels like YT & Insta
  const [videos, setVideos] = useState<MotivationalVideo[]>(() => {
    const initial = loadSavedVideos(state.settings?.motivationalVideos, userId);
    return shuffleVideos(initial);
  });

  const [activeCategory, setActiveCategory] = useState<'All' | VideoCategory>('All');
  const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Daily quota tracking (Maximum 10 reels per day)
  const [dailyViewedIds, setDailyViewedIds] = useState<string[]>(() => {
    return getDailyViewedReelIds(userId);
  });

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedContent, setPastedContent] = useState('');
  const [importCategory, setImportCategory] = useState<VideoCategory>('Discipline');
  const [customTitle, setCustomTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAiResolving, setIsAiResolving] = useState(false);
  const [fbViewPreference, setFbViewPreference] = useState<Record<string, 'iframe' | 'card'>>({});

  const handleAiDefineLinks = async () => {
    if (!pastedContent.trim()) {
      toast.error('Please paste at least one video link first.');
      return;
    }
    setIsAiResolving(true);
    audio.playClick();
    try {
      const defined = await defineVideoLinksWithAI(pastedContent);
      if (defined.length > 0) {
        setPastedContent(defined.map(d => d.url).join('\n'));
        if (defined[0].title) setCustomTitle(defined[0].title);
        if (defined[0].category) setImportCategory(defined[0].category);
        toast.success(`✨ AI defined and optimized ${defined.length} link(s)!`, { duration: 3000 });
      } else {
        toast.error('No valid video links found to define.');
      }
    } catch (e: any) {
      toast.error('Failed to analyze links with AI.');
    } finally {
      setIsAiResolving(false);
    }
  };

  // Edit Title Modal State
  const [editingVideo, setEditingVideo] = useState<MotivationalVideo | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

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

  // Trigger -15 XP deduction and track daily reel count (max 10 reels/day) on view or scroll
  useEffect(() => {
    if (viewMode !== 'reels') return;
    const currentVideo = filteredVideos[activeIndex];
    if (!currentVideo) return;

    const currentViews = getDailyViewedReelIds(userId);
    const isAlreadyViewedToday = currentViews.includes(currentVideo.id);

    // If 10 reels have already been viewed and this is a new unviewed reel, enforce daily cap
    if (!isAlreadyViewedToday && currentViews.length >= DAILY_REELS_LIMIT) {
      setDailyViewedIds(currentViews);
      return;
    }

    // Record view in daily quota
    recordDailyReelView(currentVideo.id, userId);
    setDailyViewedIds(getDailyViewedReelIds(userId));

    // Deduct dopamine cost if not yet deducted
    if (!currentVideo.xpDeducted) {
      handleApplyDopamineCost(currentVideo);
    }
  }, [activeIndex, viewMode, filteredVideos, userId]);

  // Is daily limit reached?
  const isDailyLimitReached = dailyViewedIds.length >= DAILY_REELS_LIMIT;

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
      if (isImportModalOpen || editingVideo) return;
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
  }, [viewMode, activeIndex, isImportModalOpen, editingVideo, filteredVideos.length]);

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

  // Shuffle feed order (fresh reels order like YouTube Shorts and Instagram)
  const handleShuffleFeed = () => {
    audio.playClick();
    const shuffled = shuffleVideos(videos);
    setVideos(shuffled);
    setActiveIndex(0);
    toast.success('Feed refreshed with new randomized reels order! 🔀', { icon: '🔀' });
  };

  // Import handler for links pasted from WhatsApp, Notes, Instagram, or Facebook
  const handleImportLinks = async () => {
    if (!pastedContent.trim()) {
      toast.error('Please paste at least one YouTube, Instagram, or Facebook link.');
      return;
    }

    const parsed = parsePastedLinks(pastedContent, importCategory, customTitle.trim() || undefined);
    if (parsed.length === 0) {
      toast.error('No valid YouTube, Instagram, or Facebook links found. Please check format.');
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
      setCustomTitle('');
      return;
    }

    const updated = [...newItems, ...videos];
    await persistVideos(updated);
    audio.playSuccess();
    toast.success(`Imported ${newItems.length} reel(s) with custom title into Vault! 🎉`, { duration: 4000 });
    
    setIsImportModalOpen(false);
    setPastedContent('');
    setCustomTitle('');
    setActiveIndex(0);
  };

  // Save edited title
  const handleSaveEditedTitle = async () => {
    if (!editingVideo) return;
    audio.playClick();
    const newTitle = editTitleInput.trim() || editingVideo.title;
    const updated = videos.map(v => v.id === editingVideo.id ? { ...v, title: newTitle } : v);
    await persistVideos(updated);
    toast.success('Title updated! 🏷️');
    setEditingVideo(null);
    setEditTitleInput('');
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

              {/* Daily 10 Reels Limit Indicator */}
              <div 
                className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                  isDailyLimitReached 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                }`}
                title={`Daily Quota: Max 10 reels per day. ${dailyViewedIds.length}/10 viewed today.`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isDailyLimitReached ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                <span>{dailyViewedIds.length}/{DAILY_REELS_LIMIT} Reels Today</span>
              </div>
            </div>
            <p className="text-[10px] sm:text-[11px] text-textMuted hidden sm:block truncate">
              Max 10 reels/day • Randomized fresh feed • -15 XP per reel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Shuffle Feed Button (Fresh Reel order like YT / Insta) */}
          <button
            onClick={handleShuffleFeed}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-textMuted hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Shuffle feed to load fresh starting reel"
          >
            <Shuffle size={14} className="text-primary" />
            <span className="hidden lg:inline">Shuffle Feed</span>
          </button>

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
              placeholder="Search reels or titles (e.g. Sad, Focus)..."
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
          isDailyLimitReached ? (
            /* 10 Reels Daily Limit Safeguard Screen */
            <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                <ShieldAlert size={38} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Daily Attention Safeguard Active
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-3">
                  Daily Quota Reached (10/10 Reels)
                </h2>
                <p className="text-xs sm:text-sm text-textMuted mt-2 leading-relaxed">
                  You have viewed your maximum limit of 10 reels for today. Conserve dopamine and redirect your focus into deep work and execution! Quota resets at midnight.
                </p>
              </div>

              <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono text-white/80 flex items-center justify-between">
                <span>Viewed Today:</span>
                <span className="font-bold text-amber-400 font-sans">{dailyViewedIds.length} / {DAILY_REELS_LIMIT} Reels</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
                <button
                  onClick={() => { audio.playClick(); setViewMode('grid'); }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
                >
                  Browse Vault Library
                </button>
                <button
                  onClick={() => { audio.playClick(); onBack(); }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primaryHover hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Back to Deck
                </button>
              </div>
            </div>
          ) : (
            <div 
              ref={containerRef}
              onScroll={handleScroll}
              className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar relative flex flex-col items-center py-1 sm:py-2 px-1 sm:px-2"
            >
              {filteredVideos.map((video, idx) => {
                const isCurrent = idx === activeIndex;
                const isInstagram = video.platform === 'instagram';
                const isFacebook = video.platform === 'facebook';
                const isStory = isInstagram && (video.url.includes('/stories/') || /^\d{15,}$/.test(video.mediaId));
                const isFbShare = isFacebook && (!/^\d{8,}$/.test(video.mediaId) || video.url.includes('/share/') || video.url.includes('fb.watch'));
                const preferFbCard = fbViewPreference[video.id] === 'card' || (isFbShare && fbViewPreference[video.id] !== 'iframe');

                return (
                  <div
                    key={video.id}
                    ref={el => { videoRefs.current[idx] = el; }}
                    className="h-full w-full max-h-full snap-center snap-always flex items-center justify-center p-1 sm:p-2 relative my-auto shrink-0"
                  >
                    {/* Reel Card */}
                    <div className="relative w-full max-w-[390px] sm:max-w-[420px] md:max-w-[440px] h-full max-h-[96%] sm:max-h-[92%] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-black/95 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative group flex items-center justify-center">
                      {/* Media Embed Player (Edge-to-edge vertical 9:16 player) */}
                      <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                        {isStory ? (
                          <div className="w-full h-full bg-gradient-to-b from-[#1f0a2e] via-[#0d0714] to-black flex flex-col items-center justify-center p-6 text-center space-y-5 relative">
                            {/* Story Gradient Ring */}
                            <div className="relative p-1 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_35px_rgba(236,72,153,0.35)]">
                              <div className="p-4 rounded-full bg-black/90">
                                <InstagramIcon size={46} className="text-pink-400" />
                              </div>
                            </div>

                            <div className="space-y-1.5 max-w-xs">
                              <span className="text-[10px] font-black uppercase tracking-widest text-pink-300 bg-pink-500/15 px-3 py-1 rounded-full border border-pink-500/30">
                                Instagram Story
                              </span>
                              <h3 className="text-base sm:text-lg font-bold text-white pt-1 line-clamp-2 leading-snug">
                                {video.title}
                              </h3>
                              <p className="text-xs text-textMuted">
                                Instagram stories are temporary and require direct app viewing.
                              </p>
                            </div>

                            <a
                              href={video.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-500/25 flex items-center gap-2 transition-all active:scale-95 border border-pink-400/30"
                            >
                              <span>Watch Story on Instagram</span>
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        ) : isInstagram ? (
                          <iframe
                            src={video.url.includes('/p/') ? `https://www.instagram.com/p/${video.mediaId}/embed/` : `https://www.instagram.com/reel/${video.mediaId}/embed/`}
                            title={video.title}
                            className="w-full h-full border-0 absolute inset-0 bg-black"
                            frameBorder="0"
                            scrolling="no"
                            allowTransparency={true}
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                          />
                        ) : isFacebook && preferFbCard ? (
                          <div className="w-full h-full bg-gradient-to-b from-[#0a192f] via-[#060d1a] to-black flex flex-col items-center justify-center p-6 text-center space-y-4 relative">
                            {/* Facebook Icon Ring */}
                            <div className="relative p-1 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 shadow-[0_0_35px_rgba(37,99,235,0.4)]">
                              <div className="p-4 rounded-full bg-black/90">
                                <FacebookIcon size={46} className="text-blue-400" />
                              </div>
                            </div>

                            <div className="space-y-1.5 max-w-xs">
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 bg-blue-500/15 px-3 py-1 rounded-full border border-blue-500/30">
                                Facebook Reel
                              </span>
                              <h3 className="text-base sm:text-lg font-bold text-white pt-1 line-clamp-2 leading-snug">
                                {video.title}
                              </h3>
                              <p className="text-xs text-textMuted">
                                Tap below to play directly in Facebook app / browser with full sound & HD.
                              </p>
                            </div>

                            <div className="flex flex-col items-center gap-2 w-full max-w-xs pt-1">
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 border border-blue-400/30"
                              >
                                <span>▶ Play on Facebook</span>
                                <ExternalLink size={14} />
                              </a>
                              <button
                                type="button"
                                onClick={() => setFbViewPreference(p => ({ ...p, [video.id]: 'iframe' }))}
                                className="text-[11px] text-textMuted hover:text-white underline transition-colors cursor-pointer"
                              >
                                Try Embedded Player
                              </button>
                            </div>
                          </div>
                        ) : isFacebook ? (
                          <div className="relative w-full h-full">
                            <iframe
                              src={getFacebookEmbedUrl(video.url, video.mediaId)}
                              title={video.title}
                              className="w-full h-full border-0 absolute inset-0 bg-black"
                              frameBorder="0"
                              scrolling="no"
                              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                              allowFullScreen
                            />
                            {/* Floating Helper Banner in case Facebook iframe displays 'Video unavailable' */}
                            <div className="absolute top-12 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                              <div className="bg-black/85 backdrop-blur-md border border-blue-500/40 rounded-xl px-2.5 py-1 text-[10px] text-blue-200 flex items-center gap-1.5 shadow-lg pointer-events-auto">
                                <span>Video Unavailable?</span>
                                <a
                                  href={video.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-white font-bold underline hover:text-blue-300 flex items-center gap-0.5"
                                >
                                  <span>Open in FB</span>
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => setFbViewPreference(p => ({ ...p, [video.id]: 'card' }))}
                                className="bg-black/85 backdrop-blur-md border border-white/20 rounded-xl px-2 py-1 text-[10px] text-white/80 hover:text-white transition-all shadow-lg pointer-events-auto cursor-pointer"
                                title="Switch to Direct Card Mode"
                              >
                                Card Mode
                              </button>
                            </div>
                          </div>
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

                      {/* Top Bar Overlay (Platform Badge + 1-Tap App/Browser Launcher) */}
                      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-1.5 pointer-events-auto">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border shadow-md backdrop-blur-md flex items-center gap-1 ${
                            isInstagram 
                              ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white border-pink-400/40'
                              : isFacebook
                                ? 'bg-blue-600/80 text-white border-blue-400/40'
                                : 'bg-red-600/80 text-white border-red-400/40'
                          }`}>
                            {isInstagram ? <InstagramIcon size={11} /> : isFacebook ? <FacebookIcon size={11} /> : <Film size={11} />}
                            {isInstagram ? 'Instagram' : isFacebook ? 'Facebook' : 'YouTube'}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white/90 border border-white/15 shadow-md">
                            {video.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 pointer-events-auto">
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white/90 hover:text-white border border-white/20 flex items-center gap-1 transition-all shadow-md active:scale-95"
                            title={`Open original reel on ${isInstagram ? 'Instagram' : isFacebook ? 'Facebook' : 'YouTube'}`}
                          >
                            <span>Open in {isInstagram ? 'Insta' : isFacebook ? 'FB' : 'YT'}</span>
                            <ExternalLink size={10} />
                          </a>
                          <span className="text-[9px] sm:text-[10px] text-white/80 font-mono bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15">
                            {idx + 1}/{filteredVideos.length}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Metadata & Penalty Indicator - Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-4 pr-14 sm:pr-16 bg-gradient-to-t from-black via-black/85 to-transparent space-y-2 pointer-events-none">
                        {/* Title with edit button */}
                        <div className="flex items-start justify-between gap-2 pointer-events-auto">
                          <h2 className="text-xs sm:text-sm md:text-base font-bold text-white line-clamp-2 leading-snug drop-shadow-md flex-1">
                            {video.title}
                          </h2>
                          <button
                            onClick={() => {
                              audio.playClick();
                              setEditingVideo(video);
                              setEditTitleInput(video.title);
                            }}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white/80 hover:text-white transition-all shrink-0 shadow-md"
                            title="Edit Title / Mood Tag"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>

                        {/* -15 Mind XP Dopamine Cost Status */}
                        <div className="w-full py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl bg-black/60 backdrop-blur-md border border-rose-500/30 flex items-center justify-between gap-2 shadow-lg pointer-events-auto">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                            <span className="text-[10px] sm:text-xs font-bold text-rose-300 truncate">
                              {video.xpDeducted ? 'Dopamine Cost Applied' : 'View / Scroll Cost'}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs font-black font-mono text-rose-300 bg-rose-500/25 px-1.5 py-0.5 rounded-md border border-rose-500/40 shrink-0">
                            -15 XP
                          </span>
                        </div>
                      </div>

                      {/* Floating Right Action Rail (Shorts / Reels Style) */}
                      <div className="absolute right-2 sm:right-3 bottom-16 sm:bottom-20 z-30 flex flex-col items-center gap-2 sm:gap-2.5">
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
                          title={isInstagram ? 'Open on Instagram' : isFacebook ? 'Open on Facebook' : 'Open on YouTube'}
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

                        {/* Edit Title */}
                        <button
                          onClick={() => {
                            audio.playClick();
                            setEditingVideo(video);
                            setEditTitleInput(video.title);
                          }}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                          title="Rename / Set Mood Title"
                        >
                          <Edit3 size={15} />
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
          )
        ) : (
          /* ─── GRID / LIBRARY VIEW ─── */
          <div className="h-full overflow-y-auto p-4 md:p-6 no-scrollbar">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video, idx) => {
                const isInstagram = video.platform === 'instagram';
                const isFacebook = video.platform === 'facebook';
                const isStory = isInstagram && (video.url.includes('/stories/') || /^\d{15,}$/.test(video.mediaId));

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
                          <span className="text-[11px] font-bold text-white/90">
                            {isStory ? 'Instagram Story' : 'Instagram Reel'}
                          </span>
                        </div>
                      ) : isFacebook ? (
                        <div className="w-full h-full bg-gradient-to-tr from-blue-900/40 via-blue-700/30 to-sky-500/20 flex flex-col items-center justify-center space-y-2 p-4 text-center">
                          <FacebookIcon size={32} className="text-blue-400 drop-shadow-md group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] font-bold text-white/90">Facebook Reel</span>
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
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors flex-1">
                          {video.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audio.playClick();
                            setEditingVideo(video);
                            setEditTitleInput(video.title);
                          }}
                          className="p-1 rounded-md text-textMuted hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Edit Title"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
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
                          title={isInstagram ? 'Open on Instagram' : isFacebook ? 'Open on Facebook' : 'Open on YouTube'}
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

      {/* ─── IMPORT MODAL (PASTE LINKS FROM WHATSAPP, INSTAGRAM, FACEBOOK & NOTES) ─── */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel w-full max-w-lg rounded-3xl border border-white/15 bg-[#0f111a] p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Plus className="text-primary" size={20} />
                    Import Reels & Videos
                  </h3>
                  <p className="text-xs text-textMuted mt-1">
                    Paste Instagram Reels, Facebook Videos/Reels, or YouTube links saved from WhatsApp, Instagram, Facebook, or Notes.
                  </p>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Custom Title / Mood Option (e.g. "Sad", "Gym Beast", "Focus") */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-textMuted uppercase tracking-wider">
                    Custom Title / Mood Option (Optional)
                  </label>
                  {customTitle && (
                    <button 
                      type="button" 
                      onClick={() => setCustomTitle('')}
                      className="text-[10px] text-textMuted hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Sad, Beast Mode, Focus, Late Night"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-textMuted/60 focus:outline-none focus:border-primary transition-all"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_MOOD_OPTIONS.map(mood => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setCustomTitle(mood)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                        customTitle === mood
                          ? 'bg-primary text-white border-primary/50 shadow-sm'
                          : 'bg-white/5 border-white/10 text-textMuted hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-textMuted uppercase tracking-wider">
                    Paste Links (Instagram / Facebook / YouTube)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isAiResolving || !pastedContent.trim()}
                      onClick={handleAiDefineLinks}
                      className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 via-primary to-blue-600 hover:opacity-90 text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
                      title="Use AI to clean tracking queries, fix Facebook links, and auto-generate motivational titles"
                    >
                      <Sparkles size={11} className={isAiResolving ? 'animate-spin' : ''} />
                      <span>{isAiResolving ? 'AI Defining...' : 'AI Define & Fix'}</span>
                    </button>
                    <span className="text-[11px] font-mono font-bold text-primary">
                      {detectedCount} link(s)
                    </span>
                  </div>
                </div>
                <textarea
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder={`https://www.instagram.com/reel/C...\nhttps://www.instagram.com/stories/username/...\nhttps://www.facebook.com/reel/...\nhttps://www.youtube.com/watch?v=...\nhttps://www.youtube.com/shorts/...`}
                  rows={4}
                  className="w-full bg-black/50 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-textMuted/60 font-mono focus:outline-none focus:border-primary transition-all resize-none"
                  autoFocus
                />
                <p className="text-[10px] text-textMuted flex items-center gap-1">
                  <HelpCircle size={12} />
                  Paste links from Instagram, Facebook, or YouTube separated by newlines, spaces, or commas.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white text-xs font-bold transition-all cursor-pointer"
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

      {/* ─── EDIT TITLE / MOOD MODAL ─── */}
      <AnimatePresence>
        {editingVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-md rounded-3xl border border-white/15 bg-[#0f111a] p-6 shadow-2xl relative space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Edit3 className="text-primary" size={18} />
                    Custom Title / Mood Option
                  </h3>
                  <p className="text-xs text-textMuted mt-1">
                    Give this reel your own custom title (e.g. Sad, Beast Mode, Focus).
                  </p>
                </div>
                <button
                  onClick={() => setEditingVideo(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <input
                  type="text"
                  value={editTitleInput}
                  onChange={(e) => setEditTitleInput(e.target.value)}
                  placeholder="Enter title (e.g. Sad, Night Fuel, Stoic)"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder-textMuted/60 focus:outline-none focus:border-primary transition-all font-medium"
                  autoFocus
                />

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {QUICK_MOOD_OPTIONS.map(mood => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setEditTitleInput(mood)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                        editTitleInput === mood
                          ? 'bg-primary text-white border-primary/50'
                          : 'bg-white/5 border-white/10 text-textMuted hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedTitle}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primaryHover text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Save Title
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
