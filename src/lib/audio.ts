class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 1.0;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMute = localStorage.getItem('quantum_audio_muted');
        if (savedMute !== null) {
          this.isMuted = savedMute === 'true';
        }
        const savedVol = localStorage.getItem('quantum_audio_volume');
        if (savedVol !== null) {
          const v = parseFloat(savedVol);
          if (!isNaN(v)) this.volume = Math.max(0, Math.min(1, v));
        }
      } catch {}
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch {}
    }
  }

  isAudioMuted(): boolean {
    return this.isMuted;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quantum_audio_muted', this.isMuted.toString());
      } catch {}
    }
    return this.isMuted;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quantum_audio_muted', muted.toString());
      } catch {}
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quantum_audio_volume', this.volume.toString());
      } catch {}
    }
  }

  playClick() {
    if (this.isMuted || this.volume <= 0) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
      
      const peak = 0.05 * this.volume;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(peak, this.ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
      
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  playSuccess() {
    if (this.isMuted || this.volume <= 0) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, this.ctx.currentTime + 0.1); // C#
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.2); // E
      
      const peak = 0.1 * this.volume;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(peak, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(peak, this.ctx.currentTime + 0.2);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {}
  }
}

export const audio = new AudioManager();
