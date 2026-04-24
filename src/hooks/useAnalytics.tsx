import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { QUESTIONS } from '../lib/questions';

export interface CategoryStats {
  category: string;
  solved: number;
  failed: number;
  accuracy: number;
  totalXp: number;
  avgVelocitySec: number;
  lastSolvedAt: string | null;
  status: 'Mastered' | 'Stable' | 'Fading' | 'Untapped';
}

export interface AnalyticsData {
  totalSolved: number;
  overallAccuracy: number;
  totalXp: number;
  categoryStats: CategoryStats[];
  weakAreas: string[];
  fadingSkills: string[];
  suggestions: string[];
  loading: boolean;
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    totalSolved: 0,
    overallAccuracy: 0,
    totalXp: 0,
    categoryStats: [],
    weakAreas: [],
    fadingSkills: [],
    suggestions: [],
    loading: true
  });

  const fetchAnalytics = useCallback(async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('action_type, pillar, xp_earned, created_at')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const statsMap: Record<string, { solved: number; failed: number; xp: number; durations: number[]; lastDate: string | null }> = {};
      const categories = ['Pattern', 'Logic', 'HR', 'ABAP'];
      categories.forEach(c => statsMap[c] = { solved: 0, failed: 0, xp: 0, durations: [], lastDate: null });

      let totalSolved = 0;
      let totalFailed = 0;
      let totalXp = 0;

      logs?.forEach(log => {
        const fullType = log.action_type || '';
        const isFailure = fullType.startsWith('FAILED:');
        const isSolved = fullType.startsWith('Solved: ');
        
        const titlePart = isFailure 
          ? fullType.replace('FAILED: ', '') 
          : (isSolved ? fullType.replace('Solved: ', '').split('|')[0] : fullType.split('|')[0]);
        
        // Find category from QUESTIONS
        const question = QUESTIONS.find(q => q.title === titlePart);
        if (question) {
          const cat = question.category;
          if (statsMap[cat]) {
            if (isFailure) {
              statsMap[cat].failed++;
              totalFailed++;
            } else {
              statsMap[cat].solved++;
              statsMap[cat].xp += log.xp_earned;
              totalSolved++;
              totalXp += log.xp_earned;
              
              // Track last date
              if (!statsMap[cat].lastDate || new Date(log.created_at) > new Date(statsMap[cat].lastDate)) {
                statsMap[cat].lastDate = log.created_at;
              }

              // Parse duration: "Solved in 10s (...)" or "Solved in 1m 20s (...)"
              const durationMatch = fullType.match(/Solved in (\d+m )?(\d+)s/);
              if (durationMatch) {
                let sec = parseInt(durationMatch[2]);
                if (durationMatch[1]) sec += parseInt(durationMatch[1]) * 60;
                statsMap[cat].durations.push(sec);
              }
            }
          }
        }
      });

      const now = new Date();
      const categoryStats: CategoryStats[] = categories.map(cat => {
        const s = statsMap[cat];
        const totalAttempts = s.solved + s.failed;
        const avgVel = s.durations.length > 0 ? s.durations.reduce((a, b) => a + b, 0) / s.durations.length : 0;
        
        // Status determination
        let status: CategoryStats['status'] = 'Untapped';
        if (s.solved > 0) {
          const daysSinceLast = s.lastDate ? (now.getTime() - new Date(s.lastDate).getTime()) / (1000 * 3600 * 24) : 999;
          if (daysSinceLast > 14) status = 'Fading';
          else if (s.solved >= 5 && (s.solved / totalAttempts) > 0.8) status = 'Mastered';
          else status = 'Stable';
        }

        return {
          category: cat,
          solved: s.solved,
          failed: s.failed,
          accuracy: totalAttempts === 0 ? 0 : (s.solved / totalAttempts) * 100,
          totalXp: s.xp,
          avgVelocitySec: avgVel,
          lastSolvedAt: s.lastDate,
          status
        };
      });

      // Weak Area Detection
      const weakAreas = categoryStats
        .filter(s => (s.solved + s.failed > 0 && s.accuracy < 60) || (s.solved < 2))
        .map(s => s.category);

      const fadingSkills = categoryStats
        .filter(s => s.status === 'Fading')
        .map(s => s.category);

      const suggestions: string[] = [];
      if (weakAreas.length > 0) suggestions.push(`Strengthen ${weakAreas.slice(0, 2).join(' & ')} logic to restore system integrity.`);
      if (fadingSkills.length > 0) suggestions.push(`Skill decay detected in ${fadingSkills[0]}. Protocol refresh recommended.`);
      if (categoryStats.some(s => s.avgVelocitySec > 120)) suggestions.push("Optimize execution speed for complex logic gates.");
      if (suggestions.length === 0) suggestions.push("System performing at 100% capacity. Protocol maintained.");

      setData({
        totalSolved,
        overallAccuracy: (totalSolved + totalFailed) === 0 ? 0 : (totalSolved / (totalSolved + totalFailed)) * 100,
        totalXp,
        categoryStats,
        weakAreas,
        fadingSkills,
        suggestions,
        loading: false
      });

    } catch (e) {
      console.error('Analytics fetch failed:', e);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, refresh: fetchAnalytics };
}
