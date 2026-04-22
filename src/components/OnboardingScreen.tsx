import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { audio } from '../lib/audio';

interface OnboardingScreenProps {
  initialName?: string;
  onComplete: () => void;
}

export function OnboardingScreen({ initialName = '', onComplete }: OnboardingScreenProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display Name is mandatory.');
      return;
    }

    if (!supabase) return;

    setLoading(true);
    setError('');
    audio.playClick();

    try {
      const { data: { user }, error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() }
      });

      if (error) throw error;

      if (user) {
        // Also sync the username and selected role to the profiles table
        await supabase.from('profiles').update({ 
          username: displayName.trim(),
          role: 'user' // Default to user role, admin must be set manually in DB
        }).eq('id', user.id);
      }
      
      audio.playSuccess();
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-primary/30 z-50 fixed inset-0">
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-5 sm:p-8 md:p-10 border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 p-[2px] mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <div className="w-full h-full bg-surface rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-textMain tracking-tight">Profile Required</h2>
            <p className="text-sm text-textMuted mt-2">Please complete your commander profile to proceed.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter Display Name"
                  required
                  className="w-full bg-surfaceHighlight/50 border border-border rounded-xl py-3 pl-12 pr-4 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-textMuted/50"
                />
              </div>
            </div>

            {/* Role selection removed per requirement */}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-medium text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading || !displayName.trim()}
              className="w-full relative group overflow-hidden rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold uppercase tracking-widest py-3 mt-4 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center space-x-2 relative z-10">
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <span>Complete Setup</span>
                )}
              </div>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
