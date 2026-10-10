import { Preferences } from '@capacitor/preferences';
import { initialState, restoreState, type State } from './state.ts';

export const STORAGE_KEY = 'scala-pequenos-valientes-v1';
let queue: Promise<void> = Promise.resolve();
let lastValid = '';
export async function loadState(): Promise<{ state: State; recovered: boolean }> {
  for (const [key, recovered] of [[STORAGE_KEY, false], [STORAGE_KEY + '-backup', true]] as const) {
    try {
      const { value } = await Preferences.get({ key });
      if (!value) continue;
      const raw = JSON.parse(value);
      if (!raw || raw.version !== 1) continue;
      const state = restoreState(raw);
      lastValid = JSON.stringify(state);
      return { state, recovered };
    } catch { continue; }
  }
  return { state: initialState(), recovered: false };
}
export function saveState(state: State): Promise<void> {
  const snapshot = JSON.stringify(restoreState(state));
  const write = queue.then(async () => {
    if (lastValid) await Preferences.set({ key: STORAGE_KEY + '-backup', value: lastValid });
    await Preferences.set({ key: STORAGE_KEY, value: snapshot });
    lastValid = snapshot;
  });
  queue = write.catch(() => undefined);
  return write;
}
export async function flushState(): Promise<void> { await queue; }
