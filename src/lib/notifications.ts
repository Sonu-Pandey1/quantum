import { audio } from './audio';

class NotificationService {
  private granted = false;

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

  send(title: string, body: string, options?: { tag?: string; playSound?: boolean; vibrate?: boolean }) {
    // 1. Play acoustic chime if requested
    if (options?.playSound !== false) {
      try {
        audio.playSuccess();
      } catch (e) {}
    }

    // 2. Vibrate phone/device if supported
    if (options?.vibrate !== false && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch (e) {}
    }

    // 3. Dispatch system / phone notification
    if (!this.isSupported()) return;

    if (Notification.permission === 'granted') {
      this.granted = true;
    }

    if (!this.granted) return;

    try {
      const notifOptions: any = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: options?.tag || `quantum-notif-${Date.now()}`,
        renotify: true,
        requireInteraction: true,
      };

      // Try Service Worker registration first for mobile lock screen compatibility
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, notifOptions).catch(() => {
            new Notification(title, notifOptions);
          });
        }).catch(() => {
          new Notification(title, notifOptions);
        });
      } else {
        new Notification(title, notifOptions);
      }
    } catch (e) {
      console.error("Notification failed", e);
    }
  }
}

export const notifier = new NotificationService();

