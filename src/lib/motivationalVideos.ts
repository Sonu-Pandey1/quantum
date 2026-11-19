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

const VIDEOS_STORAGE_KEY = 'quantum_motivational_videos';

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
 */
export function parsePastedLinks(rawText: string, defaultCategory: VideoCategory = 'Discipline'): Omit<MotivationalVideo, 'id'>[] {
  const chunks = rawText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  const results: Omit<MotivationalVideo, 'id'>[] = [];
  const seenKeys = new Set<string>();

  for (const chunk of chunks) {
    // 1. Check Instagram
    const igId = extractInstagramId(chunk);
    if (igId && !seenKeys.has(`ig-${igId}`)) {
      seenKeys.add(`ig-${igId}`);
      results.push({
        platform: 'instagram',
        mediaId: igId,
        youtubeId: igId,
        title: `Instagram Reel (${igId})`,
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
        title: `Motivational Protocol (${yId.slice(0, 6)})`,
        category: defaultCategory,
        url: chunk.startsWith('http') ? chunk : `https://youtu.be/${yId}`,
        addedAt: new Date().toISOString(),
        watched: false,
        xpDeducted: false,
      });
    }
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
