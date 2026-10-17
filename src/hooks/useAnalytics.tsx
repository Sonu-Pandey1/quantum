import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { QUESTIONS } from '../lib/questions';
import { format } from 'date-fns';

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

export interface ScopeMetrics {
  totalSolved: number;
  totalFailed: number;
  overallAccuracy: number;
  totalXp: number;
  categoryStats: CategoryStats[];
}

export interface AnalyticsData {
  today: ScopeMetrics;
  lifetime: ScopeMetrics;
  weakAreas: string[];
  fadingSkills: string[];
  suggestions: string[];
  loading: boolean;
}

const EMPTY_SCOPE: ScopeMetrics = {
  totalSolved: 0,
  totalFailed: 0,
  overallAccuracy: 0,
  totalXp: 0,
  categoryStats: [
    { category: 'Logic', solved: 0, failed: 0, accuracy: 0, totalXp: 0, avgVelocitySec: 0, lastSolvedAt: null, status: 'Untapped' },
    { category: 'ABAP', solved: 0, failed: 0, accuracy: 0, totalXp: 0, avgVelocitySec: 0, lastSolvedAt: null, status: 'Untapped' },
    { category: 'Pattern', solved: 0, failed: 0, accuracy: 0, totalXp: 0, avgVelocitySec: 0, lastSolvedAt: null, status: 'Untapped' },
    { category: 'HR', solved: 0, failed: 0, accuracy: 0, totalXp: 0, avgVelocitySec: 0, lastSolvedAt: null, status: 'Untapped' },
  ],
};

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    today: EMPTY_SCOPE,
    lifetime: EMPTY_SCOPE,
    weakAreas: [],
    fadingSkills: [],
    suggestions: [],
    loading: true,
  });

  const fetchAnalytics = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const categories = ['Logic', 'ABAP', 'Pattern', 'HR'];

    try {
      const client = supabase;
      let logs: any[] = [];
      let userId: string | null = null;

      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
          const { data: dbLogs } = await client
            .from('activity_logs')
            .select('action_type, pillar, xp_earned, created_at')
            .eq('user_id', session.user.id);
          if (dbLogs) logs = dbLogs;
        }
      }

      // Also read local submissions cache from PracticeHub
      let localSubmissions: Record<string, { last_solved_at: string; solve_count: number }> = {};
      if (userId) {
        try {
          const raw = localStorage.getItem(`quantum_practice_submissions_${userId}`);
          if (raw) localSubmissions = JSON.parse(raw);
        } catch {}
      }

      // Category accumulation helper
      const createCatAccumulator = () => {
        const map: Record<string, { solved: number; failed: number; xp: number; durations: number[]; lastDate: string | null }> = {};
        categories.forEach(c => {
          map[c] = { solved: 0, failed: 0, xp: 0, durations: [], lastDate: null };
        });
        return map;
      };

      const lifetimeMap = createCatAccumulator();
      const todayMap = createCatAccumulator();

      let lifetimeSolved = 0;
      let lifetimeFailed = 0;
      let lifetimeXp = 0;

      let todaySolved = 0;
      let todayFailed = 0;
      let todayXp = 0;

      // Track counted question IDs to avoid double counting if logs overlap
      const countedLogQuestions = new Set<string>();

      logs.forEach(log => {
        const fullType = String(log.action_type || '');
        const isFailure = fullType.startsWith('FAILED:') || fullType.includes('|Failed') || fullType.includes('Failed:');
        const isSolved = !isFailure && (
          fullType.includes('Solved') || 
          fullType.includes('Completed Dojo') || 
          fullType.startsWith('Logic:') || 
          fullType.startsWith('Practice:')
        );

        if (!isFailure && !isSolved) return;

        // Clean question title
        let cleanTitle = fullType;
        if (cleanTitle.includes('|')) cleanTitle = cleanTitle.split('|')[0].trim();
        if (cleanTitle.startsWith('FAILED: ')) cleanTitle = cleanTitle.replace('FAILED: ', '').trim();
        if (cleanTitle.startsWith('Solved: ')) cleanTitle = cleanTitle.replace('Solved: ', '').trim();
        if (cleanTitle.startsWith('Logic: ')) cleanTitle = cleanTitle.replace('Logic: ', '').trim();
        if (cleanTitle.startsWith('Practice: ')) cleanTitle = cleanTitle.replace('Practice: ', '').trim();

        // Match category from QUESTIONS database
        const qMatch = QUESTIONS.find(q =>
          q.title.toLowerCase() === cleanTitle.toLowerCase() ||
          cleanTitle.toLowerCase().includes(q.title.toLowerCase()) ||
          q.title.toLowerCase().includes(cleanTitle.toLowerCase())
        );

        let cat: string = qMatch?.category || 'Logic';
        if (!qMatch) {
          const lower = fullType.toLowerCase();
          if (lower.includes('abap') || lower.includes('rap')) cat = 'ABAP';
          else if (lower.includes('pattern') || lower.includes('dojo')) cat = 'Pattern';
          else if (lower.includes('hr') || lower.includes('behavioral')) cat = 'HR';
          else if (lower.includes('logic') || lower.includes('algorithm')) cat = 'Logic';
        }

        if (qMatch) countedLogQuestions.add(qMatch.id);

        // Parse duration: "Solved in 10s" or "Solved in 1m 20s"
        const durationMatch = fullType.match(/Solved in (\d+m )?(\d+)s/);
        let sec = 0;
        if (durationMatch) {
          sec = parseInt(durationMatch[2], 10);
          if (durationMatch[1]) sec += parseInt(durationMatch[1], 10) * 60;
        }

        const logDateStr = log.created_at ? log.created_at.slice(0, 10) : '';
        const isToday = logDateStr === todayStr;

        if (isFailure) {
          lifetimeMap[cat].failed++;
          lifetimeFailed++;
          if (isToday) {
            todayMap[cat].failed++;
            todayFailed++;
          }
        } else {
          lifetimeMap[cat].solved++;
          lifetimeMap[cat].xp += Number(log.xp_earned) || 0;
          lifetimeSolved++;
          lifetimeXp += Number(log.xp_earned) || 0;
          if (sec > 0) lifetimeMap[cat].durations.push(sec);
          if (!lifetimeMap[cat].lastDate || new Date(log.created_at) > new Date(lifetimeMap[cat].lastDate!)) {
            lifetimeMap[cat].lastDate = log.created_at;
          }

          if (isToday) {
            todayMap[cat].solved++;
            todayMap[cat].xp += Number(log.xp_earned) || 0;
            todaySolved++;
            todayXp += Number(log.xp_earned) || 0;
            if (sec > 0) todayMap[cat].durations.push(sec);
            if (!todayMap[cat].lastDate || new Date(log.created_at) > new Date(todayMap[cat].lastDate!)) {
              todayMap[cat].lastDate = log.created_at;
            }
          }
        }
      });

      // Incorporate local submissions from Practice Hub if any were not in activity_logs
      Object.entries(localSubmissions).forEach(([qId, sub]) => {
        if (!countedLogQuestions.has(qId)) {
          const qObj = QUESTIONS.find(q => q.id === qId);
          if (qObj) {
            const cat = qObj.category || 'Logic';
            const subDate = sub.last_solved_at ? sub.last_solved_at.slice(0, 10) : '';
            const isToday = subDate === todayStr;

            lifetimeMap[cat].solved += sub.solve_count || 1;
            lifetimeSolved += sub.solve_count || 1;
            lifetimeXp += (sub.solve_count || 1) * 40;
            if (!lifetimeMap[cat].lastDate || new Date(sub.last_solved_at) > new Date(lifetimeMap[cat].lastDate!)) {
              lifetimeMap[cat].lastDate = sub.last_solved_at;
            }

            if (isToday) {
              todayMap[cat].solved += sub.solve_count || 1;
              todaySolved += sub.solve_count || 1;
              todayXp += (sub.solve_count || 1) * 40;
              if (!todayMap[cat].lastDate || new Date(sub.last_solved_at) > new Date(todayMap[cat].lastDate!)) {
                todayMap[cat].lastDate = sub.last_solved_at;
              }
            }
          }
        }
      });

      const now = new Date();

      const buildCategoryStats = (map: typeof lifetimeMap): CategoryStats[] => {
        return categories.map(cat => {
          const s = map[cat];
          const totalAttempts = s.solved + s.failed;
          const avgVel = s.durations.length > 0
            ? s.durations.reduce((a, b) => a + b, 0) / s.durations.length
            : 0;

          let status: CategoryStats['status'] = 'Untapped';
          if (s.solved > 0) {
            const daysSince = s.lastDate ? (now.getTime() - new Date(s.lastDate).getTime()) / (1000 * 3600 * 24) : 999;
            if (daysSince > 10) status = 'Fading';
            else if (s.solved >= 3 && (s.failed === 0 || (s.solved / totalAttempts) >= 0.75)) status = 'Mastered';
            else status = 'Stable';
          }

          const accuracy = totalAttempts === 0
            ? (s.solved > 0 ? 100 : 0)
            : Math.round((s.solved / totalAttempts) * 100);

          return {
            category: cat,
            solved: s.solved,
            failed: s.failed,
            accuracy,
            totalXp: s.xp,
            avgVelocitySec: avgVel,
            lastSolvedAt: s.lastDate,
            status,
          };
        });
      };

      const lifetimeCategoryStats = buildCategoryStats(lifetimeMap);
      const todayCategoryStats = buildCategoryStats(todayMap);

      const lifetimeAccuracy = (lifetimeSolved + lifetimeFailed) === 0
        ? (lifetimeSolved > 0 ? 100 : 0)
        : Math.round((lifetimeSolved / (lifetimeSolved + lifetimeFailed)) * 100);

      const todayAccuracy = (todaySolved + todayFailed) === 0
        ? (todaySolved > 0 ? 100 : 0)
        : Math.round((todaySolved / (todaySolved + todayFailed)) * 100);

      // Dynamic Weak Areas
      const weakAreas: string[] = [];
      lifetimeCategoryStats.forEach(s => {
        const attempts = s.solved + s.failed;
        if (attempts > 0 && s.accuracy < 70) {
          weakAreas.push(`${s.category} (${s.accuracy}% Accuracy)`);
        } else if (s.solved === 0) {
          weakAreas.push(`${s.category} Domain Untapped`);
        }
      });
      if (weakAreas.length === 0) {
        weakAreas.push('All active domains calibrated above 70% accuracy');
      }

      // Dynamic Retention Risks
      const fadingSkills: string[] = [];
      lifetimeCategoryStats.forEach(s => {
        if (s.status === 'Fading') {
          fadingSkills.push(`${s.category}: Inactive for >10 days`);
        }
      });
      if (todaySolved === 0) {
        fadingSkills.push('Daily practice queue pending: 0 questions solved today');
      }
      if (fadingSkills.length === 0) {
        fadingSkills.push('Retention optimal: Neural pathways active and conditioned');
      }

      // Dynamic Smart Suggestions
      const suggestions: string[] = [];
      if (todaySolved === 0) {
        suggestions.push('Execute at least 2 practice quests in Practice Hub to maintain velocity.');
      } else {
        suggestions.push(`Velocity on track: ${todaySolved} question(s) completed today.`);
      }

      const slowCat = lifetimeCategoryStats.find(s => s.avgVelocitySec > 75);
      if (slowCat) {
        suggestions.push(`Velocity calibration: ${slowCat.category} duration is ${Math.round(slowCat.avgVelocitySec)}s — aim for sub-60s execution.`);
      }

      const untapped = lifetimeCategoryStats.find(s => s.solved === 0);
      if (untapped) {
        suggestions.push(`Explore ${untapped.category} problems in Practice Hub to unlock holistic competency.`);
      } else {
        suggestions.push('System performing at optimal capacity. Review ABAP & Logic patterns regularly.');
      }

      setData({
        today: {
          totalSolved: todaySolved,
          totalFailed: todayFailed,
          overallAccuracy: todayAccuracy,
          totalXp: todayXp,
          categoryStats: todayCategoryStats,
        },
        lifetime: {
          totalSolved: lifetimeSolved,
          totalFailed: lifetimeFailed,
          overallAccuracy: lifetimeAccuracy,
          totalXp: lifetimeXp,
          categoryStats: lifetimeCategoryStats,
        },
        weakAreas,
        fadingSkills,
        suggestions,
        loading: false,
      });
    } catch (e) {
      console.error('[useAnalytics] fetch error:', e);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, refresh: fetchAnalytics };
}
