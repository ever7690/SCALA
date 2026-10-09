import './styles.css';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GameAudio, type Cue } from './audio.ts';
import { icon } from './icons.ts';
import { ProgressStore } from './store.ts';
import { achievements, advanceSession, aidCosts, answerQuestion, currentQuestion, currentStreak, dateKey, duelWinner, freshSave, heroes, questionMap, questions, secondDuelTurn, stars, startDuel, startSession, tickSession, toggleFavorite, unlocked, useAid, type Hero, type Mode, type Question, type Settings } from './game.ts';

type View = 'home' | 'journey' | 'collection' | 'settings' | 'play' | 'results' | 'handoff';
const app = document.querySelector<HTMLElement>('#app')!;
const store = new ProgressStore();
const restored = await store.read();
let save = restored.save;
let view: View = 'home';
let collectionTab = 'achievements';
let foreground = true;
let previousTick = performance.now();
let sinceSave = 0;
let toastTimer = 0;
let modalFocus: HTMLElement | null = null;
let pendingStart: (() => void) | null = null;
const audio = new GameAudio(save.settings);
const dialog = document.createElement('dialog');
dialog.id = 'modal';
dialog.setAttribute('aria-labelledby', 'modal-title');
document.body.append(dialog);
const toast = document.createElement('div');
toast.id = 'toast';
toast.setAttribute('role', 'status');
toast.setAttribute('aria-live', 'polite');
document.body.append(toast);

function h(value: unknown): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function hero(id: string): Hero { return heroes.find(item => item.id === id) ?? heroes[0]; }
function seed(): number { return crypto.getRandomValues(new Uint32Array(1))[0]; }
function time(value: number): string {
  const seconds = Math.floor(value / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}
function photo(item: Hero, className = '', eager = false): string {
  return '<img class="portrait ' + className + '" src="/heroes/' + item.id + '.webp" alt="Ilustración de ' + h(item.name) + '" width="768" height="768" loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async">';
}
function button(action: string, text: string, symbol: string, style = 'secondary', extra = ''): string {
  return '<button type="button" class="button ' + style + '" data-action="' + action + '" ' + extra + '>' + icon(symbol) + '<span>' + text + '</span></button>';
}
function notify(message: string): void {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3400);
}
function persist(): void {
  save.updatedAt = Date.now();
  void store.write(save).catch(() => notify('No se pudo guardar. Revisa el espacio libre de tu dispositivo.'));
}
function setView(next: View): void {
  view = next;
  previousTick = performance.now();
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function openModal(title: string, content: string): void {
  if (dialog.open) dialog.close();
  modalFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.innerHTML = '<div class="modal-head"><h2 id="modal-title">' + title + '</h2><button class="icon-button" data-action="close" aria-label="Cerrar">' + icon('close') + '</button></div><div class="modal-body">' + content + '</div>';
  dialog.showModal();
  previousTick = performance.now();
}
function closeModal(): void {
  dialog.close();
  previousTick = performance.now();
  if (modalFocus?.isConnected) modalFocus.focus();
}
dialog.addEventListener('cancel', () => { previousTick = performance.now(); });
dialog.addEventListener('close', () => { previousTick = performance.now(); });
function starRow(score: number): string {
  return '<span class="stars" aria-label="' + stars(score) + ' de 3 estrellas">' + [1, 2, 3].map(value => icon('star', stars(score) >= value ? 'lit' : '')).join('') + '</span>';
}
function header(): string {
  return '<header class="topbar"><img class="scala-logo" src="/brand/scala-original.png" alt="SCALA" width="2048" height="1638"><div class="topbar-right"><span class="currency">' + icon('coins') + '<strong data-coins>' + save.coins + '</strong><span class="sr-only"> monedas</span></span><button class="icon-button" data-action="help" aria-label="Cómo jugar">' + icon('help') + '</button></div></header>';
}
function navigation(): string {
  return '<nav class="bottom-nav" aria-label="Navegación principal">' + [['home', 'Inicio', 'home'], ['journey', 'Mi camino', 'map'], ['collection', 'Colección', 'book'], ['settings', 'Ajustes', 'settings']].map(([id, label, symbol]) => '<button data-action="nav" data-view="' + id + '" class="' + (view === id ? 'active' : '') + '" ' + (view === id ? 'aria-current="page"' : '') + '>' + icon(symbol) + '<span>' + label + '</span></button>').join('') + '</nav>';
}
function frame(content: string, playing = false): void {
  document.documentElement.dataset.motion = save.settings.reducedMotion ? 'reduce' : 'full';
  app.className = playing ? 'playing' : '';
  app.innerHTML = (playing ? '' : header()) + '<main id="screen" class="' + (playing ? 'play-screen' : 'page') + '">' + content + '</main>' + (playing ? '' : navigation());
}
function activeHero(): Hero {
  if (save.session && unlocked(save, save.session.heroId)) return hero(save.session.heroId);
  return [...heroes].reverse().find(item => unlocked(save, item.id)) ?? heroes[0];
}
function progressPanel(): string {
  const next = heroes.find(item => !unlocked(save, item.id));
  const last = [...heroes].reverse().find(item => unlocked(save, item.id))!;
  const percent = next ? Math.min(100, (save.xp - last.xp) / (next.xp - last.xp) * 100) : 100;
  return '<section class="progress-panel"><div class="row"><span class="eyebrow">' + icon('sparkle') + ' TU CAMINO</span><strong>' + save.xp + ' XP</strong></div><div class="progress-track" role="progressbar" aria-label="Progreso hacia el siguiente héroe" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(percent) + '"><span style="width:' + percent + '%"></span></div><p>' + (next ? '<b>' + h(next.name) + '</b> te espera · ' + (next.xp - save.xp) + ' XP para descubrir su historia' : 'Los 12 héroes están contigo. Sigue aprendiendo.') + '</p></section>';
}
function renderHome(): void {
  const current = activeHero();
  const continuing = !!save.session && (!save.session.finished || save.session.mode === 'duel' && save.duel?.stage === 1);
  const done = save.completedDaily.includes(dateKey());
  const content = '<div class="heading home-heading"><span class="eyebrow">DESCUBRE · APRENDE · CRECE</span><h1>Héroes <em>de la Fe</em></h1><p>Grandes historias. Un camino para ti.</p></div>' +
    '<section class="featured">' + photo(current, '', true) + '<div class="featured-shade"></div><span class="featured-tag">' + icon('leaf') + h(current.quality) + '</span><div class="featured-copy"><span class="eyebrow">' + (continuing ? 'TU RONDA TE ESPERA' : 'TU PRÓXIMA HISTORIA') + '</span><h2>' + h(current.name) + '</h2><p>' + h(current.title) + '</p>' + button(continuing ? 'resume' : 'start', continuing ? 'Continuar ronda' : 'Comenzar mi camino', 'play', 'primary', 'data-hero="' + current.id + '"') + '</div></section>' +
    progressPanel() + '<section class="modes"><button class="mode-card daily" data-action="daily"><span class="medallion">' + icon('sun') + '</span><span><b>Desafío de hoy</b><small>' + (done ? 'Completado · vuelve a practicar' : '12 historias · un nuevo desafío') + '</small></span>' + icon(done ? 'check' : 'right') + '</button><button class="mode-card" data-action="duel"><span class="medallion blue">' + icon('users') + '</span><span><b>Duelo entre amigos</b><small>Dos personas · el mismo celular</small></span>' + icon('right') + '</button></section>' +
    '<div class="section-title"><h2>Conoce a tus héroes</h2><button class="text-button" data-action="nav" data-view="journey">Ver todos ' + icon('right') + '</button></div><div class="hero-strip">' + heroes.slice(0, 6).map(item => '<button class="hero-chip ' + (!unlocked(save, item.id) ? 'locked' : '') + '" data-action="hero" data-hero="' + item.id + '">' + photo(item) + '<span>' + h(item.name) + '</span>' + (!unlocked(save, item.id) ? icon('lock') : '') + '</button>').join('') + '</div>' +
    '<div class="quiet-card"><span class="medallion">' + icon('book') + '</span><div><b>Aprende a tu ritmo</b><p>Sin reloj. Con pasajes y ayudas gratis.</p></div><button class="icon-button" data-action="practice" data-hero="' + current.id + '" aria-label="Practicar con ' + h(current.name) + '">' + icon('right') + '</button></div><p class="footer-note">' + icon('shield') + ' Sin conexión · Sin anuncios · Tu progreso queda contigo</p>';
  frame(content);
}
function renderJourney(): void {
  const count = heroes.filter(item => unlocked(save, item.id)).length;
  frame('<div class="heading"><span class="eyebrow">UNA HISTORIA A LA VEZ</span><h1>Mi <em>camino</em></h1><p>' + count + ' de 12 héroes · ' + save.xp + ' XP</p></div>' + progressPanel() + '<div class="hero-grid">' + heroes.map((item, index) => {
    const available = unlocked(save, item.id);
    return '<button class="hero-card ' + (available ? '' : 'locked') + '" data-action="hero" data-hero="' + item.id + '">' + photo(item) + '<span class="hero-number">' + String(index + 1).padStart(2, '0') + '</span><div class="hero-card-copy"><h2>' + h(item.name) + '</h2><p>' + h(item.quality) + '</p><span class="hero-state">' + (available ? starRow(save.heroBest[item.id] ?? 0) : icon('lock') + ' ' + item.xp + ' XP') + '</span></div></button>';
  }).join('') + '</div>');
}
function questionCard(question: Question): string {
  return '<article class="saved-question"><span class="eyebrow">' + h(hero(question.heroId).name) + '</span><h3>' + h(question.prompt) + '</h3><p><strong>' + h(question.choices[question.answer]) + '</strong></p><p>' + h(question.explanation) + '</p><div class="row">' + button('scripture', h(question.reference), 'book', 'text-button', 'data-id="' + question.id + '"') + '<button class="icon-button ' + (save.favorites.includes(question.id) ? 'selected' : '') + '" data-action="favorite" data-id="' + question.id + '" aria-label="' + (save.favorites.includes(question.id) ? 'Quitar de favoritos' : 'Guardar en favoritos') + '" aria-pressed="' + save.favorites.includes(question.id) + '">' + icon('bookmark') + '</button></div></article>';
}
function renderCollection(): void {
  const list = achievements(save);
  const cards = collectionTab === 'achievements' ? '<div class="achievement-grid">' + list.map(item => '<article class="achievement ' + (item.earned ? 'earned' : '') + '"><span class="medallion">' + icon(item.icon) + '</span><h3>' + h(item.title) + '</h3><p>' + h(item.description) + '</p><span class="achievement-status">' + (item.earned ? icon('check') + ' Conseguido' : 'Por descubrir') + '</span></article>').join('') + '</div>' :
    save.favorites.length ? save.favorites.map(id => questionCard(questionMap.get(id)!)).join('') : '<div class="empty"><span class="medallion">' + icon('bookmark') + '</span><h2>Guarda lo que te inspira</h2><p>Después de responder, toca el marcador para conservar una pregunta y su pasaje.</p>' + button('nav', 'Explorar mi camino', 'map', 'secondary', 'data-view="journey"') + '</div>';
  frame('<div class="heading"><span class="eyebrow">LO QUE VAS DESCUBRIENDO</span><h1>Tu <em>colección</em></h1><p>' + save.mastery.length + ' de ' + questions.length + ' preguntas respondidas bien</p></div><div class="stats"><div><strong>' + save.rounds + '</strong><span>Rondas</span></div><div><strong>' + save.correct + '</strong><span>Aciertos</span></div><div><strong>' + save.bestStreak + '</strong><span>Mejor racha</span></div></div><div class="tabs" role="tablist" aria-label="Colección"><button role="tab" aria-selected="' + (collectionTab === 'achievements') + '" class="' + (collectionTab === 'achievements' ? 'active' : '') + '" data-action="tab" data-tab="achievements">Logros · ' + list.filter(item => item.earned).length + '</button><button role="tab" aria-selected="' + (collectionTab === 'favorites') + '" class="' + (collectionTab === 'favorites' ? 'active' : '') + '" data-action="tab" data-tab="favorites">Favoritos · ' + save.favorites.length + '</button></div>' + cards);
}
function renderSettings(): void {
  const switches: [keyof Settings, string, string, string][] = [['sound', 'Campanillas y efectos', 'Sonidos suaves para acompañarte', 'sound'], ['music', 'Música de fondo', 'Una melodía tranquila, a volumen bajo', 'music'], ['haptic', 'Vibración breve', 'Un toque al responder, si tu celular lo permite', 'sparkle'], ['reducedMotion', 'Reducir movimiento', 'Una interfaz con menos animaciones', 'leaf']];
  frame('<div class="heading"><span class="eyebrow">A TU MANERA</span><h1>Pequeños <em>ajustes</em></h1><p>Haz de este camino tu espacio.</p></div><section class="settings-panel">' + switches.map(([key, title, description, symbol]) => '<label class="setting"><span class="setting-symbol">' + icon(symbol) + '</span><span><b>' + title + '</b><small>' + description + '</small></span><input type="checkbox" role="switch" aria-label="' + title + '" data-setting="' + key + '" ' + (save.settings[key] ? 'checked' : '') + '><span class="switch" aria-hidden="true"></span></label>').join('') + '</section><section class="settings-links">' + button('help', 'Cómo jugar', 'help') + button('privacy', 'Privacidad', 'shield') + button('credits', 'Acerca del juego', 'book') + button('reset', 'Reiniciar mi progreso', 'trash', 'danger') + '</section><div class="about-brand"><img src="/brand/scala-original.png" alt="SCALA" width="2048" height="1638"><b>Héroes de la Fe</b><span>Versión ' + __APP_VERSION__ + '</span><p>Hecho para descubrir, aprender y compartir.</p></div>');
}
function renderPlay(): void {
  const session = save.session;
  const question = currentQuestion(save);
  if (!session || !question) { setView('home'); return; }
  const character = hero(question.heroId);
  const answer = session.answers[session.index];
  const duel = session.mode === 'duel';
  const player = duel ? save.duel?.names[save.duel.stage] ?? 'Jugador' : '';
  const neutral = duel && !!answer;
  const options = session.choiceOrders[session.index].map((choice, position) => {
    const removed = session.removedChoices.includes(choice);
    const state = !duel && answer ? choice === question.answer ? 'correct' : choice === answer.choice ? 'incorrect' : '' : answer?.choice === choice ? 'chosen' : '';
    return '<button class="answer ' + state + (removed ? ' removed' : '') + '" data-action="answer" data-option="' + choice + '" data-question="' + question.id + '" ' + (answer || removed ? 'disabled' : '') + '><span class="answer-letter">' + String.fromCharCode(65 + position) + '</span><span>' + h(question.choices[choice]) + '</span>' + (state === 'correct' ? icon('check') : state === 'incorrect' ? icon('close') : state === 'chosen' ? icon('check') : '') + '</button>';
  }).join('');
  let below: string;
  if (answer) {
    below = neutral ? '<section class="answer-feedback neutral" aria-live="polite"><b>' + icon('check') + ' Respuesta guardada</b><p>Las soluciones se muestran al terminar los dos turnos.</p></section>' : '<section class="answer-feedback ' + (answer.correct ? 'good' : 'reflect') + '" aria-live="polite"><b>' + icon(answer.correct ? 'sparkle' : 'book') + (answer.correct ? ' Bien hecho' : ' Una nueva oportunidad para aprender') + '</b><p>' + h(question.explanation) + '</p><div class="row">' + button('scripture', h(question.reference), 'book', 'text-button', 'data-id="' + question.id + '"') + '<button class="icon-button ' + (save.favorites.includes(question.id) ? 'selected' : '') + '" data-action="favorite" data-id="' + question.id + '" aria-label="Guardar en favoritos" aria-pressed="' + save.favorites.includes(question.id) + '">' + icon('bookmark') + '</button></div></section>';
    below += button('next', session.index === 11 ? 'Ver resultado' : 'Siguiente pregunta', 'right', 'primary next');
  } else if (duel) below = '<p class="play-note">' + icon('users') + ' Sin ayudas · las mismas 12 preguntas para ambos</p>';
  else {
    below = '<div class="aids" aria-label="Ayudas">' + (['half', 'verse', 'pause'] as const).filter(aid => session.mode !== 'practice' || aid !== 'pause').map(aid => {
      const used = aid === 'half' ? session.halfUsed : aid === 'verse' ? session.verseUsed : session.freezeUsed;
      const free = session.mode === 'practice';
      const labels = { half: '50 / 50', verse: 'Escritura', pause: 'Pausar 12 s' };
      const symbols = { half: 'half', verse: 'book', pause: 'clock' };
      return '<button data-action="aid" data-aid="' + aid + '" ' + (used || !free && save.coins < aidCosts[aid] ? 'disabled' : '') + '>' + icon(symbols[aid]) + '<b>' + labels[aid] + '</b><small>' + (used ? 'Utilizada' : free ? 'Gratis' : icon('coins') + ' ' + aidCosts[aid]) + '</small></button>';
    }).join('') + '</div>' + (session.verseUsed ? '<div class="scripture-hint"><span class="eyebrow">' + h(question.reference) + '</span><p>' + h(question.verse) + '</p></div>' : '<p class="play-note">' + (session.mode === 'practice' ? 'Lee con calma. Aquí el reloj descansa.' : 'Cada acierto suma 15 XP · cada 3 seguidos, 5 XP extra') + '</p>');
  }
  frame('<div class="play-topbar"><button class="icon-button" data-action="pause" aria-label="Pausar ronda">' + icon('left') + '</button><span class="play-mode">' + (duel ? h(player) : session.mode === 'practice' ? 'Práctica libre' : session.mode === 'daily' ? 'Desafío de hoy' : 'Mi camino') + '</span><span class="currency">' + icon('coins') + '<strong data-coins>' + save.coins + '</strong></span></div><div class="round-progress"><div class="row"><span>Pregunta <b>' + (session.index + 1) + '</b> de 12</span><span class="timer ' + (session.frozenMsLeft ? 'frozen' : '') + '">' + icon('clock') + '<strong id="clock">' + (session.mode === 'practice' ? 'Sin reloj' : time(session.elapsedMs + session.penaltyMs)) + '</strong></span></div><div class="question-dots" aria-hidden="true">' + session.answers.map((value, index) => '<span class="' + (index === session.index ? 'current ' : '') + (value ? duel ? 'answered' : value.correct ? 'right' : 'wrong' : '') + '"></span>').join('') + '</div></div><div class="question-hero">' + photo(character, '', true) + '<div><span class="eyebrow">' + h(character.quality) + '</span><b>' + h(character.name) + '</b></div>' + (!duel && currentStreak(session) >= 3 ? '<span class="streak">' + icon('sparkle') + currentStreak(session) + '</span>' : '') + '</div><section class="question-panel" data-question-id="' + question.id + '"><h1>' + h(question.prompt) + '</h1><div class="answers">' + options + '</div></section>' + below, true);
}
function renderResults(): void {
  const session = save.session;
  if (!session?.finished) { setView('home'); return; }
  if (session.mode === 'duel') { renderDuelResults(); return; }
  const right = session.answers.filter(answer => answer?.correct).length;
  const character = hero(session.heroId);
  const discoveries = heroes.filter(item => item.xp > save.xp - session.rewardXp && item.xp <= save.xp);
  frame('<div class="result-portrait">' + photo(character, '', true) + '<span class="result-emblem">' + icon('crown') + '</span></div><div class="result-heading">' + starRow(right) + '<span class="eyebrow">RONDA COMPLETADA</span><h1>' + (right >= 9 ? 'Tu luz sigue <em>creciendo</em>' : 'Cada paso <em>cuenta</em>') + '</h1><p>' + (session.mode === 'practice' ? 'Aprender también es una victoria.' : 'Una historia más en tu camino.') + '</p></div><div class="stats result-stats"><div><strong>' + right + '<small>/12</small></strong><span>Aciertos</span></div><div><strong>' + (session.mode === 'practice' ? 'Libre' : time(session.elapsedMs + session.penaltyMs)) + '</strong><span>' + (session.mode === 'practice' ? 'A tu ritmo' : 'Tiempo total') + '</span></div></div>' + (session.rewardXp ? '<div class="reward-row"><span>' + icon('sparkle') + ' +' + session.rewardXp + ' XP</span><span>' + icon('coins') + ' +' + session.rewardCoins + ' monedas</span></div>' : '<p class="footer-note">' + (session.mode === 'practice' ? 'Práctica sin gasto de monedas ni recompensas.' : 'Ya recibiste la recompensa de este desafío diario.') + '</p>') + discoveries.map(item => '<button class="unlock-card" data-action="hero" data-hero="' + item.id + '">' + photo(item) + '<span><small>NUEVO HÉROE</small><b>' + h(item.name) + '</b><span>Su historia ya está disponible</span></span>' + icon('right') + '</button>').join('') + '<div class="result-actions">' + button('review', 'Repasar respuestas', 'book', 'primary') + button('again', 'Otra ronda', 'refresh', 'secondary') + button('nav', 'Volver a mi camino', 'map', 'text-button', 'data-view="journey"') + '</div>');
}
function renderHandoff(): void {
  const duel = save.duel;
  if (!duel || duel.stage !== 1) { setView('home'); return; }
  frame('<div class="handoff"><span class="large-medallion">' + icon('users') + '</span><span class="eyebrow">AHORA ES TU TURNO</span><h1>' + h(duel.names[1]) + '</h1><p>Recibe el celular. Tendrás las mismas 12 preguntas y las mismas opciones.</p><div class="quiet-card"><p>El otro jugador aparta la vista durante tu turno. Las soluciones esperan hasta el final.</p></div>' + button('second', 'Estoy listo', 'play', 'primary') + '</div>');
}
function renderDuelResults(): void {
  const duel = save.duel;
  if (!duel || duel.stage !== 2 || duel.results.some(result => !result)) { setView('handoff'); return; }
  const winner = duelWinner(duel);
  frame('<div class="result-heading duel-result"><span class="large-medallion">' + icon('crown') + '</span><span class="eyebrow">DUELO COMPLETADO</span><h1>' + (winner === -1 ? 'Un gran <em>empate</em>' : h(duel.names[winner ?? 0]) + '<br><em>¡bien hecho!</em>') + '</h1><p>Compartir el aprendizaje es la mejor parte.</p></div><div class="duel-scores">' + duel.results.map((result, index) => '<article class="' + (winner === index ? 'winner' : '') + '"><span>' + h(duel.names[index]) + '</span><strong>' + result!.correct + '<small>/12</small></strong><p>' + time(result!.elapsedMs) + '</p>' + (winner === index ? icon('crown') : icon('users')) + '</article>').join('') + '</div><p class="footer-note">Más aciertos gana. Si hay empate, decide el menor tiempo total; los errores suman 5 segundos.</p><div class="result-actions">' + button('review', 'Descubrir las respuestas', 'book', 'primary') + button('duel', 'Un nuevo duelo', 'users') + button('nav', 'Volver al inicio', 'home', 'text-button', 'data-view="home"') + '</div>');
}
function render(): void {
  if (view === 'home') renderHome();
  else if (view === 'journey') renderJourney();
  else if (view === 'collection') renderCollection();
  else if (view === 'settings') renderSettings();
  else if (view === 'play') renderPlay();
  else if (view === 'handoff') renderHandoff();
  else renderResults();
}
function showHero(id: string): void {
  const character = hero(id);
  const available = unlocked(save, id);
  openModal(h(character.name), '<div class="hero-detail">' + photo(character, '', true) + '<span class="eyebrow">' + h(character.quality) + '</span><h3>' + h(character.title) + '</h3><p>' + h(character.description) + '</p><span class="reference">' + icon('book') + h(character.book) + '</span></div><div class="modal-actions">' + (available ? button('start', 'Jugar su historia', 'play', 'primary', 'data-hero="' + id + '"') + button('practice', 'Practicar sin reloj', 'book', 'secondary', 'data-hero="' + id + '"') : '<div class="locked-message">' + icon('lock') + '<b>' + (character.xp - save.xp) + ' XP para desbloquear</b><p>Completa rondas en Mi camino o el desafío diario.</p></div>') + '</div>');
}
function requestStart(callback: () => void): void {
  if (save.session && !save.session.finished || save.duel?.stage === 1 && save.session?.mode === 'duel') {
    pendingStart = callback;
    openModal('¿Empezar otra ronda?', '<p>Tu ronda actual sigue guardada. Si empiezas otra, dejarás esta sin terminar. Las ayudas ya usadas no se devuelven.</p><div class="modal-actions">' + button('confirm-start', 'Empezar otra', 'play', 'primary') + button('resume', 'Continuar la ronda guardada', 'right') + '</div>');
  } else callback();
}
function begin(mode: Mode, id: string): void {
  requestStart(() => {
    if (!startSession(save, mode, id, seed())) { notify('Primero desbloquea a este héroe en Mi camino.'); return; }
    save.duel = null;
    closeModal();
    persist();
    setView('play');
  });
}
function resume(): void {
  if (!save.session) return;
  closeModal();
  setView(save.session.mode === 'duel' && save.duel?.stage === 1 && save.session.finished ? 'handoff' : save.session.finished ? 'results' : 'play');
}
function pause(): void {
  persist();
  openModal('Un momento para respirar', '<p>La ronda y el reloj están en pausa. Tu avance queda guardado.</p><div class="modal-actions">' + button('close', 'Seguir jugando', 'play', 'primary') + button('save-home', 'Guardar y volver al inicio', 'home') + '</div>');
}
function scripture(id: string): void {
  const question = questionMap.get(id);
  if (!question) return;
  if (view === 'play' && !save.session?.answers[save.session.index] && !save.session?.verseUsed) return;
  if (save.session?.mode === 'duel' && save.duel?.stage !== 2 && view === 'play') return;
  openModal(h(question.reference), '<span class="eyebrow">REINA-VALERA 1909</span><p class="scripture-text">' + h(question.verse) + '</p><p class="edition-note">Esta edición conserva su ortografía histórica. Las preguntas y explicaciones están redactadas en español actual.</p>');
}
function showDuel(): void {
  requestStart(() => openModal('Un duelo para compartir', '<p>Dos turnos con las mismas 12 preguntas. El otro jugador aparta la vista durante tu turno. Gana quien tenga más aciertos; en empate, el menor tiempo total.</p><form id="duel-form"><label>Primer jugador<input name="first" maxlength="18" placeholder="Jugador 1" autocomplete="off"></label><label>Segundo jugador<input name="second" maxlength="18" placeholder="Jugador 2" autocomplete="off"></label><label>Una historia para los dos<select name="hero">' + heroes.filter(item => unlocked(save, item.id)).map(item => '<option value="' + item.id + '">' + h(item.name) + '</option>').join('') + '</select></label><button class="button primary" type="submit">' + icon('play') + ' Comenzar duelo</button></form><p class="edition-note">Duelo local sin ayudas. No gasta monedas ni cambia tu experiencia personal.</p>'));
}
function help(): void {
  openModal('Cada historia abre un camino', '<div class="help-step"><span>1</span><div><h3>Responde y descubre</h3><p>12 preguntas por ronda, cuatro opciones y una respuesta correcta. Al responder, descubre el pasaje y guarda tus favoritos.</p></div></div><div class="help-step"><span>2</span><div><h3>Crece con tus aciertos</h3><p>Mi camino suma 15 XP y 3 monedas por acierto. Cada 3 aciertos seguidos suman 5 XP extra. Completar una ronda añade 20 XP y 10 monedas. Los héroes se desbloquean con tu experiencia.</p></div></div><div class="help-step"><span>3</span><div><h3>Elige tu ritmo</h3><p>Práctica no tiene reloj y sus ayudas son gratis. En Mi camino y Desafío, cada error suma 5 segundos. El reloj se detiene mientras lees la explicación o abres una ventana.</p></div></div><div class="help-step"><span>4</span><div><h3>Una mano cuando la necesitas</h3><p>50/50 retira dos opciones incorrectas por 25 monedas. Escritura muestra el pasaje por 20. Pausar detiene el reloj 12 segundos por 30, una vez por ronda. No hay compras de monedas.</p></div></div><p>El desafío diario mezcla los 12 héroes. Su recompensa se entrega una vez por fecha del dispositivo. Repetirlo permite practicar.</p><p>Para las estrellas de Mi camino: 6 aciertos dan una, 9 dan dos y 12 dan tres.</p>');
}
document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
  if (!target || target instanceof HTMLButtonElement && target.disabled) return;
  const action = target.dataset.action;
  const sessionId = save.session?.id;
  const index = save.session?.index;
  void (async () => {
    const soundReady = audio.unlock();
    const play = (cue: Cue): void => { void soundReady.then(() => audio.play(cue)); };
    if (action !== 'answer' && action !== 'aid' && action !== 'next') play('tap');
    const id = target.dataset.hero ?? activeHero().id;
    if (action === 'nav') { closeModal(); setView(target.dataset.view as View); }
    else if (action === 'hero') showHero(id);
    else if (action === 'start') begin('journey', id);
    else if (action === 'practice') begin('practice', id);
    else if (action === 'daily') begin('daily', activeHero().id);
    else if (action === 'resume') resume();
    else if (action === 'pause') pause();
    else if (action === 'save-home') { closeModal(); persist(); setView('home'); }
    else if (action === 'close') closeModal();
    else if (action === 'confirm-start') { const callback = pendingStart; pendingStart = null; save.session = null; save.duel = null; closeModal(); callback?.(); }
    else if (action === 'answer') {
      if (view !== 'play' || sessionId !== save.session?.id || index !== save.session?.index || currentQuestion(save)?.id !== target.dataset.question) return;
      const result = answerQuestion(save, Number(target.dataset.option));
      if (!result) return;
      play(save.session?.mode === 'duel' ? 'tap' : result.correct ? 'correct' : 'reflect');
      if (save.settings.haptic) navigator.vibrate?.(12);
      persist();
      renderPlay();
      document.querySelector<HTMLElement>('[data-action="next"]')?.focus({ preventScroll: true });
    } else if (action === 'next') {
      if (view !== 'play' || sessionId !== save.session?.id || index !== save.session?.index) return;
      const result = advanceSession(save);
      if (result === 'blocked') return;
      play(result === 'finished' ? 'finish' : 'tap');
      persist();
      if (result === 'finished') setView(save.session?.mode === 'duel' && save.duel?.stage === 1 ? 'handoff' : 'results');
      else { renderPlay(); window.scrollTo({ top: 0, behavior: 'instant' }); }
    } else if (action === 'aid') {
      if (view !== 'play' || sessionId !== save.session?.id || index !== save.session?.index) return;
      const result = useAid(save, target.dataset.aid as 'half' | 'verse' | 'pause');
      if (!result.applied) { notify(result.reason ?? 'La ayuda no está disponible.'); return; }
      play('aid');
      persist();
      renderPlay();
      if (target.dataset.aid === 'pause') notify('El reloj descansa durante 12 segundos.');
    } else if (action === 'scripture') scripture(target.dataset.id ?? '');
    else if (action === 'favorite') {
      toggleFavorite(save, target.dataset.id ?? '');
      persist();
      target.classList.toggle('selected', save.favorites.includes(target.dataset.id ?? ''));
      target.setAttribute('aria-pressed', String(save.favorites.includes(target.dataset.id ?? '')));
      if (view === 'collection') renderCollection();
    } else if (action === 'tab') { collectionTab = target.dataset.tab ?? 'achievements'; renderCollection(); }
    else if (action === 'help') help();
    else if (action === 'credits') openModal('Hecho para aprender', '<div class="credits-brand"><img src="/brand/scala-original.png" alt="SCALA"></div><h3>Héroes de la Fe · ' + __APP_VERSION__ + '</h3><p>Juego original SCALA: 12 personajes, 240 preguntas propias, ilustraciones originales y sonidos suaves. Funciona sin conexión y sin anuncios.</p><p>Pasajes: Biblia Reina-Valera 1909, de dominio público. Preguntas cotejadas con sus referencias. Ilustraciones artísticas creadas con ayuda de IA; no son reconstrucciones históricas.</p><p>Tipografías Manrope y Lora, bajo SIL Open Font License. Software: Capacitor, Vite y TypeScript. Los textos legales y las licencias se incluyen en el proyecto.</p><p>Inspirado en el género de trivia bíblica. SCALA es una aplicación independiente.</p>');
    else if (action === 'privacy') openModal('Tu privacidad', '<p>El juego guarda tu avance, preferencias, favoritos y los nombres del duelo únicamente en este dispositivo. No crea cuentas, no muestra anuncios, no usa analítica y no envía datos a servidores.</p><p>No necesita acceso a cámara, contactos, ubicación ni micrófono. La versión Android no tiene permiso para acceder a Internet.</p><p>Si tienes activada la copia de seguridad de Android, el sistema puede incluir tus datos locales en ella según tus ajustes. Puedes borrar el progreso desde Ajustes.</p><p>El desafío diario usa la fecha del dispositivo. Los nombres del duelo son opcionales y no se publican.</p>');
    else if (action === 'reset') openModal('¿Volver a empezar?', '<p>Se borrarán tus rondas, experiencia, monedas ganadas, favoritos y logros de este dispositivo. Tendrás de nuevo 120 monedas. Se conservarán tus ajustes de sonido.</p><div class="modal-actions">' + button('confirm-reset', 'Borrar mi progreso', 'trash', 'danger') + button('close', 'Conservar mi camino', 'left', 'primary') + '</div>');
    else if (action === 'confirm-reset') { const settings = save.settings; save = freshSave(); save.settings = settings; persist(); closeModal(); setView('home'); notify('Un nuevo comienzo.'); }
    else if (action === 'review' && save.session?.finished) openModal('Respuestas y pasajes', '<p>Cada pregunta es una invitación a seguir leyendo.</p>' + save.session.questionIds.map(questionId => questionCard(questionMap.get(questionId)!)).join(''));
    else if (action === 'again' && save.session) begin(save.session.mode === 'practice' ? 'practice' : save.session.mode === 'daily' ? 'daily' : 'journey', save.session.heroId);
    else if (action === 'duel') showDuel();
    else if (action === 'second' && secondDuelTurn(save)) { persist(); setView('play'); }
  })().catch(() => notify('No se pudo completar la acción. Inténtalo otra vez.'));
});
document.addEventListener('change', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.setting) return;
  const key = input.dataset.setting as keyof Settings;
  if (!(key in save.settings)) return;
  save.settings[key] = input.checked;
  audio.update(save.settings);
  persist();
  document.documentElement.dataset.motion = save.settings.reducedMotion ? 'reduce' : 'full';
  void audio.unlock().then(() => audio.play('tap'));
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'duel-form') return;
  event.preventDefault();
  const data = new FormData(form);
  if (!startDuel(save, [String(data.get('first') ?? ''), String(data.get('second') ?? '')], String(data.get('hero')), seed())) return;
  closeModal();
  persist();
  setView('play');
  void audio.unlock().then(() => audio.play('tap'));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !dialog.open && view === 'play') { event.preventDefault(); pause(); }
});
document.addEventListener('visibilitychange', () => {
  foreground = !document.hidden;
  previousTick = performance.now();
  audio.setActive(foreground);
  persist();
});
window.addEventListener('pagehide', persist);
window.setInterval(() => {
  const now = performance.now();
  const delta = now - previousTick;
  previousTick = now;
  if (view !== 'play' || dialog.open || !foreground || document.hidden) return;
  tickSession(save, delta);
  const session = save.session;
  const clock = document.querySelector<HTMLElement>('#clock');
  if (clock && session && session.mode !== 'practice') {
    clock.textContent = time(session.elapsedMs + session.penaltyMs);
    clock.parentElement?.classList.toggle('frozen', session.frozenMsLeft > 0);
  }
  sinceSave += delta;
  if (sinceSave >= 2000) { sinceSave = 0; persist(); }
}, 250);
if (Capacitor.isNativePlatform()) {
  await App.addListener('appStateChange', state => { foreground = state.isActive; previousTick = performance.now(); audio.setActive(foreground); persist(); });
  await App.addListener('backButton', () => {
    if (dialog.open) closeModal();
    else if (view === 'play') pause();
    else if (view !== 'home') setView('home');
    else void App.minimizeApp();
  });
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
render();
if (restored.recovered) notify('El guardado anterior no se pudo leer. Puedes comenzar un nuevo camino.');
