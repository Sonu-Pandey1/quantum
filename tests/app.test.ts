import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

// ─── 1. Streak & Shield Matrix Protection Logic Tests ──────────────────
describe('Streak & Shield Matrix Logic', () => {
  function processStreak({
    prevStreak,
    lastActivityDate,
    currentDate,
    availableShields,
  }: {
    prevStreak: number;
    lastActivityDate: string | null;
    currentDate: string;
    availableShields: number;
  }) {
    let currentStreak = prevStreak;
    let newLastActivity = lastActivityDate;
    let shields = availableShields;
    let shieldUsed = false;
    let newShieldEarned = false;

    if (newLastActivity) {
      const diffDays = Math.round(
        (new Date(currentDate).getTime() - new Date(newLastActivity).getTime()) / 86400000
      );

      if (diffDays === 1) {
        currentStreak += 1;
        newLastActivity = currentDate;
      } else if (diffDays > 1) {
        const missedDays = diffDays - 1;
        if (missedDays <= shields && shields > 0) {
          shieldUsed = true;
          currentStreak = prevStreak + 1;
          newLastActivity = currentDate;
          shields = Math.max(0, shields - missedDays);
        } else {
          currentStreak = 1;
          newLastActivity = currentDate;
        }
      }
    } else {
      currentStreak = 1;
      newLastActivity = currentDate;
    }

    if (!shieldUsed && currentStreak > prevStreak && currentStreak % 7 === 0) {
      if (shields < 3) {
        shields = Math.min(3, shields + 1);
        newShieldEarned = true;
      }
    }

    return { currentStreak, shields, shieldUsed, newShieldEarned };
  }

  test('increments streak on consecutive day execution', () => {
    const res = processStreak({
      prevStreak: 5,
      lastActivityDate: '2026-10-16',
      currentDate: '2026-10-17',
      availableShields: 0,
    });
    assert.equal(res.currentStreak, 6);
    assert.equal(res.shieldUsed, false);
  });

  test('auto-awards a streak shield when reaching 7 consecutive days', () => {
    const res = processStreak({
      prevStreak: 6,
      lastActivityDate: '2026-10-16',
      currentDate: '2026-10-17',
      availableShields: 0,
    });
    assert.equal(res.currentStreak, 7);
    assert.equal(res.shields, 1);
    assert.equal(res.newShieldEarned, true);
  });

  test('activates streak shield when 1 day is missed (diffDays = 2), preventing streak reset', () => {
    const res = processStreak({
      prevStreak: 12,
      lastActivityDate: '2026-10-15', // skipped 2026-10-16
      currentDate: '2026-10-17',
      availableShields: 2,
    });
    assert.equal(res.shieldUsed, true);
    assert.equal(res.currentStreak, 13);
    assert.equal(res.shields, 1); // 1 shield consumed
  });

  test('resets streak to 1 when gap occurs and 0 shields are available', () => {
    const res = processStreak({
      prevStreak: 12,
      lastActivityDate: '2026-10-14',
      currentDate: '2026-10-17',
      availableShields: 0,
    });
    assert.equal(res.shieldUsed, false);
    assert.equal(res.currentStreak, 1);
    assert.equal(res.shields, 0);
  });

  test('caps max shields at 3', () => {
    const res = processStreak({
      prevStreak: 20,
      lastActivityDate: '2026-10-16',
      currentDate: '2026-10-17',
      availableShields: 3,
    });
    assert.equal(res.currentStreak, 21);
    assert.equal(res.shields, 3);
    assert.equal(res.newShieldEarned, false);
  });
});

// ─── 2. Multiplier & XP Progression Calculations ───────────────────────
describe('Progression & Multipliers', () => {
  function calculateEarnedXp({
    baseAmount,
    streak,
    archetype,
    pillar,
  }: {
    baseAmount: number;
    streak: number;
    archetype: string;
    pillar: string;
  }) {
    let multiplier = 1.0;
    if (streak >= 3) multiplier *= 1.5;
    if (archetype === 'Technical Elite' && pillar === 'Study') multiplier *= 1.2;
    if (archetype === 'Wealth Architect' && pillar === 'Finance') multiplier *= 1.2;
    if (archetype === 'Vitality Vanguard' && pillar === 'Health') multiplier *= 1.2;

    const raw = Math.floor(baseAmount * multiplier);
    return Math.max(baseAmount, raw);
  }

  test('applies 1.5x streak bonus when streak >= 3', () => {
    const xp = calculateEarnedXp({
      baseAmount: 100,
      streak: 3,
      archetype: 'None',
      pillar: 'Study',
    });
    assert.equal(xp, 150);
  });

  test('stacks streak bonus (1.5x) and matching archetype boost (1.2x = 1.8x total)', () => {
    const xp = calculateEarnedXp({
      baseAmount: 100,
      streak: 5,
      archetype: 'Technical Elite',
      pillar: 'Study',
    });
    assert.equal(xp, 180);
  });

  test('does not apply archetype boost to non-matching pillar', () => {
    const xp = calculateEarnedXp({
      baseAmount: 100,
      streak: 5,
      archetype: 'Technical Elite',
      pillar: 'Health',
    });
    assert.equal(xp, 150);
  });
});

// ─── 3. Analytics Scope & Metric Computations ──────────────────────────
describe('Analytics Matrix Scope Isolation', () => {
  interface MockLog {
    id: string;
    created_at: string;
    action_type: string;
    xp_earned: number;
  }

  function computeMetrics(logs: MockLog[], todayStr: string) {
    const filterLogs = (scope: 'today' | 'lifetime') => {
      if (scope === 'today') {
        return logs.filter(l => l.created_at.startsWith(todayStr));
      }
      return logs;
    };

    const isSolvedLog = (action: string) => {
      return (
        action.startsWith('Solved: ') ||
        action.includes('|Solved in ') ||
        action.startsWith('practice_solve_')
      );
    };

    const getStats = (scope: 'today' | 'lifetime') => {
      const scoped = filterLogs(scope);
      const solved = scoped.filter(l => isSolvedLog(l.action_type));
      const totalXp = scoped.reduce((sum, l) => sum + (l.xp_earned || 0), 0);
      return {
        totalActions: scoped.length,
        solvedCount: solved.length,
        totalXp,
      };
    };

    return {
      today: getStats('today'),
      lifetime: getStats('lifetime'),
    };
  }

  test('correctly isolates today metrics from lifetime metrics', () => {
    const mockLogs: MockLog[] = [
      { id: '1', created_at: '2026-10-16T10:00:00Z', action_type: 'Solved: Dynamic Programming', xp_earned: 50 },
      { id: '2', created_at: '2026-10-17T09:00:00Z', action_type: 'ABAP Core Syntax|Solved in 2m 14s', xp_earned: 40 },
      { id: '3', created_at: '2026-10-17T11:30:00Z', action_type: 'Health Lab: Zone 2 Cardio', xp_earned: 35 },
    ];

    const result = computeMetrics(mockLogs, '2026-10-17');

    // Today stats
    assert.equal(result.today.totalActions, 2);
    assert.equal(result.today.solvedCount, 1);
    assert.equal(result.today.totalXp, 75);

    // Lifetime stats
    assert.equal(result.lifetime.totalActions, 3);
    assert.equal(result.lifetime.solvedCount, 2);
    assert.equal(result.lifetime.totalXp, 125);
  });
});

// ─── 4. Notification Service & History Logic ───────────────────────────
describe('Notification Service Contract', () => {
  class MockNotificationService {
    history: Array<{ title: string; body: string; timestamp: string }> = [];

    send(title: string, body: string, isSystemSupported: boolean, isGranted: boolean) {
      this.history.unshift({ title, body, timestamp: new Date().toISOString() });
      if (this.history.length > 30) this.history.pop();

      if (!isSystemSupported || !isGranted) {
        return { deliveredVia: 'in_app_toast' };
      }
      return { deliveredVia: 'system_notification' };
    }
  }

  test('stores notifications into local history log and respects 30-item limit', () => {
    const notif = new MockNotificationService();
    for (let i = 0; i < 35; i++) {
      notif.send(`Alert ${i}`, `Body ${i}`, false, false);
    }
    assert.equal(notif.history.length, 30);
    assert.equal(notif.history[0].title, 'Alert 34');
  });

  test('gracefully falls back to in-app toast when system permissions are disabled', () => {
    const notif = new MockNotificationService();
    const result = notif.send('Protocol Shift', 'Starting Deep Work', true, false);
    assert.equal(result.deliveredVia, 'in_app_toast');
  });

  test('delivers via system notification when permissions are granted', () => {
    const notif = new MockNotificationService();
    const result = notif.send('Protocol Completed', '+40 XP earned', true, true);
    assert.equal(result.deliveredVia, 'system_notification');
  });
});
