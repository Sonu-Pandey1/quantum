import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BentoGrid } from './components/BentoGrid';
import { LogicHub } from './pages/LogicHub';
import { ParticleBackground } from './components/ParticleBackground';
import { AnalyticsMatrix } from './pages/AnalyticsMatrix';
import { ControlRoom } from './pages/ControlRoom';
import { PatternDojo } from './pages/PatternDojo';
import { AdminDashboard } from './pages/AdminDashboard';
import { Vault } from './pages/Vault';
import { TheLab } from './pages/TheLab';
import { EngagementHub } from './pages/EngagementHub';
import { supabase } from './lib/supabaseClient';
import { recordLoginToday } from './hooks/useEngagement';
import type { Session } from '@supabase/supabase-js';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { ProgressionProvider } from './hooks/useProgression';
import { LevelUpModal } from './components/LevelUpModal';

function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isPortfolioMode, setIsPortfolioMode] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loginRecordedRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setLoadingAuth(false);
      return;
    }

    const fetchRole = async (userId: string) => {
      try {
        const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
        setIsAdmin(data?.role === 'admin');
      } catch (e) {
        setIsAdmin(false);
      }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchRole(session.user.id);
        if (!loginRecordedRef.current) {
          recordLoginToday(session.user.id);
          loginRecordedRef.current = true;
        }
      }
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchRole(session.user.id);
        if (!loginRecordedRef.current) {
          recordLoginToday(session.user.id);
          loginRecordedRef.current = true;
        }
      } else {
        setIsAdmin(false);
        loginRecordedRef.current = false; // Reset on logout
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loadingAuth) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const needsOnboarding = !session.user.user_metadata?.display_name && !onboardingCompleted;
  const suggestedName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';

  if (needsOnboarding) {
    return <OnboardingScreen initialName={suggestedName} onComplete={() => setOnboardingCompleted(true)} />;
  }

  return (
    <ProgressionProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden font-sans text-textMain selection:bg-primary/30 relative">
        <ParticleBackground />
        <LevelUpModal />
      
      {/* Floating Sidebar */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={(v) => setCurrentView(v as any)} 
        isPortfolioMode={isPortfolioMode}
        onTogglePortfolio={() => setIsPortfolioMode(!isPortfolioMode)}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative z-0 md:ml-24 pb-20 md:pb-0">
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
              <Header />
              <BentoGrid 
                onNavigateToLogic={() => setCurrentView('logic')} 
                onNavigate={(view) => setCurrentView(view)}
                isPortfolioMode={isPortfolioMode}
              />
            </motion.div>
          ) : currentView === 'logic' ? (
            <motion.div 
              key="logic"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden"
            >
              <LogicHub onBack={() => setCurrentView('dashboard')} />
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
          ) : currentView === 'dojo' ? (
            <motion.div 
              key="dojo"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full overflow-hidden bg-background"
            >
              <PatternDojo />
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
              <EngagementHub />
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
          ) : (
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
          )}
        </AnimatePresence>
      </main>
      </div>
    </ProgressionProvider>
  );
}

export default App;
