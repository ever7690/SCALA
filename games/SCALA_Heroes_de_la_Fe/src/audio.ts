import type { Settings } from './game.ts';

export type Cue = 'tap' | 'correct' | 'reflect' | 'aid' | 'finish';
export class GameAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private music = new Audio('/audio/scala-amanecer.ogg');
  private settings: Settings;
  private active = true;

  constructor(settings: Settings) {
    this.settings = settings;
    this.music.loop = true;
    this.music.preload = 'none';
    this.music.volume = 0.10;
  }
  async unlock(): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume().catch(() => undefined);
    if (!this.loading) this.loading = Promise.all(['scala-toque', 'scala-campanilla', 'scala-mezcla'].map(async name => {
      const response = await fetch('/audio/' + name + '.wav');
      if (!response.ok) throw new Error('Audio unavailable');
      const buffer = await this.context!.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(name, buffer);
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
  private note(name: string, gain: number, rate: number, delay = 0): void {
    const context = this.context;
    const buffer = this.buffers.get(name);
    if (!context || !buffer || context.state !== 'running') return;
    const source = context.createBufferSource();
    const volume = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    volume.gain.value = gain;
    source.connect(volume);
    volume.connect(context.destination);
    source.start(context.currentTime + delay);
  }
  play(cue: Cue): void {
    if (!this.settings.sound || !this.active) return;
    if (cue === 'tap') this.note('scala-toque', 0.18, 1);
    else if (cue === 'correct') this.note('scala-campanilla', 0.24, 1);
    else if (cue === 'reflect') this.note('scala-campanilla', 0.11, 0.76);
    else if (cue === 'aid') this.note('scala-mezcla', 0.22, 1);
    else {
      this.note('scala-campanilla', 0.16, 1);
      this.note('scala-campanilla', 0.14, 1.25, 0.14);
      this.note('scala-campanilla', 0.12, 1.5, 0.28);
    }
  }
}
