import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, TrendingUp, DollarSign, Wallet, 
  BarChart3, PieChart, ShieldCheck, ArrowUpRight, 
  Zap, Lock, Plus, Trash2, X, ArrowDownRight
} from 'lucide-react';
import { useProgression, type Pillar } from '../hooks/useProgression';
import { audio } from '../lib/audio';
import toast from 'react-hot-toast';

export interface LedgerEntry {
  id: string;
  title: string;
  amount: number;
  type: 'investment' | 'income' | 'expense' | 'asset';
  pillar: Pillar;
  date: string;
}

const DEFAULT_ENTRIES: LedgerEntry[] = [
  { id: 'v-1', title: 'SAP BTP & Full-Stack Cert Prep', amount: 3500, type: 'investment', pillar: 'Study', date: '2026-10-10' },
  { id: 'v-2', title: 'Index Fund SIP Investment', amount: 5000, type: 'asset', pillar: 'Finance', date: '2026-10-12' },
  { id: 'v-3', title: 'Freelance Software Consultation', amount: 15000, type: 'income', pillar: 'Finance', date: '2026-10-14' },
];

export function Vault() {
  const { state, addXp } = useProgression();
  const { xp, level, displayName } = state;
  const uid = displayName || 'operator';

  // ── Financial Ledger State ──────────────────────────────────────────
  const storageKey = `quantum_vault_ledger_${uid}`;
  const [entries, setEntries] = useState<LedgerEntry[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    // Check legacy investments key
    const legacy = localStorage.getItem(`quantum_investments_${uid}`);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEFAULT_ENTRIES;
  });

  // Persist locally & sync
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(entries));
    localStorage.setItem(`quantum_investments_${uid}`, JSON.stringify(entries));
  }, [entries, storageKey, uid]);

  // Compute live financial totals
  const financials = useMemo(() => {
    let totalInvestments = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalAssets = 0;

    entries.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'investment') totalInvestments += amt;
      else if (e.type === 'income') totalIncome += amt;
      else if (e.type === 'expense') totalExpenses += amt;
      else if (e.type === 'asset') totalAssets += amt;
    });

    const netWorth = (totalIncome + totalAssets + totalInvestments) - totalExpenses;
    const cashReserve = Math.max(0, totalIncome - totalExpenses);

    return {
      totalInvestments,
      totalIncome,
      totalExpenses,
      totalAssets,
      netWorth: Math.max(0, netWorth),
      cashReserve,
    };
  }, [entries]);

  // ── Modal State: Add Transaction ────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mAmount, setMAmount] = useState('');
  const [mType, setMType] = useState<'investment' | 'income' | 'expense' | 'asset'>('investment');
  const [mPillar, setMPillar] = useState<Pillar>('Finance');

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(mAmount);
    if (!mTitle.trim() || isNaN(val) || val <= 0) {
      toast.error('Please enter a valid title and positive amount');
      return;
    }

    audio.playSuccess();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const newEntry: LedgerEntry = {
      id: `v-${Date.now()}`,
      title: mTitle.trim(),
      amount: val,
      type: mType,
      pillar: mPillar,
      date: dateStr,
    };

    setEntries(prev => [newEntry, ...prev]);

    // Award Finance XP on wealth investments
    if (mType === 'investment' || mType === 'asset') {
      const xpGained = Math.min(100, Math.max(20, Math.round(val / 100)));
      await addXp(mPillar, `Vault: Logged ${mTitle.trim()}`, xpGained);
      toast.success(`🎉 Asset Logged! +${xpGained} ${mPillar} XP`);
    } else {
      toast.success('Transaction Recorded in Ledger');
    }

    setMTitle('');
    setMAmount('');
    setIsModalOpen(false);
  };

  const handleDeleteEntry = (id: string) => {
    audio.playClick();
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entry removed');
  };

  const blueprints = [
    { id: 'tax', title: 'Tax Optimization Protocol', level: 5, icon: <ShieldCheck size={18} /> },
    { id: 'emergency', title: 'Emergency Reserve Setup', level: 2, icon: <ShieldCheck size={18} /> },
    { id: 'growth', title: 'Aggressive Growth Portfolio', level: 10, icon: <TrendingUp size={18} /> },
  ];

  const multiplier = (1 + (level.Finance * 0.1)).toFixed(1);

  return (
    <div className="flex-1 h-full flex flex-col p-4 md:p-8 overflow-y-auto scrollbar-none bg-background/50 space-y-6 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
            <Briefcase size={28} className="text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-textMain tracking-tighter">THE VAULT</h1>
            <p className="text-xs md:text-sm text-textMuted font-medium">Financial Command, Ledger & Wealth Architecture</p>
          </div>
        </div>

        <button
          onClick={() => {
            audio.playClick();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-yellow-500 text-black font-black text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Log Transaction</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 md:p-8 border border-yellow-500/20 rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign size={120} className="text-yellow-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <h2 className="text-xs font-black text-yellow-500 uppercase tracking-[0.2em]">Net Worth & Assets</h2>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl md:text-5xl font-black text-textMain tracking-tighter">
                ₹{financials.netWorth.toLocaleString()}
              </span>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Finance Pillar</p>
                <p className="text-sm font-mono text-textMain">Lv.{level.Finance} <span className="text-textMuted text-xs">({xp.Finance} XP)</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Archetype Rank</p>
                <p className="text-xs font-bold text-yellow-500 uppercase">{level.Finance >= 10 ? 'Magnate' : level.Finance >= 5 ? 'Strategist' : 'Saver'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bento KPI Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="glass-panel p-5 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Wallet size={18} />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Liquid Reserves</span>
            </div>
            <div>
              <p className="text-2xl font-black text-textMain">₹{financials.cashReserve.toLocaleString()}</p>
              <p className="text-[10px] text-textMuted mt-1">Cash flow balance (Income - Expenses)</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="glass-panel p-5 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <TrendingUp size={18} />
              </div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Invested Capital</span>
            </div>
            <div>
              <p className="text-2xl font-black text-textMain">₹{financials.totalInvestments.toLocaleString()}</p>
              <p className="text-[10px] text-textMuted mt-1">Cumulative skill & financial investments</p>
            </div>
          </motion.div>

          <motion.div 
            className="glass-panel p-5 border border-white/5 bg-white/[0.02] rounded-2xl md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 shrink-0">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-textMain uppercase tracking-wider">Asset Distribution</h3>
                <p className="text-[10px] text-textMuted">Live Ledger Balance</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-[9px] text-emerald-400 font-bold uppercase block">Income</span>
                <span className="text-sm font-black text-textMain">₹{financials.totalIncome.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-red-400 font-bold uppercase block">Expenses</span>
                <span className="text-sm font-black text-textMain">₹{financials.totalExpenses.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-blue-400 font-bold uppercase block">Assets</span>
                <span className="text-sm font-black text-textMain">₹{financials.totalAssets.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* The Compounding Protocol */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-6 md:p-8 border border-white/5 bg-black/40 rounded-3xl relative overflow-hidden h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-textMain flex items-center">
                  <Zap size={18} className="mr-2 text-yellow-500" /> The Compounding Protocol
                </h3>
                <p className="text-xs text-textMuted mt-0.5">Projecting total system capital over time</p>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                <ArrowUpRight size={14} className="text-yellow-500" />
                <span className="text-[10px] font-bold text-yellow-500 uppercase">+12.4% Annualized</span>
              </div>
            </div>
            
            <div className="relative h-40 flex items-end justify-between px-2 pb-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${20 + (i * i * 0.75)}%` }}
                  transition={{ delay: i * 0.05 }}
                  className="w-6 sm:w-10 bg-gradient-to-t from-yellow-500/10 to-yellow-500/40 rounded-t-lg relative group"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                    Yr {i + 1}
                  </div>
                </motion.div>
              ))}
              <div className="absolute inset-0 border-b border-white/10" />
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <div className="text-[9px] font-black text-textMuted uppercase mb-0.5">Horizon</div>
                <div className="text-sm font-mono text-textMain font-bold">15 Years</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <div className="text-[9px] font-black text-textMuted uppercase mb-0.5">Mastery Multiplier</div>
                <div className="text-sm font-mono text-textMain font-bold">x{multiplier}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <div className="text-[9px] font-black text-textMuted uppercase mb-0.5">Projected Net</div>
                <div className="text-sm font-mono text-yellow-500 font-bold">
                  ₹{Math.round(Math.max(100000, financials.netWorth * 4.2)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Blueprints */}
        <div>
          <div className="glass-panel p-6 border border-white/5 bg-white/[0.01] rounded-3xl h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <PieChart size={18} className="text-textMuted" />
                <h3 className="text-xs font-black text-textMain uppercase tracking-widest">Financial Blueprints</h3>
              </div>
              <div className="space-y-2.5">
                {blueprints.map((bp) => {
                  const isLocked = level.Finance < bp.level;
                  return (
                    <div
                      key={bp.id}
                      className={`w-full p-3.5 rounded-2xl border transition-all text-left relative ${
                        isLocked 
                          ? 'bg-black/20 border-white/5 opacity-50' 
                          : 'bg-white/[0.03] border-white/10 hover:border-yellow-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-1.5 rounded-lg ${isLocked ? 'bg-white/5 text-textMuted' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {isLocked ? <Lock size={14} /> : bp.icon}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${isLocked ? 'text-textMuted' : 'text-textMain'}`}>{bp.title}</p>
                            <p className="text-[8px] font-black text-textMuted uppercase tracking-widest">Requires Level {bp.level}</p>
                          </div>
                        </div>
                        {!isLocked && <span className="text-[9px] text-emerald-400 font-bold uppercase">Active</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 text-center">
              <p className="text-[9px] text-yellow-500/70 font-medium leading-relaxed italic">
                "Technical mastery is the ultimate hedge against inflation."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real Financial & Asset Ledger Table */}
      <div className="glass-panel p-6 border border-white/5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-textMain uppercase tracking-widest flex items-center gap-2">
            <Briefcase size={16} className="text-yellow-500" />
            <span>Financial Transaction Ledger ({entries.length})</span>
          </h3>
          <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full uppercase">
            Live Synchronized
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center text-textMuted text-xs bg-background/40 rounded-2xl border border-white/5">
            No transactions logged yet. Click <span className="text-yellow-500 font-bold">"+ Log Transaction"</span> above to start tracking assets!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 rounded-2xl bg-background/60 border border-white/5 space-y-2 hover:border-yellow-500/20 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-yellow-500 tracking-wider">
                      {entry.pillar} • {entry.type}
                    </span>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-red-400 p-1 transition-opacity"
                      title="Delete Entry"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-textMain truncate">{entry.title}</h4>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className={`text-sm font-mono font-black flex items-center gap-0.5 ${
                      entry.type === 'expense' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {entry.type === 'expense' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      ₹{entry.amount.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold text-textMuted">{entry.date}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal: Add Transaction */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12141e] border border-white/20 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Log Financial Entry</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Entry Title</label>
                  <input
                    type="text"
                    value={mTitle}
                    onChange={e => setMTitle(e.target.value)}
                    placeholder="e.g., SAP Cert Preparation / Freelance Milestone"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-yellow-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={mAmount}
                      onChange={e => setMAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-yellow-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Transaction Type</label>
                    <select
                      value={mType}
                      onChange={e => setMType(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                    >
                      <option value="investment">Investment (Asset)</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="asset">Equity / Asset</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted block mb-1">Target Pillar</label>
                  <select
                    value={mPillar}
                    onChange={e => setMPillar(e.target.value as Pillar)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Finance">Finance</option>
                    <option value="Study">Study</option>
                    <option value="Health">Health</option>
                    <option value="Mind">Mind</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-textMuted text-xs font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-yellow-500 text-black text-xs font-black uppercase shadow-lg shadow-yellow-500/20"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Vault;
