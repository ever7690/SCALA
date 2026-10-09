export interface AudioSettings {
  sound: boolean;
  music: boolean;
}

export class GameAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private music = new Audio('/audio/scala-amanecer.ogg');
  private active = false;
  private settings: AudioSettings = { sound: true, music: true };
  private files: Record<string, string> = {
    click: 'click_003.wav', select: 'pluck_001.wav', correct: 'confirmation_001.wav',
    bonus: 'glass_002.wav', wrong: 'error_008.wav', complete: 'confirmation_002.wav', shuffle: 'back_001.wav',
  };

  constructor() {
    this.music.loop = true;
    this.music.volume = 0.16;
    this.music.preload = 'none';
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.music.pause();
      else this.syncMusic();
    });
  }

  configure(settings: AudioSettings): void {
    this.settings = settings;
    this.syncMusic();
  }

  async unlock(): Promise<void> {
    this.active = true;
    try {
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
      this.syncMusic();
      if (!this.loading) {
        const context = this.context;
        this.loading = Promise.all(Object.entries(this.files).map(async ([name, file]) => {
          const response = await fetch(`/audio/${file}`);
          if (!response.ok) return;
          this.buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
        })).then(() => undefined).catch(() => undefined);
      }
      await this.loading;
    } catch {
      this.context = null;
    }
  }

  play(name: string, step = 0): void {
    if (!this.settings.sound || !this.context || this.context.state !== 'running') return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = name === 'select' ? 1 + step * 0.06 : 1;
    gain.gain.value = name === 'wrong' ? 0.25 : name === 'select' ? 0.3 : 0.55;
    source.connect(gain).connect(this.context.destination);
    source.start();
  }

  pause(): void {
    this.music.pause();
    this.active = false;
  }

  private syncMusic(): void {
    if (this.active && this.settings.music && !document.hidden) void this.music.play().catch(() => undefined);
    else this.music.pause();
  }
}
