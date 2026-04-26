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
                const { data } = await supabase.from('profiles').select('role').single();
                if (data?.role === 'admin') {
                  audio.playClick();
                  onNavigate('super_admin');
                  onClose();
                } else {
                  alert('Administrator privileges required.');
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
  const mobileBtnRef = useRef<HTMLButtonElement>(null);

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
    { id: 'dashboard', icon: Cpu, label: 'Command' },
    { id: 'strategic_control', icon: Target, label: 'Strategy' },
    { id: 'practice', icon: BrainCircuit, label: 'Practice' },
    { id: 'vault', icon: Briefcase, label: 'Vault' },
    { id: 'lab', icon: Activity, label: 'The Lab' },
    { id: 'engagement', icon: Zap, label: 'Hub' },
    { id: 'control_room', icon: Settings, label: 'System' },
  ];

  if (isAdmin) navItems.push({ id: 'admin', icon: ShieldAlert, label: 'Admin' });


  return (
    <>
      {/* Desktop Sidebar / Mobile Floating Bar Wrapper */}
      <motion.aside
        className={cn(
          'fixed z-[100] transition-all duration-500 ease-in-out',
          'bottom-0 left-0 right-0 h-[72px] md:h-auto md:top-4 md:bottom-4 md:left-4 md:w-20',
          'bg-[#0a0a0c]/80 backdrop-blur-3xl border-t md:border border-white/10 md:rounded-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.4)] md:shadow-2xl px-2 md:px-0 md:py-6',
          'md:flex md:flex-col md:items-center'
        )}
      >
        <nav className="flex md:flex-col items-center justify-around md:justify-start w-full flex-1 md:space-y-2 md:overflow-y-auto md:scrollbar-none">
          {/* Main Navigation (Desktop) */}
          <div className="hidden md:flex flex-col items-center space-y-2 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { audio.playClick(); onViewChange(item.id); }}
                  className={cn(
                    'relative flex items-center justify-center transition-all duration-300 rounded-xl w-14 h-14 group',
                    isActive ? 'text-primary' : 'text-textMuted hover:text-textMain'
                  )}
                >
                  <Icon size={isActive ? 24 : 22} className={cn('relative z-10 transition-all duration-300', isActive && 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]')} />
                  {isActive && (
                    <motion.div layoutId="sidebar-active" className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20 z-0" />
                  )}
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#0f111a] border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 pointer-events-none translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 shadow-2xl whitespace-nowrap z-[110]">
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>          {/* Mobile Navigation (Bottom Bar) */}
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

            {/* Mobile Profile Avatar (Fixed on Right) */}
            <div className="shrink-0 h-full flex items-center px-3 bg-[#0a0a0c]/40 backdrop-blur-md border-l border-white/5 shadow-[-10px_0_20px_rgba(0,0,0,0.2)]">
              <button 
                ref={mobileBtnRef} 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="relative flex flex-col items-center justify-center min-w-[65px] h-14"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/50 to-purple-500/50 p-[1.5px] shadow-lg">
                  <div className="w-full h-full rounded-full bg-surfaceHighlight/80 flex items-center justify-center border border-white/10">
                    <span className="text-[10px] font-black text-textMain">{userData.initials}</span>
                  </div>
                </div>
                <span className="text-[9px] uppercase tracking-tighter font-black mt-1 text-textMuted">Account</span>
                <div className="absolute top-3 right-4 w-2 h-2 rounded-full bg-emerald-500 border border-[#0a0a0c]" />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[280px] bg-[#0a0a0c] border-l border-white/10 z-[95] md:hidden flex flex-col p-6 pt-24"
            >
              <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-white/10">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-xl font-black text-primary">{userData.initials}</span>
                </div>
                <div>
                  <h3 className="font-bold text-textMain">{userData.name}</h3>
                  <p className="text-[10px] text-textMuted uppercase tracking-widest">Protocol Commander</p>
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                <p className="text-[10px] text-textMuted uppercase tracking-widest font-bold mb-4 opacity-50">Operational Hub</p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { audio.playClick(); onViewChange(item.id); setIsMobileMenuOpen(false); }}
                      className={cn(
                        'w-full flex items-center space-x-4 p-4 rounded-2xl transition-all border',
                        isActive 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-white/5 border-transparent text-textMuted'
                      )}
                    >
                      <Icon size={18} />
                      <span className="font-bold text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto space-y-3 pt-6 border-t border-white/10">
                <button 
                  onClick={() => { audio.playClick(); handleBackup(); }}
                  className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 text-textMuted text-xs font-bold"
                >
                  <div className="flex items-center space-x-3">
                    <DatabaseBackup size={16} />
                    <span>Export Protocol Data</span>
                  </div>
                  {backupStatus === 'done' && <Check size={14} className="text-emerald-400" />}
                </button>
                <button 
                  onClick={async () => { if (supabase) await supabase.auth.signOut(); window.location.reload(); }}
                  className="w-full flex items-center space-x-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400 text-xs font-bold"
                >
                  <LogOut size={16} />
                  <span>Disconnect Link</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Profile Portal */}
      <ProfileDropdown
        anchor={isMobileView ? mobileBtnRef : desktopBtnRef}
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
