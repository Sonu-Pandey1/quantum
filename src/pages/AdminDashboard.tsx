import { useState, useEffect } from 'react';
import { ShieldAlert, Users, ListPlus, Terminal } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface UserProfile {
  id: string;
  username: string | null;
  role: 'user' | 'admin';
  total_xp: number;
  streak_count: number;
}

export function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (supabase) {
      supabase.from('profiles').select('*').then(({ data }) => {
        if (data) setUsers(data as UserProfile[]);
      });
    }
  }, []);



  return (
    <div className="flex-1 h-full flex flex-col p-8 overflow-y-auto">
      <div className="mb-8 flex items-center space-x-3">
        <ShieldAlert size={32} className="text-red-500" />
        <h1 className="text-3xl font-bold text-textMain tracking-tight">Admin Override Panel</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users Overview */}
        <div className="glass-panel p-6 border border-red-500/20 rounded-2xl col-span-1 md:col-span-2 lg:col-span-3">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-textMain">Commander Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-textMuted whitespace-nowrap">
                  <th className="p-3">ID</th>
                  <th className="p-3">Display Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Total XP</th>
                  <th className="p-3">Streak</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors whitespace-nowrap">
                    <td className="p-3 font-mono text-xs text-textMuted">{u.id.substring(0,8)}...</td>
                    <td className="p-3 text-textMain font-medium">{u.username || 'Unknown'}</td>
                    <td className="p-3 text-xs">
                      <span className={`px-2 py-1 rounded-md border border-transparent ${
                        u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="p-3 text-emerald-400 font-bold">{u.total_xp}</td>
                    <td className="p-3 text-orange-400 font-bold">{u.streak_count} 🔥</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Task Editor Stub */}
        <div className="glass-panel p-6 border border-primary/20 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <ListPlus className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-textMain">Task Editor</h2>
          </div>
          <p className="text-sm text-textMuted mb-4">Create, edit, or delete global routine tasks and logic problems.</p>
          <button className="w-full py-2 bg-primary/20 text-primary font-bold rounded-lg hover:bg-primary/30 transition-colors">
            Manage Tasks
          </button>
        </div>

        {/* XP Override Stub */}
        <div className="glass-panel p-6 border border-emerald-500/20 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <Terminal className="text-emerald-500" size={24} />
            <h2 className="text-xl font-bold text-textMain">XP Override</h2>
          </div>
          <p className="text-sm text-textMuted mb-4">Manually grant or deduct XP for system corrections.</p>
          <button className="w-full py-2 bg-emerald-500/20 text-emerald-400 font-bold rounded-lg hover:bg-emerald-500/30 transition-colors">
            Execute Override
          </button>
        </div>
      </div>
    </div>
  );
}
