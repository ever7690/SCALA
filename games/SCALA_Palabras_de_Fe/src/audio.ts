export interface AudioSettings {
  sound: boolean;
  music: boolean;
}

export class GameAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private letterVoices = new Map<AudioBufferSourceNode, GainNode>();
  private music = new Audio('/audio/scala-amanecer.ogg');
  private active = false;
  private settings: AudioSettings = { sound: true, music: true };
  private files: Record<string, string> = {
    click: 'scala-toque.wav', select: 'scala-campanilla.wav', correct: 'confirmation_001.wav',
    bonus: 'glass_002.wav', wrong: 'error_008.wav', complete: 'confirmation_002.wav', shuffle: 'scala-mezcla.wav',
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
    if (!settings.sound) for (const [source, gain] of this.letterVoices) this.fadeLetter(source, gain);
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
    source.playbackRate.value = name === 'select' ? 1 + Math.min(Math.max(step, 0), 7) * 0.04 : 1;
    gain.gain.value = name === 'wrong' ? 0.25 : name === 'select' ? 0.24 : name === 'click' ? 0.18 : name === 'shuffle' ? 0.28 : 0.55;
    if (name === 'select') {
      if (this.letterVoices.size >= 3) {
        const oldest = this.letterVoices.entries().next().value;
        if (oldest) this.fadeLetter(oldest[0], oldest[1]);
      }
      this.letterVoices.set(source, gain);
    }
    source.onended = (): void => {
      this.letterVoices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.connect(gain).connect(this.context.destination);
    source.start();
  }

  pause(): void {
    this.music.pause();
    this.active = false;
    for (const [source, gain] of this.letterVoices) this.fadeLetter(source, gain);
  }

  private fadeLetter(source: AudioBufferSourceNode, gain: GainNode): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    gain.gain.setTargetAtTime(0, now, 0.008);
    source.stop(now + 0.04);
    this.letterVoices.delete(source);
  }

  private syncMusic(): void {
    if (this.active && this.settings.music && !document.hidden) void this.music.play().catch(() => undefined);
    else this.music.pause();
  }
}
