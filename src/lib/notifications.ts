import { audio } from './audio';

export interface NotificationLog {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  tag?: string;
}

class NotificationService {
  private granted = false;
  private readonly HISTORY_KEY = 'quantum_notifications_history';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.granted = Notification.permission === 'granted';
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public isGranted(): boolean {
    if (!this.isSupported()) return false;
    return Notification.permission === 'granted';
  }

  public getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.granted = permission === 'granted';
      } else {
        this.granted = Notification.permission === 'granted';
      }
    } catch (e) {
      console.error("Failed requesting notification permission", e);
      this.granted = false;
    }
    
    return this.granted;
  }

  public getHistory(): NotificationLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  public clearHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.HISTORY_KEY);
    } catch {}
  }

  private saveToHistory(title: string, body: string, tag?: string) {
    if (typeof window === 'undefined') return;
    try {
      const history = this.getHistory();
      const updated: NotificationLog[] = [
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          body,
          timestamp: new Date().toISOString(),
          tag,
        },
        ...history.slice(0, 29), // keep latest 30
      ];
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(updated));
    } catch {}
  }

  send(
    title: string, 
    body: string, 
    options?: { 
      tag?: string; 
      playSound?: boolean; 
      vibrate?: boolean; 
      fallbackToast?: boolean;
      requireInteraction?: boolean;
    }
  ) {
    // 1. Play acoustic chime if requested
    if (options?.playSound !== false) {
      try {
        audio.playSuccess();
      } catch (e) {}
    }

    // 2. Vibrate phone/device if supported
    if (options?.vibrate !== false && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch (e) {}
    }

    // 3. Save to local notification history
    this.saveToHistory(title, body, options?.tag);

    // 4. Dispatch system notification if granted
    let systemNotifSent = false;
    if (this.isSupported() && Notification.permission === 'granted') {
      this.granted = true;
      try {
        const notifOptions: any = {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: options?.tag || `quantum-notif-${Date.now()}`,
          renotify: true,
          requireInteraction: options?.requireInteraction ?? false,
        };

        if ('serviceWorker' in navigator) {
          // Race between SW ready and fallback to avoid stalling
          const swTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
          Promise.race([navigator.serviceWorker.ready, swTimeout])
            .then((reg) => {
              if (reg && 'showNotification' in reg) {
                reg.showNotification(title, notifOptions).catch(() => {
                  this.safeCreateNotification(title, notifOptions);
                });
              } else {
                this.safeCreateNotification(title, notifOptions);
              }
            })
            .catch(() => {
              this.safeCreateNotification(title, notifOptions);
            });
          systemNotifSent = true;
        } else {
          systemNotifSent = this.safeCreateNotification(title, notifOptions);
        }
      } catch (e) {
        console.warn("System notification dispatch warning:", e);
      }
    }

    // 5. In-app toast fallback when system notification was not delivered
    if (!systemNotifSent && options?.fallbackToast !== false) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast(
          `${title}: ${body}`,
          {
            icon: '🔔',
            duration: 4000,
            style: {
              background: '#0d1117',
              color: '#e6edf3',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: '12px',
              fontWeight: 600,
            }
          }
        );
      }).catch(() => {});
    }
  }

  private safeCreateNotification(title: string, options: any): boolean {
    try {
      if (typeof Notification !== 'undefined') {
        new Notification(title, options);
        return true;
      }
    } catch {
      // In some Android/PWA contexts, new Notification() throws TypeError: Illegal constructor
    }
    return false;
  }
}

export const notifier = new NotificationService();
