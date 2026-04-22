import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Plus, Wallet } from 'lucide-react';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabaseClient';

interface Investment {
  id: string;
  title: string;
  amount: number;
}

export function LedgerCard({ onClick }: { onClick?: () => void }) {
  const currentIncome = 14000;
  const targetIncome = 50000;
  const progress = (currentIncome / targetIncome) * 100;

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');

  useEffect(() => {
    const loadInvestments = async () => {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('investments')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (data && data.length > 0) {
            setInvestments(data.map(d => ({
              id: d.id,
              title: d.description,
              amount: d.amount,
              date: new Date(d.created_at).toISOString().split('T')[0]
            })));
            return;
          }
        } catch (e) {
          console.error("Supabase sync failed, falling back to local.");
        }
      }
      // Fallback
      const saved = localStorage.getItem('quantum_investments');
      if (saved) {
        setInvestments(JSON.parse(saved));
      }
    };
    
    loadInvestments();
  }, []);

  const handleAddInvestment = async () => {
    if (!newTitle || !newAmount) return;
    audio.playSuccess();
    
    const investment: Investment = {
      id: Date.now().toString(),
      title: newTitle,
      amount: Number(newAmount),
    };

    const updated = [investment, ...investments];
    setInvestments(updated);
    
    // Local fallback
    localStorage.setItem('quantum_investments', JSON.stringify(updated));

    // Supabase sync
    if (supabase) {
      try {
        await supabase.from('investments').insert([{
          description: investment.title,
          amount: investment.amount
        }]);
      } catch (e) {
        console.error("Failed to sync investment.");
      }
    }

    setNewTitle('');
    setNewAmount('');
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div 
      onClick={onClick}
      className={`glass-panel col-span-1 md:col-span-2 lg:col-span-3 p-6 flex flex-col hover:border-primary/50 transition-colors group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      
      {/* Background glow */}
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-lg">
            <Wallet className="text-emerald-500" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-textMain">The Ledger</h2>
            <p className="text-xs text-textMuted mt-1">Financial Growth System</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-textMuted mb-1">Target Income</p>
          <p className="text-lg font-bold text-textMain">{formatCurrency(targetIncome)} <span className="text-xs text-textMuted font-normal">/mo</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        
        {/* Income Progress & Forecast */}
        <div className="flex flex-col justify-center">
          <h3 className="text-4xl font-bold text-textMain mb-2">{formatCurrency(currentIncome)}</h3>
          <p className="text-sm text-emerald-500 mb-4 flex items-center">
            <TrendingUp size={14} className="mr-1" /> Core Engine Active
          </p>
          
          <div className="w-full bg-surfaceHighlight rounded-full h-3 mb-2 overflow-hidden shadow-inner">
            <motion.div 
              className="bg-emerald-500 h-3 rounded-full relative shadow-[0_0_10px_rgba(16,185,129,0.6)]" 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/40 animate-pulse" />
            </motion.div>
          </div>
          <div className="flex justify-between text-xs text-textMuted font-medium mb-6">
            <span>Current Base</span>
            <span>{Math.floor(progress)}% to Target</span>
          </div>

          {/* Wealth Forecast Chart */}
          <div className="mt-auto">
            <h4 className="text-xs font-semibold text-textMuted uppercase tracking-widest mb-2">12-Month Forecast</h4>
            <div className="h-16 w-full relative flex items-end border-b border-l border-border/50 pb-1 pl-1">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(16,185,129,0.4)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="none"
                  stroke="rgb(16,185,129)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,80 10,75 20,60 30,58 40,40 50,42 60,20 70,25 80,10 90,5 100,0"
                  className="drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]"
                />
                <polygon
                  fill="url(#wealthGrad)"
                  points="0,100 0,80 10,75 20,60 30,58 40,40 50,42 60,20 70,25 80,10 90,5 100,0 100,100"
                />
              </svg>
              <div className="absolute inset-0 flex justify-between items-end text-[9px] text-textMuted pt-1 pointer-events-none -bottom-4">
                <span>Month 1</span>
                <span>Target (50k)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skill Investment Log */}
        <div className="flex flex-col border-l border-border pl-8">
          <h4 className="text-sm font-semibold text-textMain mb-3">Skill Investment Log</h4>
          
          <div className="flex space-x-2 mb-4">
            <input 
              type="text" 
              placeholder="Course / Tool" 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-textMain focus:border-emerald-500 outline-none transition-colors"
            />
            <input 
              type="number" 
              placeholder="₹ Amount" 
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-24 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-textMain focus:border-emerald-500 outline-none transition-colors"
            />
            <button 
              onClick={handleAddInvestment}
              onMouseEnter={() => audio.playClick()}
              className="p-2 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-2 max-h-24 scrollbar-thin scrollbar-thumb-surfaceHighlight scrollbar-track-transparent">
            {investments.length === 0 ? (
              <p className="text-xs text-textMuted italic">No investments logged yet. Invest in your growth.</p>
            ) : (
              investments.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center p-2 rounded-md bg-surfaceHighlight/50 border border-border/50 text-sm">
                  <span className="text-textMain truncate mr-2">{inv.title}</span>
                  <span className="text-emerald-400 font-medium whitespace-nowrap">{formatCurrency(inv.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
