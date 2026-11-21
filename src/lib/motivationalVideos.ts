export type VideoCategory = 'Discipline' | 'Mindset' | 'Focus' | 'Stoic' | 'Execution';
export type VideoPlatform = 'youtube' | 'instagram';

export interface MotivationalVideo {
  id: string;
  platform: VideoPlatform;
  mediaId: string;
  youtubeId?: string; // backwards compatibility
  title: string;
  category: VideoCategory;
  url: string;
  notes?: string;
  addedAt: string;
  watched?: boolean;
  xpDeducted?: boolean; // True when -15 XP cost has been applied for view/scroll
  xpClaimed?: boolean;  // Backwards compatibility
}

export const DEFAULT_MOTIVATIONAL_VIDEOS: MotivationalVideo[] = [
  {
    id: 'mv-1',
    platform: 'youtube',
    mediaId: 'mgmVOuLgFB0',
    youtubeId: 'mgmVOuLgFB0',
    title: 'Why Do We Fall - Iconic Motivation & Resilience',
    category: 'Mindset',
    url: 'https://www.youtube.com/watch?v=mgmVOuLgFB0',
    addedAt: '2026-10-17T00:00:00.000Z',
    watched: false,
    xpDeducted: false,
  },
  {
    id: 'mv-2',
    platform: 'youtube',
    mediaId: 'wnHW6o8WMas',
    youtubeId: 'wnHW6o8WMas',
    title: 'Steve Jobs - Stay Hungry, Stay Foolish (Stanford Address)',
    category: 'Mindset',
    url: 'https://www.youtube.com/watch?v=wnHW6o8WMas',
    addedAt: '2026-10-17T00:00:00.000Z',
    watched: false,
    xpDeducted: false,
  },
  {
    id: 'mv-3',
    platform: 'youtube',
    mediaId: '26U_seo0a1g',
    youtubeId: '26U_seo0a1g',
    title: 'Arnold Schwarzenegger - The 6 Rules of Unstoppable Success',
    category: 'Discipline',
    url: 'https://www.youtube.com/watch?v=26U_seo0a1g',
    addedAt: '2026-10-17T00:00:00.000Z',
    watched: false,
    xpDeducted: false,
  },
  {
    id: 'mv-4',
    platform: 'youtube',
    mediaId: 'tbnzAVRZ9Xc',
    youtubeId: 'tbnzAVRZ9Xc',
    title: 'Kobe Bryant - The Mamba Mentality & Relentless Work Ethic',
    category: 'Execution',
    url: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc',
    addedAt: '2026-10-17T00:00:00.000Z',
    watched: false,
    xpDeducted: false,
  },
  {
    id: 'mv-5',
    platform: 'youtube',
    mediaId: 'b1nPFfioz_w',
    youtubeId: 'b1nPFfioz_w',
    title: 'Marcus Aurelius - Stoic Mindset When Life Gets Hard',
    category: 'Stoic',
    url: 'https://www.youtube.com/watch?v=b1nPFfioz_w',
    addedAt: '2026-10-17T00:00:00.000Z',
    watched: false,
    xpDeducted: false,
  },
];

export const DAILY_REELS_LIMIT = 10;
const VIDEOS_STORAGE_KEY = 'quantum_motivational_videos';

/**
 * Returns today's ISO date string YYYY-MM-DD
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Key for tracking viewed reel IDs on a given day
 */
export function getDailyReelsViewsKey(userId?: string, dateStr?: string): string {
  const today = dateStr || getTodayDateString();
  const uid = userId || 'default';
  return `quantum_reels_daily_views_${uid}_${today}`;
}

/**
 * Retrieves the list of reel IDs viewed today by the user
 */
export function getDailyViewedReelIds(userId?: string, dateStr?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getDailyReelsViewsKey(userId, dateStr);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Records a reel view for the daily quota.
 * Caps at DAILY_REELS_LIMIT (10 reels per day).
 */
export function recordDailyReelView(reelId: string, userId?: string): {
  allowed: boolean;
  viewedCount: number;
  limitReached: boolean;
  isFirstViewToday: boolean;
} {
  if (typeof window === 'undefined') {
    return { allowed: true, viewedCount: 1, limitReached: false, isFirstViewToday: true };
  }
  const key = getDailyReelsViewsKey(userId);
  const current = getDailyViewedReelIds(userId);

  if (current.includes(reelId)) {
    return {
      allowed: true,
      viewedCount: current.length,
      limitReached: current.length >= DAILY_REELS_LIMIT,
      isFirstViewToday: false,
    };
  }

  if (current.length >= DAILY_REELS_LIMIT) {
    return {
      allowed: false,
      viewedCount: current.length,
      limitReached: true,
      isFirstViewToday: false,
    };
  }

  const updated = [...current, reelId];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}

  return {
    allowed: true,
    viewedCount: updated.length,
    limitReached: updated.length >= DAILY_REELS_LIMIT,
    isFirstViewToday: true,
  };
}

/**
 * Shuffles an array with Fisher-Yates algorithm for randomized opening feeds
 */
export function shuffleVideos<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Extracts Instagram shortcode from URLs like:
 * - https://www.instagram.com/reel/C7xY9ZaB.../
 * - https://www.instagram.com/p/C7xY9ZaB.../
 * - https://www.instagram.com/reels/C7xY9ZaB.../
 * - https://instagram.com/tv/C7xY9ZaB.../
 */
export function extractInstagramId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  const match = clean.match(/(?:instagram\.com\/(?:p|reel|reels|tv)\/)([\w-]+)/i);
  return match ? match[1] : null;
}

/**
 * Extracts the 11-character YouTube video ID from various link formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - Raw 11-char ID
 */
export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;

  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Parses multiple links pasted from WhatsApp, Notes, Instagram, or text files.
 * Detects both Instagram Reels/Posts and YouTube videos/shorts.
 * Optionally applies a custom user-defined title or mood tag (e.g. "Sad", "Gym Beast", "Focus").
 */
export function parsePastedLinks(
  rawText: string, 
  defaultCategory: VideoCategory = 'Discipline',
  customTitle?: string
): Omit<MotivationalVideo, 'id'>[] {
  const chunks = rawText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  const results: Omit<MotivationalVideo, 'id'>[] = [];
  const seenKeys = new Set<string>();

  const trimmedTitle = customTitle?.trim();

  for (const chunk of chunks) {
    // 1. Check Instagram
    const igId = extractInstagramId(chunk);
    if (igId && !seenKeys.has(`ig-${igId}`)) {
      seenKeys.add(`ig-${igId}`);
      results.push({
        platform: 'instagram',
        mediaId: igId,
        youtubeId: igId,
        title: trimmedTitle 
          ? (chunks.length > 1 ? `${trimmedTitle} #${results.length + 1}` : trimmedTitle)
          : `Instagram Reel (${igId})`,
        category: defaultCategory,
        url: chunk.startsWith('http') ? chunk : `https://www.instagram.com/reel/${igId}/`,
        addedAt: new Date().toISOString(),
        watched: false,
        xpDeducted: false,
      });
      continue;
    }

    // 2. Check YouTube
    const yId = extractYoutubeId(chunk);
    if (yId && !seenKeys.has(`yt-${yId}`)) {
      seenKeys.add(`yt-${yId}`);
      results.push({
        platform: 'youtube',
        mediaId: yId,
        youtubeId: yId,
        title: trimmedTitle
          ? (chunks.length > 1 ? `${trimmedTitle} #${results.length + 1}` : trimmedTitle)
          : `Motivational Protocol (${yId.slice(0, 6)})`,
        category: defaultCategory,
        url: chunk.startsWith('http') ? chunk : `https://youtu.be/${yId}`,
        addedAt: new Date().toISOString(),
        watched: false,
        xpDeducted: false,
      });
    }
  }

  // If there was only 1 result matched and title has suffix, normalize to single title
  if (results.length === 1 && trimmedTitle) {
    results[0].title = trimmedTitle;
  }

  return results;
}

export function loadSavedVideos(settingsVideos?: MotivationalVideo[], uid?: string): MotivationalVideo[] {
  const normalize = (list: any[]): MotivationalVideo[] => {
    return list.map((item, idx) => ({
      ...item,
      platform: item.platform || (item.url?.includes('instagram.com') ? 'instagram' : 'youtube'),
      mediaId: item.mediaId || item.youtubeId || `media-${idx}`,
      xpDeducted: item.xpDeducted !== undefined ? item.xpDeducted : !!item.xpClaimed,
    }));
  };

  if (Array.isArray(settingsVideos) && settingsVideos.length > 0) {
    return normalize(settingsVideos);
  }

  if (typeof window !== 'undefined') {
    try {
      const scopedKey = uid ? `${VIDEOS_STORAGE_KEY}_${uid}` : VIDEOS_STORAGE_KEY;
      const raw = localStorage.getItem(scopedKey) || localStorage.getItem(VIDEOS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return normalize(parsed);
      }
    } catch {}
  }

  return DEFAULT_MOTIVATIONAL_VIDEOS;
}

export function saveStoredVideos(videos: MotivationalVideo[], uid?: string): void {
  if (typeof window !== 'undefined') {
    try {
      const scopedKey = uid ? `${VIDEOS_STORAGE_KEY}_${uid}` : VIDEOS_STORAGE_KEY;
      localStorage.setItem(scopedKey, JSON.stringify(videos));
      localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(videos));
    } catch {}
  }
}
