import type { Settings } from './state.ts';

export const cues = ['home', 'feel', 'story', 'help', 'path', 'family', 'settings', 'back', 'select', 'practice', 'complete', 'voice', 'lock', 'toggle', 'calm', 'kindness', 'scala'] as const;
export type Cue = typeof cues[number];
export class AppAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<Cue, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private music = new Audio('/audio/valientes-fondo-scala.mp3');
  private voice = new Audio();
  private unlocked = false;
  private active = true;
  private settings: Settings;
  private currentVoice: string | null = null;
  private voiceEpoch = 0;
  private fade = 0;
  onVoiceChange: (() => void) | null = null;

  constructor(settings: Settings) {
    this.settings = settings;
    this.music.id = 'background-music';
    this.voice.id = 'story-voice';
    this.music.loop = true;
    this.music.preload = 'auto';
    this.voice.preload = 'none';
    this.voice.onended = () => this.stopVoice();
    this.voice.onerror = () => this.stopVoice();
  }
  async unlock(): Promise<void> {
    this.unlocked = true;
    if (!this.context) this.context = new AudioContext();
    await this.context.resume().catch(() => undefined);
    this.update(this.settings);
    if (!this.loading) this.loading = Promise.all(cues.map(async cue => {
      const response = await fetch('/audio/valientes-' + cue + '.wav');
      if (!response.ok) throw new Error('No se pudo cargar un sonido.');
      this.buffers.set(cue, await this.context!.decodeAudioData(await response.arrayBuffer()));
    })).then(() => undefined).catch(() => { this.loading = null; });
    await this.loading;
  }
  private musicVolume(immediate = false): void {
    cancelAnimationFrame(this.fade);
    const target = Math.max(0, Math.min(1, this.settings.music * (this.currentVoice ? .16 : .52)));
    if (immediate || target === 0) { this.music.volume = target; return; }
    const initial = this.music.volume;
    const start = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / 260);
      this.music.volume = initial + (target - initial) * progress;
      if (progress < 1) this.fade = requestAnimationFrame(tick);
    };
    this.fade = requestAnimationFrame(tick);
  }
  update(settings: Settings): void {
    this.settings = settings;
    this.musicVolume(true);
    this.voice.volume = settings.voice;
    if (this.active && settings.music > 0) void this.music.play().catch(() => undefined);
    else this.music.pause();
    if (settings.voice === 0 && this.currentVoice) this.stopVoice();
  }
  async playVoice(id: string): Promise<boolean> {
    if (!this.active || !this.unlocked || this.settings.voice === 0) return false;
    if (this.currentVoice === id && !this.voice.paused) { this.stopVoice(); return true; }
    this.stopVoice();
    const epoch = ++this.voiceEpoch;
    this.voice.src = '/audio/voz-' + id + '.mp3';
    this.currentVoice = id;
    this.voice.volume = this.settings.voice;
    this.musicVolume();
    try {
      await this.voice.play();
      if (epoch !== this.voiceEpoch) return false;
      this.onVoiceChange?.();
      return true;
    } catch {
      if (epoch === this.voiceEpoch) this.stopVoice();
      return false;
    }
  }
  stopVoice(): void {
    this.voiceEpoch++;
    this.voice.pause();
    this.currentVoice = null;
    this.musicVolume();
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
    gain.gain.value = this.settings.sound * .55;
    source.connect(gain); gain.connect(this.context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
  }
}
