import { lessons, type Mood } from './content.ts';

export interface Settings {
  music: number;
  sound: number;
  voice: number;
  motion: boolean;
  largeText: boolean;
  musicTheme: 'tierno' | 'clasico';
}
export interface PinRecord {
  salt: string;
  hash: string;
  recoverySalt: string;
  recoveryHash: string;
}
export interface State {
  version: 1;
  completed: string[];
  attempts: Record<string, number>;
  settings: Settings;
  pin: PinRecord | null;
  failedPins: number;
  pinBlockedUntil: number;
  session: { lessonId: string; step: number } | null;
  kindness: number[];
}

export const defaultSettings: Settings = { music: 0.22, sound: 0.5, voice: 0.9, motion: true, largeText: false, musicTheme: 'tierno' };
export function initialState(): State {
  return { version: 1, completed: [], attempts: {}, settings: { ...defaultSettings }, pin: null, failedPins: 0, pinBlockedUntil: 0, session: null, kindness: [] };
}
const finite = (value: unknown, fallback: number, max = 1): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback;
const hex = (value: unknown, length: number): value is string => typeof value === 'string' && value.length === length && /^[a-f0-9]+$/u.test(value);

export function restoreState(raw: unknown): State {
  const base = initialState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const value = raw as Partial<State>;
  if (value.version !== 1) return base;
  const ids = new Set(lessons.map(lesson => lesson.id));
  base.completed = Array.isArray(value.completed) ? [...new Set(value.completed.filter(id => typeof id === 'string' && ids.has(id)))] : [];
  if (value.attempts && typeof value.attempts === 'object' && !Array.isArray(value.attempts)) {
    for (const id of ids) if (id in value.attempts) base.attempts[id] = Math.floor(finite(value.attempts[id], 0, 100000));
  }
  if (value.settings && typeof value.settings === 'object') {
    base.settings = {
      music: finite(value.settings.music, defaultSettings.music), sound: finite(value.settings.sound, defaultSettings.sound), voice: finite(value.settings.voice, defaultSettings.voice),
      motion: typeof value.settings.motion === 'boolean' ? value.settings.motion : true,
      largeText: typeof value.settings.largeText === 'boolean' ? value.settings.largeText : false,
      musicTheme: value.settings.musicTheme === 'clasico' ? 'clasico' : 'tierno',
    };
  }
  const pin = value.pin;
  if (pin && hex(pin.salt, 32) && hex(pin.hash, 64) && hex(pin.recoverySalt, 32) && hex(pin.recoveryHash, 64)) base.pin = { ...pin };
  base.failedPins = Math.floor(finite(value.failedPins, 0, 10000));
  base.pinBlockedUntil = finite(value.pinBlockedUntil, 0, Number.MAX_SAFE_INTEGER);
  if (value.session && ids.has(value.session.lessonId) && Number.isInteger(value.session.step) && value.session.step >= 0 && value.session.step <= 3) base.session = { ...value.session };
  base.kindness = Array.isArray(value.kindness) ? [...new Set(value.kindness.filter(id => Number.isInteger(id) && id >= 0 && id < 30))] : [];
  return base;
}
export function recordPractice(state: State, id: string): State {
  if (!lessons.some(lesson => lesson.id === id)) return state;
  return { ...state, attempts: { ...state.attempts, [id]: (state.attempts[id] || 0) + 1 } };
}
export function completeLesson(state: State, id: string): State {
  if (!lessons.some(lesson => lesson.id === id)) return state;
  return { ...state, completed: [...new Set([...state.completed, id])], session: null };
}
export function nextLesson(state: State): string {
  return lessons.find(lesson => !state.completed.includes(lesson.id))?.id || lessons[0].id;
}
export function isMood(value: string): value is Mood {
  return ['alegre', 'tranquilo', 'triste', 'enojado', 'preocupado'].includes(value);
}
export function pinFailure(state: State, now: number): State {
  const failures = state.failedPins + 1;
  return { ...state, failedPins: failures, pinBlockedUntil: failures % 5 === 0 ? now + Math.min(300000, 30000 * Math.ceil(failures / 5)) : state.pinBlockedUntil };
}
export function resetProgress(state: State): State {
  return { ...state, completed: [], attempts: {}, session: null, kindness: [] };
}
