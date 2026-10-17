import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Bell, BellOff, Sparkles, Volume2, VolumeX, Lightbulb } from 'lucide-react';
import { useProgression } from '../hooks/useProgression';
import { audio } from '../lib/audio';
import { notifier } from '../lib/notifications';
import { APP_CORE_LABEL } from '../lib/version';
import { loadSavedThoughts, getTodayThought } from '../lib/dailyThoughts';
import toast from 'react-hot-toast';

export function Header({ 
  hideVow = false, 
  onNavigateToRank, 
  onNavigateToDashboard,
  onNavigateToThoughts
}: { 
  hideVow?: boolean; 
  onNavigateToRank?: () => void; 
  onNavigateToDashboard?: () => void;
  onNavigateToThoughts?: () => void;
}) {
  const { state } = useProgression();
  const allThoughts = loadSavedThoughts(state.settings?.customThoughts);
  const todayThought = getTodayThought(allThoughts);
  const [notifGranted, setNotifGranted] = useState(false);
  const [isMuted, setIsMuted] = useState(() => audio.isAudioMuted());

  const handleToggleMute = () => {
    const nextMuted = audio.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      audio.playSuccess();
      toast.success('Sound Effects Active 🔊', { icon: '🔊' });
    } else {
      toast('Sound Effects Muted 🔇', { icon: '🔇' });
    }
  };

  useEffect(() => {
    setNotifGranted(notifier.isGranted());
  }, []);

  const handleToggleNotifications = async () => {
    audio.playClick();
    if (!notifier.isSupported()) {
      toast.error('Web System Notifications are not supported in this browser.');
      return;
    }

    if (notifier.isGranted()) {
      toast.success('Phone & Browser System Notifications Active 🔔', {
        icon: '🔔',
      });
      notifier.send(
        "Protocol Alerts Active",
        "System alerts are enabled on your device."
      );
    } else {
      const granted = await notifier.requestPermission();
      setNotifGranted(granted);
      if (granted) {
        toast.success('Phone & Device Notifications Enabled! 🚀');
        notifier.send(
          "Neural Protocol Alerts Enabled",
          "You will receive live device notifications when protocols start or complete."
        );
      } else {
        toast.error('Notification permission denied. Please allow notifications in browser settings.');
      }
    }
  };

  const getProgress = (xp: number) => {
    return (Math.max(0, xp) % 100);
  };

  return (
    <header className="h-[72px] md:h-20 bg-[#0a0a0c]/40 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-[90] sticky top-0 border-b border-white/5">
      <div
        className="flex items-center space-x-2 md:space-x-3 cursor-pointer group"
        onClick={() => {
          audio.playClick();
          if (onNavigateToDashboard) onNavigateToDashboard();
        }}
      >
        <div className="p-1.5 md:p-2 bg-primary/20 rounded-lg hidden xs:block group-hover:bg-primary/30 transition-colors">
          <Zap className="text-primary group-hover:scale-110 transition-transform" size={16} />
        </div>
        <div>
          <h2 className="text-xs md:text-base font-black text-textMain tracking-tight uppercase group-hover:text-primary transition-colors">
            QUANTUM <span className="text-primary group-hover:text-white transition-colors">GROWTH</span>
          </h2>
          <p className="text-[8px] md:text-[9px] text-textMuted uppercase tracking-[0.2em] font-bold opacity-50">
            {APP_CORE_LABEL}
          </p>
        </div>
      </div>

      {/* Center: Daily Thought & Protocol Affirmation */}
      {!hideVow && (
        <div 
          onClick={() => {
            audio.playClick();
            if (onNavigateToThoughts) onNavigateToThoughts();
          }}
          title="Daily Thought Protocol - Click to manage & view all thoughts"
          className="hidden lg:flex items-center space-x-3 px-5 py-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-primary/40 shadow-inner max-w-lg overflow-hidden cursor-pointer transition-all group"
        >
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Lightbulb className="text-primary" size={13} />
          </div>
          <div className="flex flex-col min-w-[240px] max-w-md overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-primary">Daily Thought</span>
              <span className="text-[8px] text-textMuted">• {todayThought.category}</span>
              {todayThought.author && (
                <span className="text-[8px] text-textMuted/60 truncate max-w-[120px]">— {todayThought.author}</span>
              )}
              <span className="text-[8px] text-white/30 group-hover:text-primary transition-colors ml-auto font-mono">View All →</span>
            </div>
            <p className="text-xs font-semibold text-textMain/90 truncate italic">
              "{todayThought.quote}"
            </p>
          </div>
        </div>
      )}

      {/* Right: AI Command & Notifications Button & Rank & Progress */}
      <div className="flex items-center space-x-2 md:space-x-3">

        {/* AI Command Bar Button */}
        <button
          onClick={() => {
            audio.playClick();
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          }}
          title="Open AI Co-Pilot Command Bar (Ctrl + K)"
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-[0_0_12px_rgba(59,130,246,0.2)]"
        >
          <Sparkles size={16} className="animate-pulse" />
          <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider">AI Command</span>
        </button>

        {/* Audio Mute / Unmute Toggle */}
        <button
          onClick={handleToggleMute}
          title={isMuted ? "Audio Muted - Click to Unmute" : "Audio Active - Click to Mute"}
          className={`p-2 rounded-xl border transition-all ${
            !isMuted
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-white/5 border-white/10 text-textMuted hover:text-white hover:bg-white/10'
          }`}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Phone / Device Notification Permission Toggle */}
        <button
          onClick={handleToggleNotifications}
          title={notifGranted ? "Device Notifications Active" : "Enable Phone / Device Notifications"}
          className={`p-2 rounded-xl border transition-all ${
            notifGranted
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
              : 'bg-white/5 border-white/10 text-textMuted hover:text-white hover:bg-white/10'
          }`}
        >
          {notifGranted ? <Bell size={18} className="animate-pulse" /> : <BellOff size={18} />}
        </button>

        <div
          className="flex items-center space-x-3 md:space-x-6 cursor-pointer group hover:bg-white/5 p-2 rounded-xl transition-colors"
          onClick={() => {
            audio.playClick();
            if (onNavigateToRank) onNavigateToRank();
          }}
        >
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[10px] md:text-[10px] font-bold text-amber-400 uppercase tracking-wider group-hover:text-amber-300 transition-colors">{state.rank}</span>
              <Trophy size={13} className="text-amber-500 md:w-[14px] md:h-[14px] group-hover:scale-110 transition-transform" />
            </div>
            <div className="w-16 xs:w-20 md:w-32 h-1 bg-white/5 rounded-full overflow-hidden flex border border-white/5 shadow-inner relative group-hover:border-primary/30 transition-colors">
              <motion.div
                className="bg-gradient-to-r from-primary to-blue-400 h-full w-full"
                initial={{ width: 0 }}
                animate={{ width: `${getProgress(state.totalXp)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-1.5 md:p-2 bg-primary/10 border border-primary/20 rounded-lg md:rounded-xl min-w-[36px] md:min-w-[48px] group-hover:bg-primary/20 group-hover:border-primary/40 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <span className="text-[8px] md:text-[9px] text-primary font-bold uppercase leading-none mb-1 md:mb-1">Lvl</span>
            <span className="text-sm md:text-base font-black text-textMain leading-none">{state.totalLevel}</span>
          </div>
        </div>
      </div>

    </header>
  );
}

