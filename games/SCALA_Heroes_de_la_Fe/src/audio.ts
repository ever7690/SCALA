import type { Settings } from './game.ts';
import soundDesign from './data/sound-design.json';

export type Cue = keyof typeof soundDesign;
export class GameAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<Cue, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private music = new Audio('/audio/heroes-luz-del-camino.ogg');
  private settings: Settings;
  private active = true;

  constructor(settings: Settings) {
    this.settings = settings;
    this.music.loop = true;
    this.music.preload = 'none';
    this.music.volume = 0.20;
  }
  async unlock(): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume().catch(() => undefined);
    if (!this.loading) this.loading = Promise.all((Object.keys(soundDesign) as Cue[]).map(async cue => {
      const response = await fetch('/audio/heroes-' + cue + '.wav');
      if (!response.ok) throw new Error('Audio unavailable');
      const buffer = await this.context!.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(cue, buffer);
    })).then(() => undefined).catch(() => { this.loading = null; });
    await this.loading;
    this.update(this.settings);
  }
  update(settings: Settings): void {
    this.settings = settings;
    if (settings.music && this.context && this.active) void this.music.play().catch(() => undefined);
    else this.music.pause();
  }
  setActive(active: boolean): void {
    this.active = active;
    this.update(this.settings);
    if (!active) void this.context?.suspend();
    else if (this.context) void this.context.resume().catch(() => undefined);
  }
  play(cue: Cue): void {
    if (!this.settings.sound || !this.active) return;
    const context = this.context;
    const buffer = this.buffers.get(cue);
    if (!context || !buffer || context.state !== 'running') return;
    const source = context.createBufferSource();
    const volume = context.createGain();
    source.buffer = buffer;
    volume.gain.value = soundDesign[cue].gain;
    source.connect(volume);
    volume.connect(context.destination);
    source.onended = () => { source.disconnect(); volume.disconnect(); };
    source.start(context.currentTime);
  }
}
