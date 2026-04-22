import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { Target, Activity, Flame, ShieldAlert, Zap } from 'lucide-react';
import { Header } from '../components/Header';

const WEIGHT_DATA = [
  { day: 'Day 1', weight: 98.5 },
  { day: 'Day 2', weight: 98.4 },
  { day: 'Day 3', weight: 98.3 },
  { day: 'Day 4', weight: 98.3 },
  { day: 'Day 5', weight: 98.2 },
  { day: 'Day 6', weight: 98.1 },
  { day: 'Today', weight: 98.0 },
];

const EXECUTION_DATA = [
  { name: 'Mon', score: 85 },
  { name: 'Tue', score: 92 },
  { name: 'Wed', score: 78 },
  { name: 'Thu', score: 100 },
  { name: 'Fri', score: 90 },
  { name: 'Sat', score: 95 },
  { name: 'Sun', score: 0 },
];

export function AnalyticsMatrix() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full w-full relative z-10 overflow-hidden"
    >
      <Header />
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-8 space-y-6 scrollbar-none">
        <div className="flex items-center space-x-3 mb-6">
          <Zap className="text-primary" size={28} />
          <h1 className="text-2xl font-bold text-textMain">Analytics Matrix</h1>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
            <Flame className="text-orange-500 mb-2" size={32} />
            <p className="text-3xl font-bold text-textMain">5 Days</p>
            <p className="text-xs text-textMuted uppercase tracking-widest mt-1">Current Streak</p>
          </div>
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
            <Activity className="text-emerald-500 mb-2" size={32} />
            <p className="text-3xl font-bold text-textMain">98.0 kg</p>
            <p className="text-xs text-textMuted uppercase tracking-widest mt-1">Current Mass</p>
          </div>
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="text-blue-500 mb-2" size={32} />
            <p className="text-3xl font-bold text-textMain">4/5</p>
            <p className="text-xs text-textMuted uppercase tracking-widest mt-1">Logic Mastery</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Execution Velocity */}
          <div className="glass-panel p-6 flex flex-col h-[350px]">
            <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center">
              <Target size={18} className="mr-2 text-primary" /> Execution Velocity
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={EXECUTION_DATA}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mass Reduction Trend */}
          <div className="glass-panel p-6 flex flex-col h-[350px]">
            <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center">
              <Activity size={18} className="mr-2 text-emerald-500" /> Mass Reduction Trend
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={WEIGHT_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
