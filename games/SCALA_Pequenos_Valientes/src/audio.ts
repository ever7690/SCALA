import type { Settings } from './state.ts';

export const cues = ['home', 'feel', 'story', 'help', 'path', 'family', 'settings', 'back', 'select', 'practice', 'complete', 'voice', 'lock', 'toggle', 'calm', 'kindness', 'scala'] as const;
export type Cue = typeof cues[number];
export class AppAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<Cue, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private music = new Audio('/audio/valientes-jardin-tierno.ogg');
  private voice = new Audio();
  private unlocked = false;
  private active = true;
  private settings: Settings;
  private currentVoice: string | null = null;
  private musicTheme = 'tierno';
  onVoiceChange: (() => void) | null = null;

  constructor(settings: Settings) {
    this.settings = settings;
    this.music.loop = true;
    this.music.preload = 'none';
    this.voice.preload = 'none';
    this.voice.onended = () => { this.currentVoice = null; this.update(this.settings); this.onVoiceChange?.(); };
    this.voice.onerror = () => { this.currentVoice = null; this.update(this.settings); this.onVoiceChange?.(); };
  }
  async unlock(): Promise<void> {
    this.unlocked = true;
    if (!this.context) this.context = new AudioContext();
    await this.context.resume().catch(() => undefined);
    this.update(this.settings);
    if (!this.loading) this.loading = Promise.all(cues.map(async cue => {
      const response = await fetch(`/audio/valientes-${cue}.wav`);
      if (!response.ok) throw new Error('No se pudo cargar un sonido.');
      this.buffers.set(cue, await this.context!.decodeAudioData(await response.arrayBuffer()));
    })).then(() => undefined).catch(() => { this.loading = null; });
    await this.loading;
  }
  update(settings: Settings): void {
    this.settings = settings;
    if (settings.musicTheme !== this.musicTheme) {
      this.musicTheme = settings.musicTheme;
      this.music.src = settings.musicTheme === 'clasico' ? '/audio/valientes-mundo-amable.ogg' : '/audio/valientes-jardin-tierno.ogg';
      this.music.load();
    }
    this.music.volume = Math.max(0, Math.min(1, settings.music * (this.currentVoice ? 0.16 : 0.52)));
    this.voice.volume = settings.voice;
    if (this.active && this.unlocked && settings.music > 0) void this.music.play().catch(() => undefined);
    else this.music.pause();
    if (settings.voice === 0) this.stopVoice();
  }
  async playVoice(id: string): Promise<boolean> {
    if (!this.active || !this.unlocked || this.settings.voice === 0) return false;
    if (this.currentVoice === id && !this.voice.paused) { this.stopVoice(); return true; }
    this.stopVoice();
    this.voice.src = `/audio/voz-${id}.mp3`;
    this.currentVoice = id;
    this.update(this.settings);
    try { await this.voice.play(); this.onVoiceChange?.(); return true; }
    catch { this.stopVoice(); return false; }
  }
  stopVoice(): void {
    this.voice.pause();
    this.currentVoice = null;
    this.music.volume = Math.max(0, Math.min(1, this.settings.music * 0.52));
    this.onVoiceChange?.();
  }
  get speaking(): boolean { return this.currentVoice !== null && !this.voice.paused; }
  setActive(active: boolean): void {
    this.active = active;
    if (!active) { this.stopVoice(); this.music.pause(); void this.context?.suspend(); }
    else { void this.context?.resume(); this.update(this.settings); }
  }
  play(cue: Cue): void {
    if (!this.active || this.settings.sound === 0 || !this.context || this.context.state !== 'running') return;
    const buffer = this.buffers.get(cue);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = this.settings.sound * 0.55;
    source.connect(gain); gain.connect(this.context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
  }
}
