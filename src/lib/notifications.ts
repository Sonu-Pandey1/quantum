class NotificationService {
  private granted = false;

  constructor() {
    if ('Notification' in window) {
      this.granted = Notification.permission === 'granted';
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.granted = permission === 'granted';
    } else {
      this.granted = Notification.permission === 'granted';
    }
    
    return this.granted;
  }

  send(title: string, body: string) {
    if (!this.granted) return;

    try {
      new Notification(title, {
        body,
        icon: '/vite.svg', // generic icon
        badge: '/vite.svg'
      });
    } catch (e) {
      console.error("Notification failed", e);
    }
  }
}

export const notifier = new NotificationService();
