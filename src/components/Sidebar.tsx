import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, DatabaseBackup, Check, Target, LogOut, Settings, User, Eye, EyeOff, Briefcase, Activity, ShieldAlert, Zap, BrainCircuit, Menu, X, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

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

          {/* Strategic Control */}
          <button
            onClick={() => {
              audio.playClick();
              onNavigate('strategic_control');
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/8 rounded-xl flex items-center gap-2.5 transition-all duration-150"
          >
            <Target size={14} className="text-primary shrink-0" />
            Strategic Control
          </button>

          {/* Super Admin Access */}
          {supabase && (
            <button
              onClick={async () => {
                if (!supabase) return;
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                  alert('Session expired. Please log in.');
                  return;
                }
                const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                if (data?.role === 'admin') {
                  audio.playClick();
                  onNavigate('super_admin');
                  onClose();
                } else {
                  toast.error('Administrator privileges required.', {
                    style: { background: '#050508', color: '#fff', border: '1px solid rgba(239, 68, 68, 0.5)' }
                  });
                }
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/8 rounded-xl flex items-center gap-2.5 transition-all duration-150"
            >
              <ShieldAlert size={14} className="text-red-500 shrink-0" />
              Super Admin
            </button>
          )}

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
            System Override (JSON)
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const desktopBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    const exportData = async () => {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const backup = { timestamp: new Date().toISOString(), userId: session.user.id, profile };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quantum_growth_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) { console.error('Backup failed:', err); }
    };
    setTimeout(() => { exportData(); setBackupStatus('done'); setTimeout(() => setBackupStatus('idle'), 3000); }, 1500);
  };

  const navItems = [
    { id: 'dashboard',        icon: Cpu,          label: 'Command'   },
    { id: 'strategic_control',icon: Target,        label: 'Strategy'  },
    { id: 'ai_counsel',       icon: Sparkles,      label: 'AI Counsel' },
    { id: 'practice',         icon: BrainCircuit,  label: 'Practice'  },
    { id: 'vault',            icon: Briefcase,     label: 'Vault'     },
    { id: 'lab',              icon: Activity,      label: 'The Lab'   },
    { id: 'engagement',       icon: Zap,           label: 'Hub'       },
    { id: 'control_room',     icon: Settings,      label: 'System'    },
  ];

  if (isAdmin) navItems.push({ id: 'admin', icon: ShieldAlert, label: 'Admin' });


  return (
    <>
      {/* Desktop Sidebar / Mobile Floating Bar Wrapper */}
      <motion.aside
        className={cn(
          'fixed z-[100] transition-all duration-500 ease-in-out',
          'bottom-4 left-4 right-4 h-[72px] md:h-auto md:top-4 md:bottom-4 md:left-4 md:w-16',
          'bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 rounded-[28px] md:rounded-[24px] shadow-2xl px-2 md:px-0 md:py-8',
          'flex md:flex-col items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
        )}
      >
        <nav className="flex md:flex-col items-center justify-around md:justify-start w-full flex-1 md:space-y-2 md:overflow-y-auto md:scrollbar-none">
          {/* Main Navigation (Desktop) */}
          <div className="hidden md:flex flex-col items-center space-y-4 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { audio.playClick(); onViewChange(item.id); }}
                  className={cn(
                    'relative flex items-center justify-center transition-all duration-300 rounded-2xl w-14 h-14 group overflow-hidden',
                    isActive ? 'text-primary' : 'text-textMuted hover:text-textMain hover:bg-white/5'
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active" 
                      className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-2xl shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon size={isActive ? 24 : 22} className={cn('relative z-10 transition-all duration-300', isActive && 'drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]')} />
                  
                  {/* Tooltip */}
                  <div className="absolute left-full ml-4 px-3 py-2 bg-surfaceHighlight border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-textMain opacity-0 group-hover:opacity-100 pointer-events-none translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 shadow-2xl whitespace-nowrap z-[110] backdrop-blur-xl">
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Mobile Navigation (Bottom Bar) */}
          <div className="flex md:hidden w-full items-center h-full overflow-hidden">
            <div className="flex-1 flex items-center px-4 h-full overflow-x-auto no-scrollbar space-x-1 scroll-smooth">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { audio.playClick(); onViewChange(item.id); }}
                    className={cn(
                      'relative flex flex-col items-center justify-center transition-all duration-300 rounded-xl min-w-[75px] h-14 shrink-0',
                      isActive ? 'text-primary' : 'text-textMuted'
                    )}
                  >
                    {isActive && (
                      <motion.div layoutId="mobile-active" className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20" />
                    )}
                    <Icon size={22} className={cn('relative z-10 transition-all', isActive && 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]')} />
                    <span className="relative z-10 text-[9px] uppercase tracking-tighter font-black mt-1 whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
              <div className="min-w-[10px] h-1 shrink-0" /> {/* Spacer */}
            </div>

            {/* Fixed Menu Button on Right */}
            <div className="shrink-0 h-full flex items-center px-4 bg-white/5 backdrop-blur-xl border-l border-white/10 rounded-r-[28px]">
              <button
                onClick={() => { audio.playClick(); setIsMobileMenuOpen(true); }}
                className="relative flex flex-col items-center justify-center min-w-[60px] h-12"
              >
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  <Menu size={20} className="text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0a0c] shadow-lg shadow-emerald-500/20" />
              </button>
            </div>
          </div>
        </nav>

        {/* Desktop Profile Area */}
        <div className="hidden md:flex flex-col items-center gap-6 mt-auto pb-2">
          <button onClick={() => { audio.playClick(); handleBackup(); }} className={cn('flex items-center justify-center w-12 h-12 rounded-2xl border border-white/5 hover:border-primary/30 group', backupStatus === 'syncing' && 'animate-pulse')}>
            {backupStatus === 'done' ? <Check className="text-emerald-400" size={20} /> : <DatabaseBackup className="text-textMuted group-hover:text-primary transition-colors" size={20} />}
          </button>
          <button ref={desktopBtnRef} onClick={() => setShowProfileMenu(!showProfileMenu)} className="relative p-[2px] rounded-full bg-gradient-to-tr from-primary/50 to-purple-500/50 hover:scale-105 active:scale-95 group shadow-lg">
            <div className="w-11 h-11 rounded-full bg-surfaceHighlight/80 flex items-center justify-center border border-white/10">
              <span className="text-xs font-black text-textMain">{userData.initials}</span>
            </div>
          </button>
        </div>
      </motion.aside>

      {/* Mobile Sliding Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] md:hidden"
            />
            <motion.div
              key="sidebar-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[300px] bg-[#0a0a0c] border-l border-white/10 z-[95] md:hidden flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 pt-12 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-sm font-black text-primary">{userData.initials}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-textMain leading-tight">{userData.name}</h3>
                    <p className="text-[9px] text-textMuted uppercase tracking-widest font-black opacity-60">System Admin</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-textMuted hover:text-primary transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 pb-40 md:pb-24 scrollbar-default">
                {/* Account Section */}
                <div className="space-y-3">
                  <p className="text-[10px] text-textMuted uppercase tracking-widest font-black mb-1 opacity-40">Command & Control</p>
                  <motion.button
                    key="btn-neural"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => { audio.playClick(); onViewChange('engagement'); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-textMain hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <User size={18} className="text-blue-400" />
                    </div>
                    <span className="font-bold text-sm">Neural Overview</span>
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => { audio.playClick(); onTogglePortfolio(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-textMain hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", isPortfolioMode ? 'bg-purple-500/10' : 'bg-emerald-500/10')}>
                      {isPortfolioMode ? <EyeOff size={18} className="text-purple-400" /> : <Eye size={18} className="text-emerald-400" />}
                    </div>
                    <span className="font-bold text-sm">{isPortfolioMode ? 'Exit Portfolio' : 'Portfolio Interface'}</span>
                  </motion.button>
                </div>

                {/* Navigation Section */}
                <div className="space-y-3">
                  <p className="text-[10px] text-textMuted uppercase tracking-widest font-black mb-1 opacity-40">Protocols</p>
                  {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <motion.button
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                        key={item.id}
                        onClick={() => { audio.playClick(); onViewChange(item.id); setIsMobileMenuOpen(false); }}
                        className={cn(
                          'w-full flex items-center space-x-4 p-4 rounded-2xl transition-all border',
                          isActive 
                            ? 'bg-primary/10 border-primary/30 text-primary' 
                            : 'bg-white/[0.03] border-white/5 text-textMuted hover:border-primary/20 hover:text-textMain'
                        )}
                      >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", isActive ? 'bg-primary/20' : 'bg-white/5')}>
                          <Icon size={18} />
                        </div>
                        <span className="font-bold text-sm">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* System Section */}
                <div className="space-y-3 pt-6 border-t border-white/10">
                  <p className="text-[10px] text-textMuted uppercase tracking-widest font-black mb-1 opacity-40">Emergency Protocol</p>
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => { audio.playClick(); handleBackup(); }}
                    className="w-full flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-textMuted text-xs font-bold hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <DatabaseBackup size={16} />
                      <span>Sync Data Cloud</span>
                    </div>
                    {backupStatus === 'done' && <Check size={14} className="text-emerald-400" />}
                  </motion.button>
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    onClick={async () => { if (supabase) await supabase.auth.signOut(); window.location.reload(); }}
                    className="w-full flex items-center space-x-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                  >
                    <LogOut size={16} />
                    <span>Terminate Link</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Profile Portal */}
      {!isMobileView && (
        <ProfileDropdown
          anchor={desktopBtnRef}
          isOpen={showProfileMenu}
          onClose={() => setShowProfileMenu(false)}
          isPortfolioMode={isPortfolioMode}
          onTogglePortfolio={onTogglePortfolio}
          onNavigate={onViewChange}
          displayName={userData.name}
          userId={userData.id}
        />
      )}
    </>
  );
}
