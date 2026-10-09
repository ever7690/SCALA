import rawHeroes from './data/heroes.json' with { type: 'json' };
import rawQuestions from './data/questions.json' with { type: 'json' };

export interface Hero {
  id: string;
  name: string;
  title: string;
  quality: string;
  xp: number;
  book: string;
  description: string;
  color: string;
}
export interface Question {
  id: string;
  heroId: string;
  prompt: string;
  choices: string[];
  answer: number;
  reference: string;
  verseKeys: string[];
  verse: string;
  explanation: string;
  evidence: string[];
  difficulty: number;
}
export type Mode = 'journey' | 'practice' | 'daily' | 'duel';
export type Aid = 'half' | 'verse' | 'pause';
export interface Settings {
  sound: boolean;
  music: boolean;
  haptic: boolean;
  reducedMotion: boolean;
}
export interface Answer {
  choice: number;
  correct: boolean;
}
export interface Session {
  id: string;
  mode: Mode;
  heroId: string;
  dateKey: string;
  seed: number;
  questionIds: string[];
  choiceOrders: number[][];
  index: number;
  answers: (Answer | null)[];
  elapsedMs: number;
  penaltyMs: number;
  frozenMsLeft: number;
  freezeUsed: boolean;
  halfUsed: boolean;
  verseUsed: boolean;
  removedChoices: number[];
  finished: boolean;
  settled: boolean;
  rewardXp: number;
  rewardCoins: number;
}
export interface RoundSummary {
  id: string;
  heroId: string;
  mode: Mode;
  correct: number;
  total: number;
  elapsedMs: number;
  dateKey: string;
}
export interface Duel {
  names: [string, string];
  heroId: string;
  seed: number;
  questionIds: string[];
  stage: number;
  results: (RoundSummary | null)[];
}
export interface Save {
  schemaVersion: number;
  updatedAt: number;
  xp: number;
  coins: number;
  rounds: number;
  correct: number;
  bestStreak: number;
  heroBest: Record<string, number>;
  mastery: string[];
  favorites: string[];
  completedDaily: string[];
  history: RoundSummary[];
  settings: Settings;
  session: Session | null;
  duel: Duel | null;
}
export const heroes = rawHeroes as Hero[];
export const questions = rawQuestions as Question[];
export const questionMap = new Map(questions.map(question => [question.id, question]));
export const aidCosts: Record<Aid, number> = { half: 25, verse: 20, pause: 30 };
export const storageKey = 'scala.heroes-de-fe.v1';

export function freshSave(): Save {
  return { schemaVersion: 1, updatedAt: 0, xp: 0, coins: 120, rounds: 0, correct: 0, bestStreak: 0, heroBest: {}, mastery: [], favorites: [], completedDaily: [], history: [], settings: { sound: true, music: true, haptic: true, reducedMotion: false }, session: null, duel: null };
}

export function dateKey(date = new Date()): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

export function seedFrom(text: string): number {
  let value = 2166136261;
  for (const letter of text) value = Math.imul(value ^ letter.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function shuffled<T>(source: T[], seed: number): T[] {
  const result = [...source];
  let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    const random = ((value ^ value >>> 14) >>> 0) / 4294967296;
    const j = Math.floor(random * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function unlocked(save: Save, heroId: string): boolean {
  const hero = heroes.find(item => item.id === heroId);
  return !!hero && save.xp >= hero.xp;
}

export function roundQuestions(save: Save, mode: Mode, heroId: string, seed: number, day: string): string[] {
  if (mode === 'daily') {
    return shuffled(heroes.map(hero => {
      const bank = questions.filter(question => question.heroId === hero.id);
      return shuffled(bank, seedFrom(day + ':' + hero.id))[0].id;
    }), seedFrom(day + ':daily'));
  }
  const bank = shuffled(questions.filter(question => question.heroId === heroId), seed);
  const fresh = bank.filter(question => !save.mastery.includes(question.id));
  const seen = bank.filter(question => save.mastery.includes(question.id));
  return (mode === 'duel' ? bank : [...fresh, ...seen]).slice(0, 12).map(question => question.id);
}

export function startSession(save: Save, mode: Mode, heroId: string, seed: number, day = dateKey(), forcedIds?: string[]): Session | null {
  if (!heroes.some(hero => hero.id === heroId)) return null;
  if (mode !== 'daily' && !unlocked(save, heroId)) return null;
  const ids = forcedIds ? [...forcedIds] : roundQuestions(save, mode, heroId, seed, day);
  if (ids.length !== 12 || new Set(ids).size !== 12 || ids.some(id => !questionMap.has(id))) return null;
  const session: Session = {
    id: mode + ':' + heroId + ':' + seed + ':' + save.rounds + ':' + (mode === 'duel' ? save.duel?.stage : 0) + ':' + Date.now(), mode, heroId, dateKey: day, seed,
    questionIds: ids, choiceOrders: ids.map((id, index) => shuffled([0, 1, 2, 3], seedFrom(id + ':' + seed + ':' + index))),
    index: 0, answers: ids.map(() => null), elapsedMs: 0, penaltyMs: 0, frozenMsLeft: 0, freezeUsed: false,
    halfUsed: false, verseUsed: false, removedChoices: [], finished: false, settled: false, rewardXp: 0, rewardCoins: 0,
  };
  save.session = session;
  return session;
}

export function currentQuestion(save: Save): Question | null {
  const session = save.session;
  return session ? questionMap.get(session.questionIds[session.index]) ?? null : null;
}

export function answerQuestion(save: Save, choice: number): Answer | null {
  const session = save.session;
  const question = currentQuestion(save);
  if (!session || !question || session.finished || session.answers[session.index] || !Number.isInteger(choice) || choice < 0 || choice >= question.choices.length || session.removedChoices.includes(choice)) return null;
  const answer = { choice, correct: choice === question.answer };
  session.answers[session.index] = answer;
  if (!answer.correct && session.mode !== 'practice') session.penaltyMs += 5000;
  return answer;
}

export function currentStreak(session: Session): number {
  let streak = 0;
  for (const answer of session.answers) {
    if (!answer) break;
    streak = answer.correct ? streak + 1 : 0;
  }
  return streak;
}

export function tickSession(save: Save, milliseconds: number): void {
  const session = save.session;
  if (!session || session.finished || session.mode === 'practice' || session.answers[session.index]) return;
  let amount = Math.max(0, Math.min(2000, milliseconds));
  if (session.frozenMsLeft > 0) {
    const frozen = Math.min(amount, session.frozenMsLeft);
    session.frozenMsLeft -= frozen;
    amount -= frozen;
  }
  session.elapsedMs += amount;
}

export function useAid(save: Save, aid: Aid): { applied: boolean; reason?: string; cost: number } {
  const session = save.session;
  const question = currentQuestion(save);
  if (!session || !question || session.finished || session.answers[session.index]) return { applied: false, reason: 'La ayuda está disponible antes de responder.', cost: 0 };
  if (session.mode === 'duel') return { applied: false, reason: 'El duelo se juega con las mismas condiciones para ambos.', cost: 0 };
  if (aid === 'half' && session.halfUsed || aid === 'verse' && session.verseUsed || aid === 'pause' && session.freezeUsed) return { applied: false, reason: 'Ya utilizaste esta ayuda.', cost: 0 };
  if (!(aid in aidCosts)) return { applied: false, cost: 0 };
  const cost = session.mode === 'practice' ? 0 : aidCosts[aid];
  if (save.coins < cost) return { applied: false, reason: 'Necesitas ' + cost + ' monedas para esta ayuda.', cost: 0 };
  save.coins -= cost;
  if (aid === 'half') {
    session.halfUsed = true;
    session.removedChoices = shuffled([0, 1, 2, 3].filter(index => index !== question.answer), seedFrom(session.id + ':' + session.index)).slice(0, 2);
  } else if (aid === 'verse') session.verseUsed = true;
  else { session.freezeUsed = true; session.frozenMsLeft = 12000; }
  return { applied: true, cost };
}

export function settleSession(save: Save): RoundSummary | null {
  const session = save.session;
  if (!session || session.answers.some(answer => !answer)) return null;
  const correct = session.answers.filter(answer => answer?.correct).length;
  const summary: RoundSummary = { id: session.id, heroId: session.heroId, mode: session.mode, correct, total: session.questionIds.length, elapsedMs: session.elapsedMs + session.penaltyMs, dateKey: session.dateKey };
  if (session.settled) return summary;
  session.finished = true;
  session.settled = true;
  if (session.mode === 'duel') {
    if (save.duel && save.duel.stage < 2) {
      save.duel.results[save.duel.stage] = summary;
      save.duel.stage++;
    }
    return summary;
  }
  let streak = 0;
  let peak = 0;
  let chainBonus = 0;
  session.answers.forEach((answer, index) => {
    if (answer?.correct) {
      streak++;
      peak = Math.max(peak, streak);
      if (streak % 3 === 0) chainBonus += 5;
      if (!save.mastery.includes(session.questionIds[index])) save.mastery.push(session.questionIds[index]);
    } else streak = 0;
  });
  const earns = session.mode === 'journey' || session.mode === 'daily' && !save.completedDaily.includes(session.dateKey);
  if (earns) {
    session.rewardXp = correct * 15 + chainBonus + 20;
    session.rewardCoins = correct * 3 + 10;
    if (session.mode === 'daily') {
      session.rewardXp += 25;
      session.rewardCoins += 20;
      save.completedDaily.push(session.dateKey);
      save.completedDaily = save.completedDaily.slice(-366);
    }
    save.xp += session.rewardXp;
    save.coins += session.rewardCoins;
  }
  save.rounds++;
  save.correct += correct;
  save.bestStreak = Math.max(save.bestStreak, peak);
  if (session.mode === 'journey') save.heroBest[session.heroId] = Math.max(save.heroBest[session.heroId] ?? 0, correct);
  save.history.unshift(summary);
  save.history = save.history.slice(0, 100);
  return summary;
}

export function advanceSession(save: Save): 'next' | 'finished' | 'blocked' {
  const session = save.session;
  if (!session || !session.answers[session.index]) return 'blocked';
  if (session.index >= session.questionIds.length - 1) { settleSession(save); return 'finished'; }
  session.index++;
  session.halfUsed = false;
  session.verseUsed = false;
  session.removedChoices = [];
  return 'next';
}

export function stars(correct: number): number {
  return correct >= 12 ? 3 : correct >= 9 ? 2 : correct >= 6 ? 1 : 0;
}

export function startDuel(save: Save, names: [string, string], heroId: string, seed: number, day = dateKey()): boolean {
  if (!unlocked(save, heroId)) return false;
  const ids = roundQuestions(save, 'duel', heroId, seed, day);
  const cleaned = names.map(name => name.trim().slice(0, 18));
  save.duel = { names: [cleaned[0] || 'Jugador 1', cleaned[1] || 'Jugador 2'], heroId, seed, questionIds: ids, stage: 0, results: [null, null] };
  return !!startSession(save, 'duel', heroId, seed, day, ids);
}

export function secondDuelTurn(save: Save): boolean {
  const duel = save.duel;
  if (!duel || duel.stage !== 1 || !duel.results[0] || duel.results[1] || save.session?.mode === 'duel' && !save.session.finished) return false;
  return !!startSession(save, 'duel', duel.heroId, duel.seed, save.session?.dateKey ?? dateKey(), duel.questionIds);
}

export function duelWinner(duel: Duel): number | null {
  const [first, second] = duel.results;
  if (!first || !second) return null;
  if (first.correct !== second.correct) return first.correct > second.correct ? 0 : 1;
  if (Math.abs(first.elapsedMs - second.elapsedMs) < 100) return -1;
  return first.elapsedMs < second.elapsedMs ? 0 : 1;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function number(value: unknown, fallback = 0, maximum = 999999): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : fallback;
}
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : [];
}

function restoreSession(raw: unknown): Session | null {
  const data = object(raw);
  const ids = stringList(data.questionIds);
  if (!['journey', 'practice', 'daily', 'duel'].includes(String(data.mode)) || ids.length !== 12 || ids.some(id => !questionMap.has(id)) || !heroes.some(hero => hero.id === data.heroId)) return null;
  const index = number(data.index, 0, 11);
  const originalAnswers = Array.isArray(data.answers) ? data.answers : [];
  const answers = ids.map((id, position) => {
    const answer = object(originalAnswers[position]);
    const choice = typeof answer.choice === 'number' ? answer.choice : -1;
    return Number.isInteger(choice) && choice >= 0 && choice < 4 ? { choice, correct: choice === questionMap.get(id)?.answer } : null;
  });
  if (answers.slice(0, index).some(answer => !answer) || answers.slice(index + 1).some(answer => answer)) return null;
  const seed = number(data.seed, 0, 4294967295);
  const orders = ids.map((id, position) => shuffled([0, 1, 2, 3], seedFrom(id + ':' + seed + ':' + position)));
  return {
    id: typeof data.id === 'string' ? data.id : 'restored:' + seed,
    mode: data.mode as Mode, heroId: String(data.heroId), dateKey: typeof data.dateKey === 'string' ? data.dateKey : dateKey(), seed,
    questionIds: ids, choiceOrders: orders, index, answers, elapsedMs: number(data.elapsedMs, 0, 86400000), penaltyMs: number(data.penaltyMs, 0, 60000),
    frozenMsLeft: number(data.frozenMsLeft, 0, 12000), freezeUsed: data.freezeUsed === true, halfUsed: data.halfUsed === true, verseUsed: data.verseUsed === true,
    removedChoices: Array.isArray(data.removedChoices) ? [...new Set(data.removedChoices.filter((choice): choice is number => Number.isInteger(choice) && choice >= 0 && choice < 4 && choice !== questionMap.get(ids[index])?.answer))].slice(0, 2) : [],
    finished: data.finished === true && answers.every(Boolean), settled: data.settled === true && answers.every(Boolean),
    rewardXp: number(data.rewardXp, 0, 300), rewardCoins: number(data.rewardCoins, 0, 100),
  };
}

function restoreSummary(raw: unknown): RoundSummary | null {
  const data = object(raw);
  if (typeof data.id !== 'string' || !heroes.some(hero => hero.id === data.heroId) || !['journey', 'practice', 'daily', 'duel'].includes(String(data.mode))) return null;
  return { id: data.id, heroId: String(data.heroId), mode: data.mode as Mode, correct: number(data.correct, 0, 12), total: 12, elapsedMs: number(data.elapsedMs, 0, 86400000), dateKey: typeof data.dateKey === 'string' ? data.dateKey : '' };
}

export function restoreSave(raw: unknown): Save {
  const data = object(raw);
  const result = freshSave();
  if (data.schemaVersion !== 1) return result;
  for (const field of ['updatedAt', 'xp', 'coins', 'rounds', 'correct', 'bestStreak'] as const) result[field] = number(data[field], field === 'coins' ? 120 : 0, field === 'updatedAt' ? Number.MAX_SAFE_INTEGER : 999999);
  const preferences = object(data.settings);
  for (const key of Object.keys(result.settings) as (keyof Settings)[]) if (typeof preferences[key] === 'boolean') result.settings[key] = preferences[key];
  result.mastery = stringList(data.mastery).filter(id => questionMap.has(id));
  result.favorites = stringList(data.favorites).filter(id => questionMap.has(id));
  result.completedDaily = stringList(data.completedDaily).filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day)).slice(-366);
  const best = object(data.heroBest);
  result.heroBest = Object.fromEntries(heroes.filter(hero => hero.id in best).map(hero => [hero.id, number(best[hero.id], 0, 12)]));
  result.history = (Array.isArray(data.history) ? data.history : []).map(restoreSummary).filter((item): item is RoundSummary => item !== null).slice(0, 100);
  result.session = restoreSession(data.session);
  const duel = object(data.duel);
  const ids = stringList(duel.questionIds);
  if (heroes.some(hero => hero.id === duel.heroId) && ids.length === 12 && ids.every(id => questionMap.has(id)) && Array.isArray(duel.names) && duel.names.length === 2) {
    const results = (Array.isArray(duel.results) ? duel.results : []).slice(0, 2).map(restoreSummary);
    const stage = number(duel.stage, 0, 2);
    if (results.length === 2 && results.slice(0, stage).every(Boolean)) result.duel = { names: [String(duel.names[0]).slice(0, 18), String(duel.names[1]).slice(0, 18)], heroId: String(duel.heroId), seed: number(duel.seed, 0, 4294967295), questionIds: ids, stage, results };
  }
  if (result.session?.mode === 'duel' && !result.duel) result.session = null;
  return result;
}

export function toggleFavorite(save: Save, id: string): boolean {
  if (!questionMap.has(id)) return false;
  save.favorites = save.favorites.includes(id) ? save.favorites.filter(item => item !== id) : [...save.favorites, id];
  return save.favorites.includes(id);
}

export function achievements(save: Save): { id: string; title: string; description: string; earned: boolean; icon: string }[] {
  return [
    { id: 'first', title: 'Primer paso', description: 'Completa tu primera ronda', earned: save.rounds >= 1, icon: 'footprint' },
    { id: 'perfect', title: 'Luz completa', description: 'Consigue 12 aciertos en Mi camino', earned: Object.values(save.heroBest).some(value => value === 12), icon: 'star' },
    { id: 'chain', title: 'En sintonía', description: 'Encadena 6 aciertos en una ronda', earned: save.bestStreak >= 6, icon: 'sparkle' },
    { id: 'century', title: 'Corazón curioso', description: 'Acumula 100 respuestas correctas', earned: save.correct >= 100, icon: 'book' },
    { id: 'daily', title: 'Cada día cuenta', description: 'Completa el desafío en 7 días distintos', earned: save.completedDaily.length >= 7, icon: 'sun' },
    { id: 'heroes', title: 'Un gran camino', description: 'Desbloquea los 12 héroes', earned: save.xp >= heroes.at(-1)!.xp, icon: 'crown' },
    { id: 'reader', title: 'Palabras guardadas', description: 'Guarda 10 preguntas favoritas', earned: save.favorites.length >= 10, icon: 'bookmark' },
    { id: 'knowledge', title: 'Historia viva', description: 'Responde bien todas las preguntas del banco', earned: save.mastery.length === questions.length, icon: 'shield' },
  ];
}
