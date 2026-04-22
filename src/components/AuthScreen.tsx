import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Fingerprint, Loader2, Target, Mail, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Database connection offline.");
      return;
    }
    
    setLoading(true);
    setError('');
    audio.playClick();

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMode('login');
        setError('Clearance granted. Please log in.'); // Actually not an error, just a message
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        audio.playSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!supabase) return;
    setLoading(true);
    audio.playClick();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google Auth failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-primary/30">
      
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-6 sm:p-10 border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 p-[2px] mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <div className="w-full h-full bg-surface rounded-2xl flex items-center justify-center">
                <Target size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-textMain tracking-tight">Quantum OS</h1>
            <p className="text-sm text-primary uppercase tracking-widest font-bold mt-2">Commander Authorization</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">

            <div>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Commander Identity (Email)"
                  required
                  className="w-full bg-surfaceHighlight/50 border border-border rounded-xl py-3 pl-12 pr-4 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-textMuted/50"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Access Code (Password)"
                  required
                  className="w-full bg-surfaceHighlight/50 border border-border rounded-xl py-3 pl-12 pr-12 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-textMuted/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-medium text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold uppercase tracking-widest py-3 mt-4 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center space-x-2 relative z-10">
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Fingerprint size={18} />
                    <span>{mode === 'login' ? 'Initialize' : 'Create Credentials'}</span>
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="relative mt-8 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-surface text-textMuted uppercase tracking-widest">Or authenticate via</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full relative flex items-center justify-center space-x-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail size={18} className="text-white" />
            <span>Google Core Access</span>
          </button>

          <div className="mt-8 text-center">
            <button 
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-xs text-textMuted hover:text-textMain transition-colors"
            >
              {mode === 'login' ? 'Establish New Command Profile' : 'Return to Authorization'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
