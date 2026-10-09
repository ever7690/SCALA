import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { SavedGameState } from './game-engine';

export const SAVE_KEY = 'scala.palabras-de-fe.v1';

export interface AppSave {
  version: 1;
  updatedAt: number;
  game: SavedGameState;
  coins: number;
  rewardedLevels: string[];
  creditedWords: string[];
  lastDaily: string;
  streak: number;
  sound: boolean;
  music: boolean;
  haptic: boolean;
  tutorialSeen: boolean;
  started: boolean;
}

export function parseSave(raw: string | null): AppSave | null {
  if (!raw) return null;
  try {
    const save = JSON.parse(raw) as AppSave;
    if (save.version !== 1 || !save.game || typeof save.game.levels !== 'object'
      || !Number.isFinite(save.coins) || save.coins < 0
      || !Array.isArray(save.rewardedLevels) || !Array.isArray(save.creditedWords)) return null;
    return {
      ...save,
      sound: save.sound !== false,
      music: save.music !== false,
      haptic: save.haptic === true,
      streak: Number.isFinite(save.streak) ? Math.max(0, save.streak) : 0,
      lastDaily: typeof save.lastDaily === 'string' ? save.lastDaily : '',
      updatedAt: Number.isFinite(save.updatedAt) ? save.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function dailyReward(save: Pick<AppSave, 'lastDaily' | 'streak'>, today: string): { amount: number; streak: number } {
  if (save.lastDaily === today) return { amount: 0, streak: save.streak };
  const streak = dayNumber(today) - dayNumber(save.lastDaily) === 1 ? save.streak + 1 : 1;
  return { amount: 50 + Math.min(streak - 1, 6) * 10, streak };
}

export class SaveStore {
  private queue: Promise<void> = Promise.resolve();

  async load(): Promise<AppSave | null> {
    let local: AppSave | null;
    try { local = parseSave(localStorage.getItem(SAVE_KEY)); } catch { local = null; }
    if (!Capacitor.isNativePlatform()) return local;
    try {
      const native = parseSave((await Preferences.get({ key: SAVE_KEY })).value);
      return native && (!local || native.updatedAt > local.updatedAt) ? native : local;
    } catch { return local; }
  }

  write(save: AppSave): Promise<void> {
    const value = JSON.stringify(save);
    let localError = false;
    try { localStorage.setItem(SAVE_KEY, value); } catch { localError = true; }
    if (!Capacitor.isNativePlatform()) return localError ? Promise.reject(new Error('No se pudo guardar')) : Promise.resolve();
    this.queue = this.queue.catch(() => undefined).then(() => Preferences.set({ key: SAVE_KEY, value }));
    return this.queue;
  }
}
