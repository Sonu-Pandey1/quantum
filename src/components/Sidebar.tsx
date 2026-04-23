import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, DatabaseBackup, Check, Target, LogOut, Settings, User, Eye, EyeOff, Briefcase, Activity, ShieldAlert, Zap, BrainCircuit } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isPortfolioMode: boolean;
  onTogglePortfolio: () => void;
  isAdmin?: boolean;
}

// Portal-based dropdown so it escapes any overflow:hidden parent
function ProfileDropdown({
  anchor,
  isOpen,
  onClose,
  isPortfolioMode,
  onTogglePortfolio,
  onNavigate,
  displayName,
  userId,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  isPortfolioMode: boolean;
  onTogglePortfolio: () => void;
  onNavigate: (view: string) => void;
  displayName: string;
  userId: string;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen && anchor.current) {
      setRect(anchor.current.getBoundingClientRect());
    }
  }, [isOpen, anchor]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (anchor.current && !anchor.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Slight delay so the click that opened the menu doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEsc);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, anchor, onClose]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Always open UPWARD so the menu never clips off the bottom of the screen.
  // On desktop: bottom of menu = top of avatar button, opens to the right.
  // On mobile: bottom of menu sits just above the bottom nav bar.
  const getStyle = (): React.CSSProperties => {
    if (!rect) return { position: 'fixed', bottom: isMobile ? 72 : 16, left: 96, zIndex: 99999 };
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, rect.left - 140),
        zIndex: 99999,
      };
    }
    return {
      position: 'fixed',
      // Anchor the BOTTOM of the dropdown to the TOP of the avatar button
      bottom: window.innerHeight - rect.top + 8,
      left: rect.right + 12,
      zIndex: 99999,
    };
  };

  const dropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={getStyle()}
          className="w-52 bg-[#0f111a]/95 backdrop-blur-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.6)] rounded-2xl p-2"
        >
          {/* User info header */}
          <div className="px-3 py-2.5 border-b border-white/8 mb-1.5">
            <p className="text-sm font-bold text-white truncate max-w-full" title={displayName}>
              {displayName}
            </p>
            <p className="text-[10px] text-textMuted font-mono mt-0.5 truncate" title={userId}>
              ID: {userId.substring(0, 12)}...
            </p>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Online
            </p>
          </div>

          {/* Profile Overview */}
          <button
            onClick={() => {
              audio.playClick();
              onNavigate('engagement');
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/8 rounded-xl flex items-center gap-2.5 transition-all duration-150"
          >
            <User size={14} className="text-blue-400 shrink-0" />
            Profile Overview
          </button>

          {/* Portfolio Mode Toggle */}
          <button
            onClick={() => {
              audio.playClick();
              onTogglePortfolio();
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/8 rounded-xl flex items-center gap-2.5 transition-all duration-150"
          >
            {isPortfolioMode ? (
              <EyeOff size={14} className="text-purple-400 shrink-0" />
            ) : (
              <Eye size={14} className="text-emerald-400 shrink-0" />
            )}
            {isPortfolioMode ? 'Exit Portfolio Mode' : 'Enter Portfolio Mode'}
          </button>

          {/* System Settings */}
          <button
            onClick={() => {
              audio.playClick();
              onNavigate('control_room');
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/8 rounded-xl flex items-center gap-2.5 transition-all duration-150"
          >
            <Settings size={14} className="text-amber-400 shrink-0" />
            System Settings
          </button>

          {/* Divider */}
          <div className="my-1.5 border-t border-white/8" />

          {/* Disconnect / Logout */}
          <button
            onClick={async () => {
              audio.playClick();
              onClose();
              if (supabase) {
                await supabase.auth.signOut();
                window.location.reload();
              }
            }}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl flex items-center gap-2.5 transition-all duration-150"
          >
            <LogOut size={14} className="shrink-0" />
            Disconnect
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(dropdown, document.body);
}

export function Sidebar({ currentView, onViewChange, isPortfolioMode, onTogglePortfolio, isAdmin }: SidebarProps) {
  const [userData, setUserData] = useState({ name: 'Commander', id: '—', initials: 'US' });
  const [backupStatus, setBackupStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function loadUser() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const name = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || 'Commander';
        const initials = name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        setUserData({ name, id: session.user.id, initials });
      }
    }
    loadUser();
  }, []);

  const handleBackup = () => {
    setBackupStatus('syncing');
    
    // Create actual backup logic: export data to JSON
    const exportData = async () => {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch user data for backup
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        
        const backup = {
          timestamp: new Date().toISOString(),
          userId: session.user.id,
          profile,
          // You can add more tables here if needed
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quantum_growth_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Backup failed:', err);
      }
    };

    setTimeout(() => {
      exportData();
      setBackupStatus('done');
      setTimeout(() => setBackupStatus('idle'), 3000);
    }, 1500);
  };

  const navItems = [
    { id: 'dashboard', icon: Cpu, label: 'Command' },
    { id: 'practice', icon: BrainCircuit, label: 'Practice' },
    { id: 'vault', icon: Briefcase, label: 'Vault' },
    { id: 'lab', icon: Activity, label: 'The Lab' },
    { id: 'engagement', icon: Zap, label: 'Hub' },
    { id: 'control_room', icon: Settings, label: 'Control Room' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', icon: ShieldAlert, label: 'Admin Panel' });
  }

  return (
    <>
      <motion.aside
        className={cn(
          'fixed z-[100] transition-all duration-500 ease-in-out',
          'bottom-0 left-0 right-0 h-[72px] md:h-auto md:top-4 md:bottom-4 md:left-4 md:w-20',
          'flex flex-row md:flex-col items-center justify-between',
          'bg-[#0a0a0c]/60 backdrop-blur-2xl border-t md:border border-white/5 md:rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-4 md:px-0 md:py-6 overflow-hidden'
        )}
      >


        {/* Nav Links */}
        <nav className="flex-1 flex md:flex-col items-center justify-around md:justify-start w-full md:space-y-2 md:overflow-y-auto md:scrollbar-none md:py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  audio.playClick();
                  onViewChange(item.id);
                }}
                onMouseEnter={() => audio.playClick()}
                className={cn(
                  'relative flex-1 md:flex-none flex flex-col items-center justify-center transition-all duration-300 rounded-xl md:w-14 md:h-14 group',
                  isActive ? 'text-primary' : 'text-textMuted hover:text-textMain'
                )}
              >
                {/* Active Highlight */}
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary/10 rounded-2xl md:rounded-[20px] border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                  />
                )}
                
                {/* Icon Wrapper */}
                <div className={cn(
                  'relative z-10 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300',
                  isActive ? 'scale-110' : 'group-hover:bg-white/5'
                )}>
                  <Icon size={isActive ? 24 : 22} className={cn('transition-all duration-300', isActive && 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]')} />
                </div>

                {/* Mobile Label (optional, hidden here for clean look) */}
                <span className={cn(
                  'text-[8px] uppercase tracking-tighter font-black mt-1 md:hidden transition-all',
                  isActive ? 'opacity-100' : 'opacity-40'
                )}>
                  {item.label}
                </span>

                {/* Desktop Tooltip/Label */}
                <div className="hidden md:block absolute left-full ml-4 px-3 py-1.5 bg-[#0f111a] border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 pointer-events-none translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 shadow-2xl whitespace-nowrap z-[110]">
                  {item.label}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Profile & Settings Area */}
        <div className="flex md:flex-col items-center gap-4 md:gap-6 md:mt-10">
          {/* Backup Icon (Desktop only) */}
          <button
            onClick={() => {
              audio.playClick();
              handleBackup();
            }}
            className={cn(
              'hidden md:flex items-center justify-center w-12 h-12 rounded-2xl transition-all border border-white/5 hover:border-primary/30 group',
              backupStatus === 'syncing' ? 'animate-pulse' : ''
            )}
            title="Export Protocol Data"
          >
            {backupStatus === 'done' ? (
              <Check className="text-emerald-400" size={20} />
            ) : (
              <DatabaseBackup className="text-textMuted group-hover:text-primary transition-colors" size={20} />
            )}
          </button>

          {/* User Avatar */}
          <div className="relative">
            <button
              ref={profileBtnRef}
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="relative p-[2px] rounded-full bg-gradient-to-tr from-primary/50 to-purple-500/50 hover:from-primary hover:to-purple-500 transition-all duration-500 hover:scale-105 active:scale-95 group shadow-lg"
            >
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-surfaceHighlight/80 flex items-center justify-center overflow-hidden border border-white/10">
                <span className="text-[10px] md:text-xs font-black text-textMain group-hover:scale-110 transition-transform">{userData.initials}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0a0a0c] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Portal dropdown — renders outside sidebar so overflow:hidden never clips it */}
      <ProfileDropdown
        anchor={profileBtnRef}
        isOpen={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        isPortfolioMode={isPortfolioMode}
        onTogglePortfolio={onTogglePortfolio}
        onNavigate={onViewChange}
        displayName={userData.name}
        userId={userData.id}
      />
    </>
  );
}
