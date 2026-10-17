import { supabase } from './supabaseClient';

export interface QueuedMutation {
  id: string;
  table: string;
  action: 'upsert' | 'insert' | 'update';
  payload: any;
  matchKey?: string;
  matchValue?: any;
  timestamp: number;
  retries: number;
}

type SyncListener = (isOnline: boolean, pendingCount: number) => void;

class OfflineSyncManager {
  private readonly STORAGE_KEY = 'quantum_offline_mutation_queue';
  private listeners: Set<SyncListener> = new Set();
  private isProcessing = false;
  private onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.onlineStatus = true;
        this.notifyListeners();
        this.flushQueue();
      });

      window.addEventListener('offline', () => {
        this.onlineStatus = false;
        this.notifyListeners();
      });

      // Attempt to flush on startup if online
      if (this.onlineStatus) {
        setTimeout(() => this.flushQueue(), 3000);
      }
    }
  }

  public isOnline(): boolean {
    return this.onlineStatus;
  }

  public getPendingCount(): number {
    return this.getQueue().length;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.onlineStatus, this.getPendingCount());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const count = this.getPendingCount();
    this.listeners.forEach(fn => fn(this.onlineStatus, count));
  }

  private getQueue(): QueuedMutation[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  private saveQueue(queue: QueuedMutation[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch {}
    this.notifyListeners();
  }

  /**
   * Enqueue a database mutation to be synchronized when online.
   */
  public enqueue(mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries'>): void {
    const item: QueuedMutation = {
      ...mutation,
      id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    const queue = this.getQueue();
    queue.push(item);
    this.saveQueue(queue);

    // If online, attempt immediate flush
    if (this.onlineStatus) {
      this.flushQueue();
    }
  }

  /**
   * Replay all pending offline mutations to Supabase.
   */
  public async flushQueue(): Promise<number> {
    if (this.isProcessing || !supabase || !this.onlineStatus) return 0;
    const queue = this.getQueue();
    if (queue.length === 0) return 0;

    this.isProcessing = true;
    let successfulCount = 0;
    const remainingQueue: QueuedMutation[] = [];

    for (const item of queue) {
      try {
        let error: any = null;

        if (item.action === 'upsert') {
          const res = await supabase.from(item.table).upsert(item.payload);
          error = res.error;
        } else if (item.action === 'insert') {
          const res = await supabase.from(item.table).insert(item.payload);
          error = res.error;
        } else if (item.action === 'update' && item.matchKey && item.matchValue !== undefined) {
          const res = await supabase.from(item.table).update(item.payload).eq(item.matchKey, item.matchValue);
          error = res.error;
        }

        if (error) {
          console.warn(`[OfflineSync] Mutation failed for ${item.table}:`, error.message);
          if (item.retries < 5) {
            remainingQueue.push({ ...item, retries: item.retries + 1 });
          }
        } else {
          successfulCount++;
        }
      } catch (err) {
        console.warn(`[OfflineSync] Network error syncing ${item.table}:`, err);
        if (item.retries < 5) {
          remainingQueue.push({ ...item, retries: item.retries + 1 });
        }
      }
    }

    this.saveQueue(remainingQueue);
    this.isProcessing = false;

    if (successfulCount > 0) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success(`⚡ Synced ${successfulCount} offline update(s) to cloud database!`, {
          icon: '☁️',
          duration: 4000,
        });
      }).catch(() => {});
    }

    return successfulCount;
  }
}

export const syncQueue = new OfflineSyncManager();

