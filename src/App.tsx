
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BentoGrid } from './components/BentoGrid';
import { PracticeHub } from './pages/PracticeHub';
import { RankAndRewards } from './pages/RankAndRewards';
import { ParticleBackground } from './components/ParticleBackground';
import { AnalyticsMatrix } from './pages/AnalyticsMatrix';
import { ControlRoom } from './pages/ControlRoom';
import { AdminDashboard } from './pages/AdminDashboard';
import { Vault } from './pages/Vault';
import { TheLab } from './pages/TheLab';
import { EngagementHub } from './pages/EngagementHub';
import { Onboarding } from './pages/Onboarding';
import { SuperAdmin } from './pages/SuperAdmin';
import { StrategicControl } from './pages/StrategicControl';
import { AiCounsel } from './pages/AiCounsel';
import { supabase } from './lib/supabaseClient';
import { recordLoginToday } from './hooks/useEngagement';
import type { Session } from '@supabase/supabase-js';
import { AuthScreen } from './components/AuthScreen';
import { ProgressionProvider, useProgression } from './hooks/useProgression';
import { LevelUpModal } from './components/LevelUpModal';
import { Toaster } from 'react-hot-toast';


class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error('App Crash:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-black text-textMain mb-2 uppercase tracking-tighter">Neural Link Interrupted</h2>
          <p className="text-xs text-textMuted max-w-xs mb-8">A critical error occurred in the system core. Authorization state may be inconsistent.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all"
          >
            Re-establish Link
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent({ currentView, setCurrentView, isPortfolioMode, setIsPortfolioMode, isAdmin }: any) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans text-textMain selection:bg-primary/30 relative">
      <ParticleBackground />
      <LevelUpModal />
    
      <Sidebar 
        currentView={currentView} 
        onViewChange={(v: string) => setCurrentView(v)} 
        isPortfolioMode={isPortfolioMode}
        onTogglePortfolio={() => setIsPortfolioMode(!isPortfolioMode)}
        isAdmin={isAdmin}
      />

      <main className="flex-1 flex flex-col h-full relative z-0 md:ml-[88px] pb-[80px] md:pb-0 overflow-hidden">
        <Header 
          hideVow={currentView !== 'dashboard'} 
          onNavigateToRank={() => setCurrentView('rank')} 
          onNavigateToDashboard={() => setCurrentView('dashboard')}
        />
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <BentoGrid 
                onNavigateToLogic={() => setCurrentView('practice')} 
                onNavigate={(view: string) => setCurrentView(view === 'logic' || view === 'dojo' ? 'practice' : view)}
                isPortfolioMode={isPortfolioMode}
              />
            </motion.div>
          ) : currentView === 'practice' ? (
            <motion.div 
              key="practice"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden"
            >
              <PracticeHub onBack={() => setCurrentView('dashboard')} />
            </motion.div>
          ) : currentView === 'ai_counsel' ? (
            <motion.div 
              key="ai_counsel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <AiCounsel />
            </motion.div>
          ) : currentView === 'control_room' ? (
            <motion.div 
              key="control_room"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <ControlRoom />
            </motion.div>
          ) : currentView === 'analytics' ? (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <AnalyticsMatrix />
            </motion.div>
          ) : currentView === 'engagement' ? (
            <motion.div 
              key="engagement"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <EngagementHub onNavigateToRank={() => setCurrentView('rank')} />
            </motion.div>
          ) : currentView === 'admin' ? (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <AdminDashboard />
            </motion.div>
          ) : currentView === 'vault' ? (
            <motion.div 
              key="vault"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <Vault />
            </motion.div>
          ) : currentView === 'lab' ? (
            <motion.div 
              key="lab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <TheLab />
            </motion.div>
          ) : currentView === 'super_admin' ? (
            <motion.div 
              key="super_admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <SuperAdmin />
            </motion.div>
          ) : currentView === 'rank' ? (
            <motion.div 
              key="rank"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background overflow-y-auto"
            >
              <RankAndRewards />
            </motion.div>
          ) : (
            <motion.div 
              key="strategic_control"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <StrategicControl />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AppContainer() {
  const { state, loading } = useProgression();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isPortfolioMode, setIsPortfolioMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { role } = state;

  useEffect(() => {
    setIsAdmin(role === 'admin');
  }, [role]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'emerald') {
      root.style.setProperty('--color-primary', '16 185 129'); // #10b981
      root.style.setProperty('--color-primary-hover', '52 211 153'); // #34d399
    } else if (state.theme === 'purple') {
      root.style.setProperty('--color-primary', '139 92 246'); // #8b5cf6
      root.style.setProperty('--color-primary-hover', '167 139 250'); // #a78bfa
    } else if (state.theme === 'gold') {
      root.style.setProperty('--color-primary', '234 179 8'); // #eab308
      root.style.setProperty('--color-primary-hover', '250 204 21'); // #facc15
    } else {
      root.style.setProperty('--color-primary', '59 130 246'); // #3b82f6
      root.style.setProperty('--color-primary-hover', '96 165 250'); // #60a5fa
    }
  }, [state.theme]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validViews = ['dashboard', 'practice', 'control_room', 'dojo', 'analytics', 'engagement', 'admin', 'vault', 'lab', 'super_admin', 'strategic_control', 'ai_counsel'];
      if (hash && (validViews.includes(hash) || hash === 'logic')) {
        setCurrentView(hash === 'logic' || hash === 'dojo' ? 'practice' : hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    if (window.location.hash) handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash !== `#${currentView}`) {
      window.location.hash = currentView;
    }
  }, [currentView]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-8 space-y-8 text-white">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] text-textMuted uppercase tracking-[0.3em] font-black">Syncing Neural Identity...</p>
      </div>
    );
  }

  if (!state.onboardingCompleted) {
    return <Onboarding onComplete={() => {}} />;
  }

  return (
    <AppContent 
      currentView={currentView} 
      setCurrentView={setCurrentView}
      isPortfolioMode={isPortfolioMode}
      setIsPortfolioMode={setIsPortfolioMode}
      isAdmin={isAdmin}
    />
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const loginRecordedRef = useRef(false);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setSupabaseConfigured(false);
      setLoadingAuth(false);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && !loginRecordedRef.current) {
        recordLoginToday(session.user.id);
        loginRecordedRef.current = true;
      }
      setLoadingAuth(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        if (!loginRecordedRef.current) {
          recordLoginToday(session.user.id);
          loginRecordedRef.current = true;
        }
      } else {
        loginRecordedRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loadingAuth) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-8 space-y-8">
        <div className="flex items-center space-x-4 animate-pulse">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl border border-primary/20" />
          <div className="space-y-2">
            <div className="h-4 w-48 bg-white/10 rounded-full" />
            <div className="h-2 w-32 bg-white/5 rounded-full" />
          </div>
        </div>
        <p className="text-[10px] text-textMuted uppercase tracking-[0.3em] font-black text-center">Initializing Neural Link</p>
      </div>
    );
  }

  if (!supabaseConfigured) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-8 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-black text-textMain tracking-tighter uppercase">Configuration Required</h2>
        <p className="text-sm text-textMuted max-w-md">
          Supabase environment variables are missing. Please configure <code className="bg-white/10 px-2 py-1 rounded">.env.local</code> with your Supabase URL and Anon Key to initialize the application.
        </p>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <ProgressionProvider key={session.user.id}>
      <AppContainer />
    </ProgressionProvider>
  );
}

export default function Root() {
  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <App />
    </ErrorBoundary>
  );
}
