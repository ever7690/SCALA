import './styles.css';
import dataset from './data/bible-levels.json';
import verseData from './data/verses.json';
import { GameStateManager } from './game-engine';
import type { Level, LevelGroupDefinition } from './types';
import { GameAudio } from './audio';
import { SaveStore, dailyReward, localDate, type AppSave } from './save';

interface BibleLevel extends Level {
  number: number;
  focusWord: string;
}

interface Chapter extends LevelGroupDefinition {
  title: string;
  subtitle: string;
  symbol: string;
  start: number;
  end: number;
}

interface Verse {
  reference: string;
  text: string;
  unlockAt: number;
}

const icons: Record<string, string> = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  settings: '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14 8h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-3m2-10v12"/>',
  book: '<path d="M12 5v15M3 4c4-1 6 0 9 1 3-1 5-2 9-1v15c-4-1-6 0-9 1-3-1-5-2-9-1z"/>',
  gift: '<path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8c-7 0-7-7-3-6 3 1 3 6 3 6s0-5 3-6c4-1 4 6-3 6z"/>',
  shuffle: '<path d="M3 7h3c4 0 8 10 12 10h3m-4-4 4 4-4 4M3 17h3c2 0 4-2 5-5m2-3c2-2 3-2 5-2h3m-4-4 4 4-4 4"/>',
  hint: '<path d="M8 15a7 7 0 1 1 8 0v3H8zM9 21h6M12 7v4"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h1m4 0h1m4 0h1M6 13h1m4 0h1m4 0h1M7 16h10"/>',
};

function icon(name: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.star}</svg>`;
}

function el<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Falta el elemento ${selector}`);
  return element;
}

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

const levels = dataset.levels as BibleLevel[];
const chapters = dataset.chapters as Chapter[];
const verses = verseData as Verse[];
const store = new SaveStore();
const audio = new GameAudio();
let manager: GameStateManager;
let save: AppSave;
let screen: 'home' | 'play' = 'home';
let selected: number[] = [];
let wheel: string[] = [];
let pointerId: number | null = null;
let dragged = false;
let startPoint = { x: 0, y: 0 };
let toastTimer = 0;
let completedDialogTimer = 0;
let lastFocus: HTMLElement | null = null;
let hintMode = false;
const boardObserver = new ResizeObserver(entries => {
  const entry = entries[0];
  if (screen === 'play' && entry && entry.contentRect.height > 0) {
    el('#board').style.setProperty('--available-board-height', `${entry.contentRect.height}px`);
  }
});

function current(): BibleLevel {
  return manager.getCurrentLevel() as BibleLevel;
}

function unlocked(): number {
  return Math.min(levels.length, Math.max(0, ...save.rewardedLevels.map(Number)) + 1);
}

function progress(): number {
  return save.rewardedLevels.length;
}

function persist(): void {
  save.game = manager.serialize();
  save.updatedAt = Math.max(Date.now(), save.updatedAt + 1);
  void store.write(save).catch(() => toast('No pudimos guardar. Comprueba el espacio disponible.'));
}

function feedback(name: string): void {
  audio.play(name);
  if (save.haptic && navigator.vibrate) navigator.vibrate(name === 'wrong' ? 30 : 12);
}

function toast(message: string, positive = false): void {
  const node = el('#toast');
  node.textContent = message;
  node.className = `toast visible${positive ? ' positive' : ''}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { node.className = 'toast'; }, 2200);
}

function mount(): void {
  el('#app').innerHTML = `
    <div class="scenery" aria-hidden="true"><div class="sky-glow"></div><div class="sun"></div><div class="ridge ridge-far"></div><div class="ridge ridge-mid"></div><div class="ridge ridge-near"></div><div class="stars"></div></div>
    <main class="app-frame"><section id="home-screen" class="home-screen"></section><section id="play-screen" class="play-screen" hidden></section></main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <dialog id="modal" aria-label="Ventana del juego"><div id="modal-content"></div></dialog>`;
  el<HTMLDialogElement>('#modal').addEventListener('close', () => {
    lastFocus?.focus();
    lastFocus = null;
  });
  el<HTMLDialogElement>('#modal').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeModal();
  });
  document.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action !== 'letter') void audio.unlock();
    switch (action) {
      case 'play': startGame(); break;
      case 'home': goHome(); break;
      case 'map': showMap(); break;
      case 'settings': showSettings(); break;
      case 'verses': showVerses(); break;
      case 'daily': showDaily(); break;
      case 'claim-daily': claimDaily(); break;
      case 'shuffle': shuffleWheel(); break;
      case 'hint': activateHint(); break;
      case 'bonus': showBonus(); break;
      case 'keyboard': showKeyboard(); break;
      case 'help': showHelp(); break;
      case 'close': closeModal(); break;
      case 'next': nextLevel(); break;
      case 'pick-level': pickLevel(Number(button.dataset.level)); break;
      case 'sound': toggleSetting('sound'); break;
      case 'music': toggleSetting('music'); break;
      case 'haptic': toggleSetting('haptic'); break;
      case 'credits': showCredits(); break;
      case 'restart-confirm': showRestartConfirm(); break;
      case 'restart': restart(); break;
      case 'submit-selection': submitSelection(); break;
      case 'clear-selection': clearSelection(); break;
    }
  });
  window.addEventListener('resize', drawLine);
  window.addEventListener('pagehide', () => { persist(); audio.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  document.addEventListener('keydown', event => {
    if (screen !== 'play' || el<HTMLDialogElement>('#modal').open || event.target instanceof HTMLInputElement) return;
    if (event.key === 'Escape' || event.key === 'Backspace') {
      selected.pop();
      updateSelection();
    } else if (event.key === 'Enter') submitSelection();
    else if (/^[a-zñ]$/i.test(event.key)) {
      const index = wheel.findIndex((letter, i) => letter === event.key.toLowerCase() && !selected.includes(i));
      if (index >= 0) selectLetter(index);
    }
  });
}

function renderHome(): void {
  const number = current().number;
  const reward = dailyReward(save, localDate());
  const verse = verses[0];
  el('#home-screen').innerHTML = `
    <header class="home-top"><span class="edition">SCALA · JUEGOS CON PROPÓSITO</span><button class="icon-button" data-action="settings" aria-label="Ajustes">${icon('settings')}</button></header>
    <div class="brand-stage"><img class="hero-logo" src="/brand/scala-original.png" alt="SCALA, para una vida edificada" width="2048" height="1638" fetchpriority="high"/><span class="brand-rule"></span></div>
    <div class="home-title"><p class="eyebrow">CONECTA · DESCUBRE · CRECE</p><h1>Palabras <em>de Fe</em></h1><p>Un momento de paz.<br>Una palabra que te acerca.</p></div>
    <button class="primary play-cta" data-action="play"><span>${save.started ? 'Continuar el camino' : 'Comenzar a jugar'}<small>Nivel ${number} · ${chapters[current().groupIndex ?? 0].title}</small></span>${icon('arrow')}</button>
    <div class="home-shortcuts"><button class="shortcut" data-action="map">${icon('star')}<span>Mi camino<small>${progress()} de 1.000 niveles</small></span></button><button class="shortcut" data-action="verses">${icon('book')}<span>Mi colección<small>${verses.filter(v => v.unlockAt <= progress()).length} versículos</small></span></button></div>
    <button class="daily-card ${reward.amount ? 'available' : ''}" data-action="daily"><span class="daily-icon">${icon('gift')}</span><span><strong>${reward.amount ? 'Tu regalo de hoy' : '¡Gracias por venir hoy!'}</strong><small>${reward.amount ? `Recibe ${reward.amount} monedas y sigue creciendo` : `Racha de ${save.streak} ${save.streak === 1 ? 'día' : 'días'} · vuelve mañana`}</small></span><span class="daily-value">${reward.amount ? `+${reward.amount}` : icon('check')}</span></button>
    <blockquote class="home-verse">“${escape(verse.text)}”<cite>${verse.reference} · RV1909</cite></blockquote>
    <footer class="home-footer"><span>1.000 niveles · Sin conexión</span><button data-action="help">Cómo jugar</button></footer>`;
}

function startGame(): void {
  screen = 'play';
  save.started = true;
  hintMode = false;
  el<HTMLElement>('#home-screen').hidden = true;
  el<HTMLElement>('#play-screen').hidden = false;
  renderPlay();
  persist();
  feedback('click');
  if (!save.tutorialSeen) {
    save.tutorialSeen = true;
    persist();
    showHelp();
  }
}

function goHome(): void {
  window.clearTimeout(completedDialogTimer);
  closeModal();
  screen = 'home';
  hintMode = false;
  selected = [];
  pointerId = null;
  el<HTMLElement>('#play-screen').hidden = true;
  el<HTMLElement>('#home-screen').hidden = false;
  renderHome();
  persist();
  feedback('click');
}

function renderPlay(): void {
  const level = current();
  const chapter = chapters[level.groupIndex ?? 0];
  selected = [];
  wheel = [...level.letterWheel];
  pointerId = null;
  boardObserver.disconnect();
  el('#play-screen').innerHTML = `
    <header class="game-header"><button class="icon-button" data-action="home" aria-label="Volver a la portada">${icon('back')}</button><img class="header-logo" src="/brand/scala-original.png" alt="SCALA" width="2048" height="1638"/><button class="coin-balance" data-action="daily" aria-label="Monedas y regalo diario">${icon('coin')}<span id="coin-count">${save.coins}</span></button><button class="icon-button" data-action="settings" aria-label="Ajustes">${icon('settings')}</button></header>
    <button class="level-heading" data-action="map"><span class="eyebrow">${chapter.title.toUpperCase()}</span><span class="level-title">Nivel <strong>${level.number}</strong><span class="chapter-symbol">${chapter.symbol}</span></span></button>
    <div class="progress-track"><span id="level-progress"></span></div>
    <div class="board-area"><div id="board" class="board" aria-label="Crucigrama"></div></div>
    <div class="word-status"><span id="word-count"></span><button class="bonus-counter" data-action="bonus">${icon('star')}<span id="bonus-count"></span></button></div>
    <div class="selection-area"><div id="selection" class="selection" aria-live="polite">Une las letras</div><button id="clear-word" class="selection-clear" data-action="clear-selection" aria-label="Borrar palabra" hidden>${icon('close')}</button></div>
    <div id="wheel" class="letter-wheel" aria-label="Letras para formar palabras"><svg id="wheel-lines" class="wheel-lines" aria-hidden="true"><polyline id="word-line"/></svg><div id="letter-buttons"></div><button class="shuffle-button" data-action="shuffle" aria-label="Mezclar letras">${icon('shuffle')}</button></div>
    <div class="selection-actions"><button data-action="keyboard" aria-label="Escribir con teclado">${icon('keyboard')}</button><span id="gesture-help">Desliza o toca las letras</span><button id="confirm-word" data-action="submit-selection" aria-label="Comprobar palabra" hidden>${icon('check')}</button></div>
    <footer class="game-tools"><button class="tool" data-action="hint">${icon('hint')}<span>Una pista<small>35 ${icon('coin')}</small></span></button><button class="tool" data-action="verses">${icon('book')}<span>Versículos<small>Mi colección</small></span></button><button class="tool" data-action="help">${icon('star')}<span>Cómo jugar<small>Conecta y descubre</small></span></button></footer>
    <button id="completed-next" class="primary completed-next" data-action="next" hidden>${level.number === levels.length ? '¡Camino completo!' : 'Siguiente nivel'} ${icon('arrow')}</button>`;
  renderBoard();
  renderWheel();
  boardObserver.observe(el('.board-area'));
}

function renderBoard(): void {
  const level = current();
  const grid = manager.getGridState();
  const board = el('#board');
  board.style.setProperty('--cols', String(level.cols));
  board.style.setProperty('--rows', String(level.rows));
  board.style.setProperty('--cell-size', `min(38px, calc((min(100vw, 460px) - 52px - ${(level.cols - 1) * 3}px) / ${level.cols}), calc((var(--available-board-height, var(--board-height)) - ${(level.rows - 1) * 3}px) / ${level.rows}))`);
  const occupied = new Map(grid.cells.map(cell => [`${cell.row}:${cell.col}`, cell]));
  let cells = '';
  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      const cell = occupied.get(`${row}:${col}`);
      if (!cell) cells += '<span class="cell empty" aria-hidden="true"></span>';
      else cells += `<button class="cell ${cell.revealed ? 'revealed' : 'hidden-letter'}${hintMode && !cell.revealed ? ' hint-target' : ''}" data-row="${row}" data-col="${col}" aria-label="Fila ${row + 1}, columna ${col + 1}${cell.revealed ? `, ${cell.letter?.toUpperCase()}` : ', letra oculta'}" ${cell.revealed || !hintMode ? 'tabindex="-1"' : ''}>${cell.revealed ? cell.letter?.toUpperCase() : ''}</button>`;
    }
  }
  board.innerHTML = cells;
  board.onclick = event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('.hint-target');
    if (target) useHint(Number(target.dataset.row), Number(target.dataset.col));
  };
  const solved = manager.getSolvedWords().length;
  el('#word-count').textContent = `${solved} de ${level.answers.length} palabras`;
  el('#bonus-count').textContent = `Extra · ${manager.getBonusWords().length}`;
  el('#level-progress').style.width = `${solved / level.answers.length * 100}%`;
  el('#coin-count').textContent = String(save.coins);
  el<HTMLButtonElement>('#completed-next').hidden = !manager.isCurrentLevelComplete();
}

function renderWheel(): void {
  el('#letter-buttons').innerHTML = wheel.map((letter, i) => {
    const angle = -Math.PI / 2 + Math.PI * 2 * i / wheel.length;
    const x = 50 + Math.cos(angle) * 35;
    const y = 50 + Math.sin(angle) * 35;
    return `<button class="letter" data-letter="${i}" style="left:${x}%;top:${y}%" aria-label="Letra ${letter.toUpperCase()}, posición ${i + 1}">${letter.toUpperCase()}</button>`;
  }).join('');
  el('#wheel').onpointerdown = event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('.letter');
    if (!target || manager.isCurrentLevelComplete() || hintMode || el<HTMLDialogElement>('#modal').open) return;
    void audio.unlock();
    pointerId = event.pointerId;
    dragged = false;
    startPoint = { x: event.clientX, y: event.clientY };
    el('#wheel').setPointerCapture(event.pointerId);
    const index = Number(target.dataset.letter);
    if (selected.at(-1) === index) selected.pop();
    else selectLetter(index);
    updateSelection();
    event.preventDefault();
  };
  el('#wheel').onpointermove = event => {
    if (pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > 8) dragged = true;
    const target = [...document.querySelectorAll<HTMLButtonElement>('.letter')].find(button => {
      const rect = button.getBoundingClientRect();
      return Math.hypot(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2) <= rect.width * 0.62;
    });
    if (target) {
      const index = Number(target.dataset.letter);
      if (selected.length > 1 && selected.at(-2) === index) { selected.pop(); updateSelection(); } else selectLetter(index);
    }
    drawLine({ x: event.clientX, y: event.clientY });
  };
  el('#wheel').onpointerup = event => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    if (dragged) submitSelection();
    else updateSelection();
  };
  el('#wheel').onpointercancel = () => { pointerId = null; clearSelection(); };
  document.querySelectorAll<HTMLButtonElement>('.letter').forEach(button => {
    button.addEventListener('click', event => {
      if (event.detail !== 0) return;
      void audio.unlock();
      selectLetter(Number(button.dataset.letter));
    });
  });
  updateSelection();
}

function selectLetter(index: number): void {
  if (selected.includes(index) || manager.isCurrentLevelComplete()) return;
  selected.push(index);
  audio.play('select', selected.length - 1);
  updateSelection();
}

function updateSelection(): void {
  if (screen !== 'play') return;
  const text = selected.map(i => wheel[i]).join('').toUpperCase();
  el('#selection').textContent = text || (hintMode ? 'Elige una casilla para tu pista' : 'Une las letras');
  el('#selection').classList.toggle('has-word', Boolean(text));
  document.querySelectorAll<HTMLButtonElement>('.letter').forEach(button => button.classList.toggle('selected', selected.includes(Number(button.dataset.letter))));
  el<HTMLButtonElement>('#confirm-word').hidden = !text;
  el<HTMLButtonElement>('#clear-word').hidden = !text;
  drawLine();
}

function drawLine(point?: { x: number; y: number } | Event): void {
  if (screen !== 'play') return;
  const rect = el('#wheel').getBoundingClientRect();
  const points = selected.map(index => {
    const button = el<HTMLButtonElement>(`.letter[data-letter="${index}"]`).getBoundingClientRect();
    return `${button.left + button.width / 2 - rect.left},${button.top + button.height / 2 - rect.top}`;
  });
  if (point && 'x' in point && pointerId !== null) points.push(`${point.x - rect.left},${point.y - rect.top}`);
  el<SVGPolylineElement>('#word-line').setAttribute('points', points.join(' '));
}

function clearSelection(): void {
  selected = [];
  updateSelection();
}

function submitSelection(): void {
  const word = selected.map(i => wheel[i]).join('');
  clearSelection();
  if (word) acceptWord(word);
}

function rewardWord(word: string, amount: number): void {
  const key = `${current().id}:${word}`;
  if (save.creditedWords.includes(key)) return;
  save.creditedWords.push(key);
  save.coins += amount;
}

function acceptWord(rawWord: string): void {
  const word = rawWord.toLowerCase().normalize('NFD').replace(/[\u0300-\u0301\u0308]/g, '').normalize('NFC').trim();
  if (manager.isCurrentLevelComplete()) return;
  const result = manager.submitWord(word);
  if (result.result === 'solved') {
    rewardWord(word, 5);
    result.autoSolved.forEach(answer => rewardWord(answer, 5));
    feedback('correct');
    toast(`${word.toUpperCase()} · ¡Muy bien! +5`, true);
    renderBoard();
    finishIfComplete();
  } else if (result.result === 'bonus') {
    rewardWord(word, 5);
    feedback('bonus');
    toast(`${word.toUpperCase()} · Palabra extra +5`, true);
    renderBoard();
  } else if (result.result === 'already-solved' || result.result === 'already-bonus') toast('Ya encontraste esta palabra. Prueba otra.');
  else {
    feedback('wrong');
    toast(word.length < 3 ? 'Busca palabras de tres letras o más.' : 'Prueba otra combinación. Tú puedes.');
    el('#wheel').classList.remove('shake');
    void el('#wheel').offsetWidth;
    el('#wheel').classList.add('shake');
  }
  persist();
}

function finishIfComplete(): void {
  if (!manager.isCurrentLevelComplete()) return;
  const level = current();
  hintMode = false;
  if (!save.rewardedLevels.includes(level.id)) {
    save.rewardedLevels.push(level.id);
    save.coins += 50;
    feedback('complete');
    persist();
    renderBoard();
    const levelId = level.id;
    window.clearTimeout(completedDialogTimer);
    completedDialogTimer = window.setTimeout(() => {
      if (screen === 'play' && current().id === levelId) showComplete();
    }, 500);
  }
}

function showComplete(): void {
  const earnedVerse = verses.find(verse => verse.unlockAt === progress());
  const complete = current().number === levels.length;
  modal(`<div class="victory-symbol">${icon('star')}</div><p class="eyebrow">${complete ? 'CAMINO COMPLETO' : 'UN PASO MÁS EN TU CAMINO'}</p><h2>${complete ? '¡Una vida edificada!' : '¡Nivel completado!'}</h2><p class="modal-subtitle">${current().answers.length} palabras encontradas.<br>Tu constancia tiene recompensa.</p><div class="reward-pill">${icon('coin')} +50 monedas</div>${earnedVerse ? `<div class="verse-reward"><span class="eyebrow">NUEVO VERSÍCULO</span><blockquote>“${escape(earnedVerse.text)}”</blockquote><cite>${earnedVerse.reference} · RV1909</cite></div>` : ''}<button class="primary" data-action="next">${complete ? 'Volver a mi camino' : 'Siguiente nivel'} ${icon('arrow')}</button><button class="text-button" data-action="home">Volver a la portada</button>`, 'victory-modal');
}

function nextLevel(): void {
  window.clearTimeout(completedDialogTimer);
  closeModal();
  if (current().number === levels.length) { goHome(); return; }
  manager.advanceToNextLevel();
  hintMode = false;
  renderPlay();
  persist();
  feedback('click');
}

function shuffleWheel(): void {
  if (hintMode || manager.isCurrentLevelComplete()) return;
  for (let i = wheel.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wheel[i], wheel[j]] = [wheel[j], wheel[i]];
  }
  selected = [];
  renderWheel();
  feedback('shuffle');
}

function activateHint(): void {
  if (manager.isCurrentLevelComplete()) return;
  if (hintMode) { hintMode = false; renderBoard(); updateSelection(); return; }
  if (save.coins < 35) {
    modal(`<div class="modal-symbol">${icon('coin')}</div><h2>Un poquito de ayuda</h2><p>Una pista cuesta 35 monedas. Gana monedas descubriendo palabras extra, completando niveles o recogiendo tu regalo diario.</p><button class="primary" data-action="daily">Ver regalo diario ${icon('gift')}</button><button class="text-button" data-action="close">Seguir jugando</button>`);
    return;
  }
  hintMode = true;
  clearSelection();
  renderBoard();
  updateSelection();
  toast('Toca una casilla iluminada. La pista cuesta 35 monedas.');
}

function useHint(row: number, col: number): void {
  if (save.coins < 35) return;
  const result = manager.revealCell(row, col);
  if (!result.revealed) return;
  save.coins -= 35;
  hintMode = false;
  feedback('bonus');
  renderBoard();
  updateSelection();
  finishIfComplete();
  persist();
}

function modal(content: string, className = ''): void {
  const dialog = el<HTMLDialogElement>('#modal');
  if (!dialog.open) lastFocus = document.activeElement as HTMLElement | null;
  el('#modal-content').innerHTML = `<button class="modal-close icon-button" data-action="close" aria-label="Cerrar">${icon('close')}</button>${content}`;
  dialog.className = className;
  if (!dialog.open) dialog.showModal();
}

function closeModal(): void {
  const dialog = el<HTMLDialogElement>('#modal');
  if (dialog.open) dialog.close();
}

function pickLevel(number: number): void {
  if (number < 1 || number > unlocked()) return;
  const level = levels[number - 1];
  manager.jumpToLevel(level.groupId ?? chapters[0].id, level.indexInGroup ?? 0);
  closeModal();
  startGame();
}

function showMap(): void {
  const limit = unlocked();
  const chapterCards = chapters.map(chapter => {
    const done = save.rewardedLevels.filter(id => Number(id) >= chapter.start && Number(id) <= chapter.end).length;
    const available = chapter.start <= limit;
    const numbers = available ? levels.slice(chapter.start - 1, chapter.end).map(level => {
      const completed = save.rewardedLevels.includes(level.id);
      const locked = level.number > limit;
      return `<button class="level-dot ${completed ? 'done' : locked ? 'locked' : level.number === current().number ? 'current' : ''}" data-action="pick-level" data-level="${level.number}" aria-label="Nivel ${level.number}${completed ? ', completado' : locked ? ', bloqueado' : ''}" ${locked ? 'disabled' : ''}>${completed ? icon('check') : locked ? icon('lock') : level.number}</button>`;
    }).join('') : `<p class="chapter-locked">${icon('lock')} Completa el capítulo anterior para continuar.</p>`;
    return `<details class="chapter-card" ${chapter.id === current().groupId ? 'open' : ''}><summary><span class="chapter-badge">${chapter.symbol}</span><span><strong>${chapter.title}</strong><small>${chapter.subtitle} · ${done}/100</small></span><span class="chapter-range">${chapter.start}–${chapter.end}</span></summary><div class="level-map">${numbers}</div></details>`;
  }).join('');
  modal(`<p class="eyebrow">CADA PALABRA ES UN PASO</p><h2>Mi camino</h2><p class="modal-subtitle">${progress()} de 1.000 niveles completados</p><div class="chapter-list">${chapterCards}</div>`, 'large-modal');
}

function showVerses(): void {
  const unlockedVerses = verses.filter(verse => verse.unlockAt <= progress());
  const cards = verses.map(verse => {
    const available = verse.unlockAt <= progress();
    return `<article class="verse-card ${available ? '' : 'verse-locked'}"><div class="verse-card-top"><span>${available ? icon('book') : icon('lock')}</span><small>${available ? 'EN TU COLECCIÓN' : `Completa ${verse.unlockAt} niveles`}</small></div>${available ? `<blockquote>“${escape(verse.text)}”</blockquote><cite>${verse.reference}</cite>` : '<p>Una palabra de esperanza<br>te espera en el camino.</p>'}</article>`;
  }).join('');
  modal(`<p class="eyebrow">PALABRAS QUE PERMANECEN</p><h2>Mi colección</h2><p class="modal-subtitle">${unlockedVerses.length} de ${verses.length} versículos · Reina-Valera 1909</p><div class="verse-collection">${cards}</div><p class="fine-print">Texto de dominio público. Los versículos se desbloquean al completar niveles.</p>`, 'large-modal');
}

function showBonus(): void {
  const bonus = manager.getBonusWords();
  modal(`<div class="modal-symbol">${icon('star')}</div><h2>Palabras extra</h2><p>También cuentan las palabras que no están en el crucigrama. Cada palabra nueva te regala 5 monedas.</p><div class="word-chips">${bonus.length ? bonus.map(word => `<span>${word.toUpperCase()}</span>`).join('') : '<span class="empty-chip">Tu próxima palabra está por descubrir</span>'}</div><button class="primary" data-action="close">Seguir descubriendo</button>`);
}

function showDaily(): void {
  const reward = dailyReward(save, localDate());
  const days = Array.from({ length: 7 }, (item, index) => { void item; return `<span class="${index < Math.min(reward.streak, 7) ? 'active' : ''}">${icon('star')}<small>${50 + index * 10}</small></span>`; }).join('');
  modal(`<div class="modal-symbol">${icon('gift')}</div><p class="eyebrow">UN REGALO POR ESTAR AQUÍ</p><h2>${reward.amount ? 'Tu regalo de hoy' : '¡Regalo recibido!'}</h2><p>${reward.amount ? 'Vuelve cada día para recoger más monedas y mantener tu racha.' : 'Tu regalo ya está guardado. Mañana tendrás una nueva recompensa.'}</p><div class="streak-days">${days}</div><div class="reward-pill">${icon('coin')} ${reward.amount ? `+${reward.amount}` : `${save.coins} monedas`}</div><button class="primary" data-action="${reward.amount ? 'claim-daily' : 'close'}">${reward.amount ? 'Recoger mi regalo' : 'Seguir mi camino'} ${icon('check')}</button>`);
}

function claimDaily(): void {
  const today = localDate();
  const reward = dailyReward(save, today);
  if (!reward.amount) { closeModal(); return; }
  save.coins += reward.amount;
  save.lastDaily = today;
  save.streak = reward.streak;
  persist();
  feedback('bonus');
  closeModal();
  if (screen === 'home') renderHome();
  else renderBoard();
  toast(`¡Regalo recibido! +${reward.amount} monedas`, true);
}

function showSettings(): void {
  const row = (key: 'sound' | 'music' | 'haptic', title: string, description: string): string => `<button class="setting-row" data-action="${key}" role="switch" aria-checked="${save[key]}"><span><strong>${title}</strong><small>${description}</small></span><span class="toggle ${save[key] ? 'on' : ''}"><span></span></span></button>`;
  modal(`<p class="eyebrow">A TU RITMO</p><h2>Ajustes</h2><div class="settings-list">${row('sound', 'Sonidos', 'Letras, aciertos y recompensas')}${row('music', 'Música ambiental', 'Un acompañamiento suave')}${row('haptic', 'Vibración', 'Respuesta breve al jugar')}</div><div class="settings-bottom"><button class="text-button" data-action="credits">Acerca de este juego</button><button class="text-button danger" data-action="restart-confirm">Reiniciar mi progreso</button></div><p class="fine-print">SCALA Palabras de Fe · v${__APP_VERSION__}<br>Tu progreso se guarda automáticamente en este dispositivo.</p>`);
}

function toggleSetting(setting: 'sound' | 'music' | 'haptic'): void {
  save[setting] = !save[setting];
  audio.configure(save);
  persist();
  showSettings();
  feedback('click');
}

function showHelp(): void {
  modal(`<div class="help-word"><span>A</span><span>M</span><span>O</span><span>R</span></div><p class="eyebrow">UNA PALABRA A LA VEZ</p><h2>Conecta y descubre</h2><ol class="help-steps"><li><strong>Une las letras.</strong> Desliza el dedo para formar una palabra y suelta para comprobarla.</li><li><strong>Completa el crucigrama.</strong> También puedes tocar las letras y pulsar ${icon('check')}, o usar el teclado.</li><li><strong>Encuentra palabras extra.</strong> Gana monedas, usa pistas y desbloquea versículos.</li></ol><p class="fine-print">Busca palabras de 3 letras o más. Las tildes se omiten en las casillas; la Ñ conserva su forma. Puedes retroceder durante un gesto.</p><button class="primary" data-action="close">${screen === 'play' ? '¡Vamos a jugar!' : 'Entendido'} ${icon('arrow')}</button>`);
}

function showKeyboard(): void {
  modal(`<p class="eyebrow">TAMBIÉN PUEDES ESCRIBIR</p><h2>Encuentra una palabra</h2><form id="word-form"><label for="typed-word">Usa estas letras: ${wheel.join(' · ').toUpperCase()}</label><input id="typed-word" type="text" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Tu palabra" enterkeyhint="done"/><button class="primary" type="submit">Comprobar palabra ${icon('check')}</button></form>`);
  el<HTMLFormElement>('#word-form').onsubmit = event => {
    event.preventDefault();
    const word = el<HTMLInputElement>('#typed-word').value;
    closeModal();
    acceptWord(word);
  };
  el<HTMLInputElement>('#typed-word').focus();
}

function showCredits(): void {
  modal('<img class="credits-logo" src="/brand/scala-original.png" alt="SCALA para una vida edificada"/><h2>Palabras de Fe</h2><p>Un juego de SCALA para disfrutar de las palabras, descubrir la Biblia y avanzar a tu ritmo.</p><div class="credits-list"><p><strong>Motor de crucigramas</strong><br>Word Tracer · Paul Hoskinson · MIT</p><p><strong>Efectos de sonido</strong><br>Kenney Interface Sounds · CC0</p><p><strong>Música</strong><br>Amanecer · composición original SCALA</p><p><strong>Texto bíblico</strong><br>Reina-Valera 1909 · dominio público<br>Fuente: BibleAquifer / eBible</p></div><p class="fine-print">1.000 niveles · 10 capítulos · Juego sin conexión</p><button class="primary" data-action="close">Seguir mi camino</button>');
}

function showRestartConfirm(): void {
  modal('<h2>¿Empezar de nuevo?</h2><p>Se borrarán los niveles completados, las monedas y los versículos de este dispositivo.</p><button class="primary danger-button" data-action="restart">Sí, reiniciar progreso</button><button class="text-button" data-action="settings">Conservar mi progreso</button>');
}

function restart(): void {
  manager.resetAllProgress();
  save = { ...save, coins: 150, rewardedLevels: [], creditedWords: [], lastDaily: '', streak: 0, started: false, tutorialSeen: false };
  persist();
  goHome();
  toast('Tu nuevo camino comienza aquí.');
}

async function boot(): Promise<void> {
  const loaded = await store.load();
  const group = chapters.find(chapter => chapter.id === loaded?.game.currentGroupId) ?? chapters[0];
  const initialLevels = levels.filter(level => level.groupId === group.id);
  manager = loaded ? GameStateManager.hydrate(chapters, group.id, initialLevels, loaded.game) : new GameStateManager(chapters, group.id, initialLevels);
  for (const chapter of chapters) manager.setGroupLevels(chapter.id, levels.filter(level => level.groupId === chapter.id));
  if (!chapters.some(chapter => chapter.id === manager.getCurrentGroupId())) manager.jumpToLevel(chapters[0].id, 0);
  save = loaded ?? {
    version: 1, updatedAt: 0, game: manager.serialize(), coins: 150, rewardedLevels: [], creditedWords: [],
    lastDaily: '', streak: 0, sound: true, music: true, haptic: false, tutorialSeen: false, started: false,
  };
  audio.configure(save);
  mount();
  renderHome();
  persist();
  if ('serviceWorker' in navigator && !window.location.href.startsWith('https://localhost')) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}

void boot().catch(() => {
  el('#app').innerHTML = '<main class="startup-error"><h1>Palabras de Fe</h1><p>No pudimos abrir el juego. Cierra y vuelve a abrir la aplicación.</p><button class="primary" onclick="location.reload()">Volver a intentar</button></main>';
});
