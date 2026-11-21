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

    const raw = Math.round(baseAmount * multiplier);
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

// ─── 5. Offline Mutation Queue Contract ────────────────────────────────
describe('Offline Mutation Queue Contract', () => {
  interface MockMutation {
    id: string;
    table: string;
    action: 'upsert' | 'insert' | 'update';
    payload: any;
    retries: number;
  }

  class MockOfflineSyncQueue {
    queue: MockMutation[] = [];
    isOnline = false;

    enqueue(item: Omit<MockMutation, 'id' | 'retries'>) {
      this.queue.push({
        ...item,
        id: `m-${Date.now()}-${Math.random()}`,
        retries: 0,
      });
    }

    flush(canSucceed: boolean) {
      if (!this.isOnline) return 0;
      if (canSucceed) {
        const count = this.queue.length;
        this.queue = [];
        return count;
      }
      return 0;
    }
  }

  test('buffers mutations while offline and flushes when reconnected', () => {
    const sync = new MockOfflineSyncQueue();
    sync.enqueue({ table: 'profiles', action: 'update', payload: { settings: { theme: 'quantum' } } });
    sync.enqueue({ table: 'daily_biometrics', action: 'upsert', payload: { water_liters: 3.5 } });

    assert.equal(sync.queue.length, 2);
    assert.equal(sync.flush(true), 0); // Still offline

    sync.isOnline = true;
    const flushed = sync.flush(true);
    assert.equal(flushed, 2);
    assert.equal(sync.queue.length, 0);
  });
});

// ─── 6. Audio Manager Mute & Volume Contract ───────────────────────────
describe('Audio Manager Mute & Volume Contract', () => {
  class MockAudioManager {
    isMuted = false;
    volume = 1.0;

    toggleMute() {
      this.isMuted = !this.isMuted;
      return this.isMuted;
    }

    setVolume(v: number) {
      this.volume = Math.max(0, Math.min(1, v));
    }

    canPlaySound() {
      return !this.isMuted && this.volume > 0;
    }
  }

  test('toggles mute correctly and inhibits sound playback when muted', () => {
    const audio = new MockAudioManager();
    assert.equal(audio.canPlaySound(), true);

    const muted = audio.toggleMute();
    assert.equal(muted, true);
    assert.equal(audio.canPlaySound(), false);

    audio.toggleMute();
    assert.equal(audio.canPlaySound(), true);
  });

  test('clamps volume between 0 and 1', () => {
    const audio = new MockAudioManager();
    audio.setVolume(1.8);
    assert.equal(audio.volume, 1.0);

    audio.setVolume(-0.5);
    assert.equal(audio.volume, 0.0);
    assert.equal(audio.canPlaySound(), false);
  });
});

// ─── 7. Timetable Normalization & Sync Contract ────────────────────────
describe('Timetable Normalization & Sync Contract', () => {
  function normalizeEngineTask(t: any, index: number = 0) {
    const start = t.start || t.start_time || t.timeStart || '09:00';
    let end = t.end || t.end_time || t.timeEnd;
    if (!end) {
      const [sh, sm] = start.split(':').map(Number);
      const dMin = Number(t.duration_minutes || t.duration || 45);
      const totalMin = sh * 60 + sm + dMin;
      const eh = Math.floor(totalMin / 60) % 24;
      const em = totalMin % 60;
      end = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
    }
    const title = t.title || t.name || `Task ${index + 1}`;
    const statusMsg = t.statusMsg || (t.task_target ? `${t.task_target} Priority Protocol` : 'Executing Protocol...');
    return {
      id: t.id !== undefined && t.id !== null ? t.id : `task-${index + 1}`,
      start,
      end,
      title,
      statusMsg,
      pillar: t.pillar,
      category: t.category,
      task_target: t.task_target,
      dayOfWeek: t.dayOfWeek !== undefined ? Number(t.dayOfWeek) : (t.day_of_week !== undefined ? Number(t.day_of_week) : undefined),
      isWeekend: t.isWeekend !== undefined ? !!t.isWeekend : (t.is_weekend !== undefined ? !!t.is_weekend : undefined),
    };
  }

  function resolveEngineSchedule(settingsTimetable?: any[], localTimetable?: any[], defaultSchedule?: any[]) {
    if (Array.isArray(settingsTimetable) && settingsTimetable.length > 0) {
      return settingsTimetable.map((t, i) => normalizeEngineTask(t, i));
    }
    if (Array.isArray(localTimetable) && localTimetable.length > 0) {
      return localTimetable.map((t, i) => normalizeEngineTask(t, i));
    }
    return (defaultSchedule || []).map((t, i) => normalizeEngineTask(t, i));
  }

  test('normalizes diverse timetable representations seamlessly', () => {
    const taskFromSettings = {
      id: 101,
      name: 'Advanced System Architecture',
      start_time: '10:00',
      duration_minutes: 90,
      day_of_week: 1,
      pillar: 'Study',
      task_target: 'High'
    };

    const normalized = normalizeEngineTask(taskFromSettings, 0);
    assert.equal(normalized.id, 101);
    assert.equal(normalized.title, 'Advanced System Architecture');
    assert.equal(normalized.start, '10:00');
    assert.equal(normalized.end, '11:30');
    assert.equal(normalized.pillar, 'Study');
    assert.equal(normalized.task_target, 'High');
    assert.equal(normalized.dayOfWeek, 1);
  });

  test('prioritizes updated settings timetable over stale fallback and defaults', () => {
    const oldDefault = [{ id: 1, title: 'Old Morning Protocol', start: '06:00', end: '07:00' }];
    const localStale = [{ id: 1, title: 'Old Local Task', start: '08:00', end: '09:00' }];
    const newSettings = [{ id: 99, title: 'Custom Deep Coding Session', start: '09:00', end: '12:00', pillar: 'Study' }];

    const activeSchedule = resolveEngineSchedule(newSettings, localStale, oldDefault);
    assert.equal(activeSchedule.length, 1);
    assert.equal(activeSchedule[0].id, 99);
    assert.equal(activeSchedule[0].title, 'Custom Deep Coding Session');
    assert.equal(activeSchedule[0].start, '09:00');
  });

  test('falls back gracefully to local storage when settings timetable is empty', () => {
    const oldDefault = [{ id: 1, title: 'Old Morning Protocol', start: '06:00', end: '07:00' }];
    const localSaved = [{ id: 2, title: 'Saved Offline Block', start: '14:00', end: '16:00' }];

    const activeSchedule = resolveEngineSchedule([], localSaved, oldDefault);
    assert.equal(activeSchedule.length, 1);
    assert.equal(activeSchedule[0].id, 2);
    assert.equal(activeSchedule[0].title, 'Saved Offline Block');
  });
});

// ─── 8. Reels & Video Vault (Instagram, YouTube & -15 XP Cost) ──────────
describe('Reels & Video Vault (Instagram, YouTube & -15 XP Deduction)', () => {
  function extractInstagramId(input: string): string | null {
    if (!input) return null;
    const clean = input.trim();
    const match = clean.match(/(?:instagram\.com\/(?:p|reel|reels|tv)\/)([\w-]+)/i);
    return match ? match[1] : null;
  }

  function extractYoutubeId(input: string): string | null {
    if (!input) return null;
    const clean = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    return match ? match[1] : null;
  }

  function parsePastedLinks(rawText: string, defaultCategory = 'Discipline', customTitle?: string) {
    const chunks = rawText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const results: Array<{ platform: 'instagram' | 'youtube'; mediaId: string; title: string; category: string; url: string; watched: boolean; xpDeducted: boolean }> = [];
    const seenKeys = new Set<string>();
    const trimmedTitle = customTitle?.trim();

    for (const chunk of chunks) {
      const igId = extractInstagramId(chunk);
      if (igId && !seenKeys.has(`ig-${igId}`)) {
        seenKeys.add(`ig-${igId}`);
        results.push({
          platform: 'instagram',
          mediaId: igId,
          title: trimmedTitle ? (chunks.length > 1 ? `${trimmedTitle} #${results.length + 1}` : trimmedTitle) : `Instagram Reel (${igId})`,
          category: defaultCategory,
          url: chunk.startsWith('http') ? chunk : `https://www.instagram.com/reel/${igId}/`,
          watched: false,
          xpDeducted: false,
        });
        continue;
      }

      const yId = extractYoutubeId(chunk);
      if (yId && !seenKeys.has(`yt-${yId}`)) {
        seenKeys.add(`yt-${yId}`);
        results.push({
          platform: 'youtube',
          mediaId: yId,
          title: trimmedTitle ? (chunks.length > 1 ? `${trimmedTitle} #${results.length + 1}` : trimmedTitle) : `Motivational Protocol (${yId.slice(0, 6)})`,
          category: defaultCategory,
          url: chunk.startsWith('http') ? chunk : `https://youtu.be/${yId}`,
          watched: false,
          xpDeducted: false,
        });
      }
    }
    if (results.length === 1 && trimmedTitle) {
      results[0].title = trimmedTitle;
    }
    return results;
  }

  test('extracts Instagram reel codes across reel, reels, and post URLs', () => {
    assert.equal(extractInstagramId('https://www.instagram.com/reel/C8abc123XYZ/'), 'C8abc123XYZ');
    assert.equal(extractInstagramId('https://instagram.com/reels/DA123456789/?igsh=MW'), 'DA123456789');
    assert.equal(extractInstagramId('https://www.instagram.com/p/C9def456/'), 'C9def456');
    assert.equal(extractInstagramId('https://youtube.com/watch?v=12345678901'), null);
  });

  test('extracts YouTube IDs across standard, short, and shorts URLs', () => {
    assert.equal(extractYoutubeId('https://www.youtube.com/watch?v=mgmVOuLgFB0'), 'mgmVOuLgFB0');
    assert.equal(extractYoutubeId('https://youtu.be/wnHW6o8WMas?si=AbCdEfGh'), 'wnHW6o8WMas');
    assert.equal(extractYoutubeId('https://www.youtube.com/shorts/tbnzAVRZ9Xc'), 'tbnzAVRZ9Xc');
    assert.equal(extractYoutubeId('b1nPFfioz_w'), 'b1nPFfioz_w');
    assert.equal(extractYoutubeId('https://invalid.com/video'), null);
  });

  test('correctly parses mixed bulk links from WhatsApp containing Instagram and YouTube', () => {
    const whatsappPaste = `
      Hey check these clips:
      https://www.instagram.com/reel/C8xyz123ABC/
      https://www.youtube.com/watch?v=mgmVOuLgFB0
      https://www.instagram.com/reel/C8xyz123ABC/
      https://www.youtube.com/shorts/tbnzAVRZ9Xc
    `;

    const parsed = parsePastedLinks(whatsappPaste, 'Mindset');
    assert.equal(parsed.length, 3); // Deduplicated Instagram link
    assert.equal(parsed[0].platform, 'instagram');
    assert.equal(parsed[0].mediaId, 'C8xyz123ABC');
    assert.equal(parsed[1].platform, 'youtube');
    assert.equal(parsed[1].mediaId, 'mgmVOuLgFB0');
    assert.equal(parsed[2].platform, 'youtube');
    assert.equal(parsed[2].mediaId, 'tbnzAVRZ9Xc');
    assert.equal(parsed[0].xpDeducted, false);
  });

  test('enforces -15 Mind XP deduction contract on reel view / scroll', () => {
    let userXp = 100;
    const reel = {
      id: 'ig-1',
      title: 'Mamba Focus Reel',
      watched: false,
      xpDeducted: false,
    };

    function applyDopamineScrollCost(r: typeof reel) {
      if (r.xpDeducted) return { deducted: 0, currentXp: userXp };
      r.watched = true;
      r.xpDeducted = true;
      const deduction = 15;
      userXp = Math.max(0, userXp - deduction);
      return { deducted: deduction, currentXp: userXp };
    }

    const firstScroll = applyDopamineScrollCost(reel);
    assert.equal(firstScroll.deducted, 15);
    assert.equal(firstScroll.currentXp, 85); // 100 - 15 = 85
    assert.equal(reel.xpDeducted, true);

    const secondScroll = applyDopamineScrollCost(reel);
    assert.equal(secondScroll.deducted, 0);
    assert.equal(secondScroll.currentXp, 85);
  });

  test('applies custom user title / mood option (e.g. Sad, Beast Mode) when importing reels', () => {
    const singleLink = 'https://www.instagram.com/reel/C8xyz123ABC/';
    const parsedSingle = parsePastedLinks(singleLink, 'Mindset', 'Sad 🌧️');
    assert.equal(parsedSingle.length, 1);
    assert.equal(parsedSingle[0].title, 'Sad 🌧️');

    const multiLinks = `
      https://www.instagram.com/reel/C8xyz123ABC/
      https://www.youtube.com/watch?v=mgmVOuLgFB0
    `;
    const parsedMulti = parsePastedLinks(multiLinks, 'Focus', 'Gym Beast 🔥');
    assert.equal(parsedMulti.length, 2);
    assert.equal(parsedMulti[0].title, 'Gym Beast 🔥 #1');
    assert.equal(parsedMulti[1].title, 'Gym Beast 🔥 #2');
  });

  test('enforces maximum 10 reels per day quota safeguard', () => {
    const DAILY_LIMIT = 10;
    const viewedToday: string[] = [];

    function viewReel(reelId: string) {
      if (viewedToday.includes(reelId)) {
        return { allowed: true, count: viewedToday.length, limitReached: viewedToday.length >= DAILY_LIMIT };
      }
      if (viewedToday.length >= DAILY_LIMIT) {
        return { allowed: false, count: viewedToday.length, limitReached: true };
      }
      viewedToday.push(reelId);
      return { allowed: true, count: viewedToday.length, limitReached: viewedToday.length >= DAILY_LIMIT };
    }

    // View 10 unique reels
    for (let i = 1; i <= 10; i++) {
      const res = viewReel(`reel-${i}`);
      assert.equal(res.allowed, true);
      assert.equal(res.count, i);
      assert.equal(res.limitReached, i === 10);
    }

    // Viewing the 11th reel should be blocked by daily safeguard
    const eleventh = viewReel('reel-11');
    assert.equal(eleventh.allowed, false);
    assert.equal(eleventh.count, 10);
    assert.equal(eleventh.limitReached, true);

    // Re-viewing an already viewed reel from today remains allowed without increasing count
    const reviewFirst = viewReel('reel-1');
    assert.equal(reviewFirst.allowed, true);
    assert.equal(reviewFirst.count, 10);
  });

  test('shuffles reel list to produce fresh randomized opening sequences', () => {
    function shuffleArray<T>(arr: T[]): T[] {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      return copy;
    }

    const original = ['reel-1', 'reel-2', 'reel-3', 'reel-4', 'reel-5', 'reel-6', 'reel-7', 'reel-8', 'reel-9', 'reel-10'];
    const shuffled = shuffleArray(original);

    // All original elements are preserved
    assert.equal(shuffled.length, original.length);
    for (const item of original) {
      assert.equal(shuffled.includes(item), true);
    }
  });
});

// ─── 9. Timetable Task Skip & Protocol Resume Contract ──────────────
describe('Timetable Task Skip & Protocol Resume Contract', () => {
  test('skipping a timetable task marks it executed/bypassed without freezing the engine', () => {
    const executedTaskIds: string[] = ['task-1'];
    const activeTask = { id: 'task-2', title: 'Deep Work Block', start: '10:00', end: '11:30' };
    
    // Simulate skip current task
    const updatedExecuted = Array.from(new Set([...executedTaskIds, String(activeTask.id)]));
    assert.deepEqual(updatedExecuted, ['task-1', 'task-2']);
    
    // Check next task resolution: task-2 is now considered executed/bypassed
    const schedule = [
      { id: 'task-1', title: 'Morning Routine' },
      { id: 'task-2', title: 'Deep Work Block' },
      { id: 'task-3', title: 'Afternoon Execution' }
    ];
    
    const uncompletedTasks = schedule.filter(t => !updatedExecuted.includes(String(t.id)));
    assert.equal(uncompletedTasks.length, 1);
    assert.equal(uncompletedTasks[0].id, 'task-3');
  });

  test('resuming protocol clears today skip entry and re-enables active engine', () => {
    const todayStr = '2026-11-20';
    let skips = [
      { date: '2026-11-10', reason: 'Past rest' },
      { date: '2026-11-20', reason: 'Accidental override' }
    ];
    let isSkippedToday = skips.some(s => s.date === todayStr);
    assert.equal(isSkippedToday, true);

    // Resume action
    skips = skips.filter(s => s.date !== todayStr);
    isSkippedToday = skips.some(s => s.date === todayStr);

    assert.equal(isSkippedToday, false);
    assert.equal(skips.length, 1);
    assert.equal(skips[0].date, '2026-11-10');
  });
});

// ─── 10. Daily Thoughts Repetition & Shuffled Cycles Contract ────────
describe('Daily Thoughts Repetition & Shuffled Cycles Contract', () => {
  function mulberry32(seed: number) {
    return function() {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getCycleShuffledThoughts(thoughts: any[], cycle: number): any[] {
    if (!thoughts || thoughts.length <= 1) return thoughts || [];
    if (cycle === 0) return [...thoughts];

    const shuffled = [...thoughts];
    const rand = mulberry32(cycle * 10007 + 7919);

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return shuffled;
  }

  function getTodayThought(thoughts: any[], dayIndex: number): any {
    if (!thoughts || thoughts.length === 0) return null;
    const cycle = Math.floor(dayIndex / thoughts.length);
    const indexInCycle = dayIndex % thoughts.length;
    const cycleThoughts = getCycleShuffledThoughts(thoughts, cycle);
    return cycleThoughts[indexInCycle] || thoughts[0];
  }

  test('Cycle 0 serves all thoughts in original order from Day 1 to Day N', () => {
    const thoughts = [
      { id: 'dt-1', quote: 'Thought 1' },
      { id: 'dt-2', quote: 'Thought 2' },
      { id: 'dt-3', quote: 'Thought 3' },
    ];

    assert.equal(getTodayThought(thoughts, 0).id, 'dt-1');
    assert.equal(getTodayThought(thoughts, 1).id, 'dt-2');
    assert.equal(getTodayThought(thoughts, 2).id, 'dt-3');
  });

  test('When all thoughts are completed, restarts from Day 1 with thoughts shuffled', () => {
    const thoughts = [
      { id: 'dt-1', quote: 'Thought 1' },
      { id: 'dt-2', quote: 'Thought 2' },
      { id: 'dt-3', quote: 'Thought 3' },
      { id: 'dt-4', quote: 'Thought 4' },
      { id: 'dt-5', quote: 'Thought 5' },
    ];

    // Cycle 1: day 5 (which is day 1 of repetition cycle 1)
    const cycle1Day1 = getTodayThought(thoughts, 5);
    const cycle1Thoughts = [
      getTodayThought(thoughts, 5),
      getTodayThought(thoughts, 6),
      getTodayThought(thoughts, 7),
      getTodayThought(thoughts, 8),
      getTodayThought(thoughts, 9),
    ];

    // Every thought is included in cycle 1 (no duplicates, no omissions)
    const cycle1Ids = cycle1Thoughts.map(t => t.id);
    assert.equal(new Set(cycle1Ids).size, 5);
    for (const t of thoughts) {
      assert.equal(cycle1Ids.includes(t.id), true);
    }

    // Shuffled sequence in cycle 1 differs from original sequence
    const originalIds = thoughts.map(t => t.id);
    assert.notDeepEqual(cycle1Ids, originalIds);
  });

  test('When cycle 1 completes, cycle 2 repeats again from Day 1 with a new shuffle', () => {
    const thoughts = [
      { id: 'dt-1', quote: 'Thought 1' },
      { id: 'dt-2', quote: 'Thought 2' },
      { id: 'dt-3', quote: 'Thought 3' },
      { id: 'dt-4', quote: 'Thought 4' },
      { id: 'dt-5', quote: 'Thought 5' },
    ];

    // Cycle 1 (days 5..9)
    const cycle1Ids = [5, 6, 7, 8, 9].map(d => getTodayThought(thoughts, d).id);
    // Cycle 2 (days 10..14)
    const cycle2Ids = [10, 11, 12, 13, 14].map(d => getTodayThought(thoughts, d).id);

    // Both cycles preserve all elements
    assert.equal(new Set(cycle2Ids).size, 5);
    // Cycle 2 has its own unique permutation
    assert.notDeepEqual(cycle2Ids, cycle1Ids);
  });
});
