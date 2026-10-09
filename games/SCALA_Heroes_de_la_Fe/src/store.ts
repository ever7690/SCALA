import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { freshSave, restoreSave, storageKey, type Save } from './game.ts';

export class ProgressStore {
  private queue: Promise<void> = Promise.resolve();

  async read(): Promise<{ save: Save; recovered: boolean }> {
    let raw: string | null;
    if (Capacitor.isNativePlatform()) raw = (await Preferences.get({ key: storageKey })).value;
    else raw = localStorage.getItem(storageKey);
    if (!raw) return { save: freshSave(), recovered: false };
    try { return { save: restoreSave(JSON.parse(raw)), recovered: false }; }
    catch { return { save: freshSave(), recovered: true }; }
  }

  write(save: Save): Promise<void> {
    const value = JSON.stringify(save);
    const write = async (): Promise<void> => {
      if (Capacitor.isNativePlatform()) await Preferences.set({ key: storageKey, value });
      else localStorage.setItem(storageKey, value);
    };
    this.queue = this.queue.catch(() => undefined).then(write);
    return this.queue;
  }
}
