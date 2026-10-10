import './styles.css';
import './premium.css';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { calmActivities, kindnessIdeas, scalaWebsite } from './premium.ts';
import { Capacitor } from '@capacitor/core';
import { characters, lessons, lessonById, moods, type CharacterId, type IconId, type Mood } from './content.ts';
import { AppAudio, type Cue } from './audio.ts';
import { icon, face } from './icons.ts';
import { storyIcon, storyIllustration } from './illustrations.ts';
import { animateEyes } from './eyes.ts';
import { initialState, completeLesson, recordPractice, nextLesson, pinFailure, resetProgress, isMood, type Settings } from './state.ts';
import { loadState, saveState, flushState } from './storage.ts';
import { createPin, verifyPin, verifyRecovery } from './pin.ts';

type Route = 'home' | 'feelings' | 'help' | 'path' | 'lesson' | 'settings' | 'family' | 'friends' | 'calm' | 'kindness' | 'scala';
type Modal = 'setup' | 'unlock' | 'recovery' | 'recovery-code' | 'reset' | 'external' | null;
const root = document.querySelector<HTMLDivElement>('#app')!;
const launch = document.querySelector<HTMLElement>('#launch-brand')!;
const enter = document.querySelector<HTMLButtonElement>('#enter-world')!;
let state = initialState();
let route: Route = 'home';
let modal: Modal = null;
let lessonId = lessons[0].id;
let step = 0;
let selected: number | null = null;
let selectedMood: Mood | null = null;
let adultUnlocked = false;
let adultResetPin = false;
let recoveryCode = '';
let formMessage = '';
let busy = false;
let storageError = false;
let entered = false;
let chapter: number | null = null;
let calmId = 0;
let calmStarted = 0;
let calmTimer: ReturnType<typeof setInterval> | null = null;
let calmMessage = '';
let kindnessId = 0;
let previousFocus: HTMLElement | null = null;
let stopEyes = (): void => undefined;
const audio = new AppAudio(state.settings);
const esc = (value: string): string => value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const actor = (id: CharacterId, cls = ''): string => `<img class="actor actor-${id} ${cls}" src="/characters/${id}.webp" alt="${characters[id].name}" decoding="async" width="${id === 'lupi' ? '512' : '512'}" height="${id === 'lupi' ? '512' : '768'}">`;
const button = (action: string, text: string, id: IconId = 'play', cls = 'primary'): string => `<button type="button" class="${cls}" data-action="${action}">${icon(id)}<span>${text}</span></button>`;
function persist(): Promise<void> {
  return saveState(state).then(() => { storageError = false; }).catch(() => {
    storageError = true;
    const notice = document.querySelector('#save-notice');
    if (notice) { notice.textContent = 'No pudimos guardar este cambio. Mantén la app abierta y vuelve a intentarlo.'; notice.removeAttribute('hidden'); }
  });
}
function header(): string {
  return `<header class="topbar"><button class="brand-home" type="button" data-nav="home" aria-label="Ir al inicio"><img src="/brand/scala-original.png" alt="SCALA" width="93" height="75"></button><div class="wordmark"><span>ESCALITO Y SUS AMIGOS</span><strong>Pequeños Valientes</strong></div><button class="round-button help-shortcut" type="button" data-nav="help" aria-label="Buscar ayuda">${icon('help')}</button></header>`;
}
function nav(): string {
  const items: { route: Route; label: string; icon: IconId }[] = [{ route: 'home', label: 'Inicio', icon: 'home' }, { route: 'feelings', label: 'Siento', icon: 'heart' }, { route: 'path', label: 'Aventuras', icon: 'path' }, { route: 'family', label: 'Familia', icon: 'family' }, { route: 'settings', label: 'Ajustes', icon: 'gear' }];
  return `<nav class="bottom-nav" aria-label="Menú principal">${items.map(item => `<button type="button" data-nav="${item.route}" ${route === item.route || route === 'lesson' && item.route === 'path' ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span></button>`).join('')}</nav>`;
}
function title(kicker: string, heading: string, description = ''): string {
  return `<div class="page-heading"><p class="eyebrow">${kicker}</p><h1 id="page-title" tabindex="-1">${heading}</h1>${description ? `<p>${description}</p>` : ''}</div>`;
}
function home(): string {
  return `${title('UN MUNDO PARA CRECER JUNTOS', '¡Hola, pequeño valiente!')}<section class="welcome-scene" aria-label="Escalito y Lupi en el jardín"><div class="scene-copy"><span class="pill">Tu voz importa</span><h2>Aquí aprendemos<br>a cuidarnos.</h2><p>Con historias, cariño<br>y buenos amigos.</p></div>${actor('escalito')}${actor('lupi')}<div class="scene-ground"></div></section><button type="button" class="support-banner" data-nav="help">${icon('feel')}<span><strong>¿Se burlaron de ti?</strong><small>Podemos buscar apoyo juntos.</small></span><span class="arrow" aria-hidden="true">›</span></button><div class="action-grid">${tile('feelings', 'heart', '¿Cómo me siento?', 'Todas las emociones cuentan', 'peach')}${tile('path', 'story', 'Historias para mí', 'Escucha, elige y aprende', 'yellow')}${tile('path', 'path', 'Mi aventura', `${state.completed.length} de ${lessons.length} historias practicadas`, 'green')}${tile('friends', 'friends', 'Mis amigos', 'Conoce a nuestro grupo', 'purple')}</div><section class="next-adventure"><div>${icon('friends')}<div><span class="eyebrow">UN PASITO A LA VEZ</span><h2>${state.completed.length === lessons.length ? 'Podemos volver a practicar' : 'Vamos a descubrir algo juntos'}</h2></div></div>${button('continue', state.session ? 'Continuar mi historia' : 'Comenzar una historia', 'play')}</section>${premiumHome()}<p class="home-footer">Aprendemos con fe, respeto y personas que nos cuidan.</p>`;
}
function tile(destination: Route, symbol: IconId, heading: string, description: string, color: string): string {
  return `<button type="button" class="activity-tile ${color}" data-nav="${destination}">${icon(symbol)}<strong>${heading}</strong><span>${description}</span></button>`;
}
function feelings(): string {
  const mood = moods.find(item => item.id === selectedMood);
  return `${title('TE ESCUCHAMOS', '¿Cómo te sientes?', 'Puedes elegir una emoción. No hay una respuesta correcta.') }<div class="feelings-guide"><div>${actor('lupi')}</div><p>Todos los sentimientos tienen un lugar.<br><strong>Elige el que se parece al tuyo.</strong></p></div><div class="mood-grid">${moods.map(item => `<button type="button" class="mood-button ${item.id === selectedMood ? 'selected' : ''}" style="--tile-color:${item.color}" data-mood="${item.id}" aria-pressed="${item.id === selectedMood}">${face(item.id)}<strong>${item.label}</strong></button>`).join('')}</div>${mood ? `<section class="message-card" aria-live="polite"><h2>Está bien sentirte ${mood.label.toLowerCase()}.</h2><p>${mood.message}</p>${button('help', 'Quiero hablar con alguien', 'help', 'secondary')}</section>` : '<p class="quiet-note">Puedes cambiar de emoción o cerrar esta pantalla cuando quieras.</p>'}<section class="small-card"><h2>Un momento para ti</h2><p>Si te ayuda, haz una pausa y respira a tu ritmo. Después puedes hablar con una persona que te cuide.</p></section>`;
}
function help(): string {
  return `${title('NO TIENES QUE RESOLVERLO A SOLAS', 'Busquemos apoyo', 'Lo que pasó no es tu culpa. Mereces que te escuchen.') }<section class="help-hero">${actor('escalito')}<div><h2>Tu seguridad importa.</h2><p>Si alguien puede hacerte daño, aléjate si puedes y busca ayuda de un adulto ahora.</p></div></section><ol class="help-steps"><li><span>1</span><div><h2>Busca a alguien que te cuide</h2><p>Un familiar, tu docente u otra persona adulta de confianza.</p></div></li><li><span>2</span><div><h2>Puedes empezar así</h2><blockquote>«Quiero contarte algo. Esto pasó y necesito ayuda».</blockquote></div></li><li><span>3</span><div><h2>Sigue buscando apoyo</h2><p>Si esa persona no te escucha, cuéntaselo a otro adulto que te cuide.</p></div></li></ol><section class="small-card"><h2>No tienes que enfrentarte a nadie</h2><p>Si te sientes seguro, puedes decir «Eso me molesta. Por favor, para». También puedes ir directamente a pedir ayuda.</p></section>${button('lesson:pido-ayuda', 'Practicar cómo pedir ayuda', 'story')}<p class="quiet-note">Esta pantalla te orienta. La app no llama ni envía mensajes a otras personas.</p>`;
}
function path(): string {
  return `${title('30 HISTORIAS PARA DESCUBRIR', 'Nuestra aventura', 'A tu ritmo. Puedes elegir cualquier historia y repetirla.') }<div class="journey-summary">${icon('path')}<div><strong>${state.completed.length} de ${lessons.length} historias practicadas</strong><span>Aprendemos paso a paso.</span></div></div>${chapterTabs()}<div class="lesson-list">${lessons.filter((_, index) => chapter === null || Math.floor(index / 5) === chapter).map((lesson) => `<button type="button" class="lesson-tile" data-lesson="${lesson.id}" style="--tile-color:${lesson.color}"><span class="lesson-number">${state.completed.includes(lesson.id) ? icon('check') : lessons.indexOf(lesson) + 1}</span>${storyIcon(lesson.id)}<span class="lesson-label"><strong>${lesson.title}</strong><small>${lesson.subtitle}</small></span><span class="arrow" aria-hidden="true">›</span></button>`).join('')}</div><p class="quiet-note">30 aventuras para 30 momentos distintos. Puedes volver, descansar y elegir cualquier historia a tu ritmo.</p>`;
}
function lessonView(): string {
  const lesson = lessonById(lessonId)!;
  const challenge = step === 1 || step === 2 ? lesson.challenges[step - 1] : null;
  const choice = challenge && selected !== null ? challenge.choices[selected] : null;
  const stages = ['Escuchamos', 'Elegimos', 'Practicamos', 'Compartimos'];
  return `<div class="lesson-top">${button('path', 'Mis aventuras', 'back', 'text-button')}<span>${step + 1} / 4</span></div>${title(lesson.subtitle.toUpperCase(), lesson.title)}<div class="stage-bar" aria-label="${stages[step]}, paso ${step + 1} de 4">${stages.map((stage, i) => `<span class="${i <= step ? 'active' : ''}">${i + 1}<small>${stage}</small></span>`).join('')}</div>${step === 0 ? `${storyIllustration(lesson)}<button type="button" class="voice-button secondary" data-action="narration" aria-pressed="false">${icon('voice')}<span>Escuchar la historia</span></button><section class="story-text">${lesson.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</section><p class="bible-note">${esc(lesson.bible)}</p>${button('lesson-next', 'Vamos a elegir', 'play')}` : challenge ? `<section class="challenge-card"><span class="pill">Pensemos juntos</span><h2>${esc(challenge.question)}</h2><button type="button" class="voice-button question-voice secondary" data-action="question-voice" aria-pressed="false">${icon('voice')}<span>Escuchar la pregunta y las opciones</span></button><div class="choice-list">${challenge.choices.map((item, i) => `<button type="button" data-choice="${i}" class="choice ${selected === i ? 'selected' : ''}" aria-pressed="${selected === i}"><span class="choice-letter">${String.fromCharCode(65 + i)}</span><span>${esc(item.text)}</span>${selected === i && item.helpful ? icon('check') : ''}</button>`).join('')}</div><div class="feedback ${choice ? choice.helpful ? 'helpful' : 'think' : ''}" role="status">${choice ? `<strong>${choice.helpful ? 'Una idea que ayuda' : 'Podemos pensarlo de otra manera'}</strong><p>${esc(choice.feedback)}</p>` : '<p>Elige una idea para conversar sobre ella.</p>'}</div></section><button type="button" class="primary" data-action="lesson-next" ${choice?.helpful ? '' : 'disabled'}>${icon('play')}<span>${step === 1 ? 'Sigamos practicando' : 'Compartir lo aprendido'}</span></button>${button('lesson-back', 'Volver un paso', 'back', 'text-button')}` : `<section class="practice-finish">${icon('care')}<span class="pill">Lo practicamos juntos</span><h2>¡Un paso más para cuidarnos!</h2><p>${esc(lesson.practice)}</p><div class="family-note">${icon('family')}<span>Ahora puedes conversar sobre esta idea con tu familia.</span></div></section>${button('finish', 'Guardar mi aventura', 'check')}${button('lesson-back', 'Volver a practicar', 'back', 'text-button')}`}`;
}
function settings(): string {
  const slider = (name: 'music' | 'sound' | 'voice', label: string, description: string, symbol: IconId): string => `<label class="setting-row">${icon(symbol)}<span><strong>${label}</strong><small>${description}</small><input type="range" min="0" max="100" value="${Math.round(state.settings[name] * 100)}" data-setting="${name}" aria-label="Volumen de ${label.toLowerCase()}"></span><output id="volume-${name}">${Math.round(state.settings[name] * 100)}%</output></label>`;
  return `${title('A TU MANERA', 'Ajustes', 'Elige cómo quieres escuchar y ver tu aventura.') }<section class="settings-card">${slider('music', 'Música', 'Un fondo suave que te acompaña', 'sun')}${slider('sound', 'Botones', 'Pequeños sonidos al elegir', 'gear')}${slider('voice', 'Narración', 'Historias, preguntas y opciones', 'voice')}</section>${musicPicker()}<section class="settings-card"><label class="toggle-row"><span><strong>Letras más grandes</strong><small>Más espacio para leer</small></span><input type="checkbox" role="switch" data-toggle="largeText" ${state.settings.largeText ? 'checked' : ''}></label><label class="toggle-row"><span><strong>Movimiento suave</strong><small>Ojitos y transiciones suaves</small></span><input type="checkbox" role="switch" data-toggle="motion" ${state.settings.motion ? 'checked' : ''}></label></section><section class="settings-brand"><img src="/brand/scala-original.png" alt="SCALA" width="152" height="122"><small>Desarrollo cristiano</small><h2>Pequeños Valientes</h2><p>Versión 1.2.0 · Una aventura con Escalito y sus amigos</p></section>${button('family', 'Espacio para la familia', 'lock', 'secondary')}<p class="quiet-note">Las historias y los sonidos están en tu teléfono. Puedes jugar sin conexión.</p>`;
}
function friends(): string {
  return `${title('CADA AMIGO TIENE ALGO ESPECIAL', 'Nuestro grupo', 'Aprendemos a escucharnos y a cuidar lo que hacemos.') }<div class="friends-grid">${(Object.keys(characters) as CharacterId[]).map(id => `<article class="friend-card" style="--tile-color:${characters[id].color}"><div>${actor(id)}</div><h2>${characters[id].name}</h2><p>${characters[id].description}</p></article>`).join('')}</div>${button('path', 'Descubrir sus historias', 'story')}`;
}
function family(): string {
  if (!adultUnlocked) return `${title('UN ESPACIO PARA ADULTOS', 'Acompañemos su camino')}<section class="small-card"><p>El acceso familiar se abre con tu PIN. Un adulto puede crearlo la primera vez.</p>${button('family', state.pin ? 'Abrir con mi PIN' : 'Crear acceso familiar', 'lock')}</section>`;
  return `${title('ESCUCHAR, ACOMPAÑAR Y PROTEGER', 'Espacio para la familia', 'Una experiencia educativa para conversar con niños de 6 a 12 años.') }<section class="family-brand"><img src="/brand/scala-original.png" alt="SCALA" width="110" height="88"><div><strong>Pequeños Valientes</strong><small>Desarrollo cristiano</small></div></section><section class="small-card"><h2>Lo que ha practicado</h2><p>${state.completed.length} de ${lessons.length} historias. Puede repetirlas a su ritmo.</p><ul class="progress-list">${lessons.map(lesson => `<li>${icon(state.completed.includes(lesson.id) ? 'check' : lesson.icon)}<span>${lesson.title}</span><small>${state.completed.includes(lesson.id) ? 'Practicada' : 'Por descubrir'}</small></li>`).join('')}</ul></section><section class="small-card"><h2>Cómo acompañar</h2><p>Escuche con calma y tome en serio lo que cuenta. Explique que no es su culpa. Si las burlas se repiten, acuerde protección con su escuela y otras personas que lo cuidan.</p><p>El niño no tiene que resolver la situación solo. Las actividades sirven para conversar; el apoyo real lo ofrecen los adultos.</p></section>${lessons.map(lesson => `<details class="adult-guide"><summary>${lesson.title}</summary><p>${esc(lesson.adult)}</p><p class="bible-note">${esc(lesson.bible)}</p></details>`).join('')}<details class="adult-guide"><summary>Privacidad y uso responsable</summary><p>La zona infantil no incluye anuncios de terceros, compras, cuentas, rastreadores ni chat. El espacio adulto incluye un enlace promocional opcional al catálogo de SCALA, que abre una página externa con sus propias condiciones y prácticas de datos. No pedimos nombres, ubicación, fotografías ni relatos personales. Las emociones elegidas no se guardan.</p><p>El progreso, los ajustes y la protección del acceso familiar se guardan solo en este dispositivo. El PIN y el código de recuperación se guardan como hashes, no como texto. El PIN es una barrera de uso local, no una verificación de edad.</p><p>Una copia de respaldo local permite recuperar el último guardado válido. Desinstalar o borrar los datos de la app elimina estos datos. Esta versión es educativa y no ofrece diagnóstico, atención de emergencia ni tratamiento.</p></details>${adultCatalog()}<div class="family-actions">${button('change-pin', 'Cambiar mi PIN', 'lock', 'secondary')}${button('reset', 'Borrar el progreso', 'back', 'text-button')}${button('lock-family', 'Cerrar espacio familiar', 'lock', 'primary')}</div>`;
}
function modalView(): string {
  if (!modal) return '';
  let content = '';
  if (modal === 'setup') content = `<h2 id="dialog-title">${state.pin ? 'Cambiar mi PIN' : 'Crear acceso familiar'}</h2><p>Para una persona adulta que acompaña al niño. Usa cuatro cifras que puedas recordar.</p><form id="pin-form"><label>Tu PIN<input type="password" name="pin" inputmode="numeric" autocomplete="off" minlength="4" maxlength="4" pattern="[0-9]{4}" required aria-label="Tu PIN de cuatro cifras"></label><label>Repite el PIN<input type="password" name="confirm" inputmode="numeric" autocomplete="off" minlength="4" maxlength="4" pattern="[0-9]{4}" required></label><label class="adult-check"><input type="checkbox" name="adult" required><span>Soy la persona adulta que acompaña esta experiencia.</span></label><button type="submit" class="primary" ${busy ? 'disabled' : ''}>${icon('lock')}<span>${busy ? 'Preparando…' : 'Guardar mi PIN'}</span></button></form>`;
  if (modal === 'unlock') content = `<h2 id="dialog-title">Abrir espacio familiar</h2><p>Una persona adulta puede ingresar su PIN de cuatro cifras.</p><form id="pin-form"><label>Tu PIN<input type="password" name="pin" inputmode="numeric" autocomplete="off" minlength="4" maxlength="4" pattern="[0-9]{4}" required aria-label="Tu PIN de cuatro cifras"></label><button type="submit" class="primary" ${busy ? 'disabled' : ''}>${icon('lock')}<span>${busy ? 'Comprobando…' : 'Abrir con mi PIN'}</span></button></form>${button('forgot', 'Olvidé el PIN', 'back', 'text-button')}`;
  if (modal === 'recovery') content = `<h2 id="dialog-title">Recuperar el acceso</h2><p>Escribe el código que guardaste al crear tu PIN. Después podrás elegir otro PIN sin borrar el progreso.</p><form id="pin-form"><label>Código de recuperación<input type="text" name="recovery" autocomplete="off" maxlength="24" required spellcheck="false"></label><button type="submit" class="primary" ${busy ? 'disabled' : ''}>${icon('lock')}<span>Comprobar código</span></button></form><p class="quiet-note">Si no guardaste el código, reinstalar la app restablece el acceso y borra el progreso local.</p>`;
  if (modal === 'recovery-code') content = `<h2 id="dialog-title">Guarda tu código</h2><p>Solo lo mostramos ahora. Anótalo y consérvalo con una persona adulta para recuperar el PIN.</p><code class="recovery-code">${recoveryCode.match(/.{1,4}/gu)?.join(' – ') || ''}</code><p>Este código reemplaza cualquier código anterior.</p>${button('saved-code', 'Ya guardé mi código', 'check')}`;
  if (modal === 'external') content = `<h2 id="dialog-title">Catálogo de SCALA para adultos</h2><p>Vas a abrir vitacala.online en el navegador. Encontrarás recursos y productos de SCALA. La página externa requiere internet y tiene sus propias condiciones y prácticas de privacidad.</p>${button('open-catalog', 'Abrir la página de SCALA', 'home')}${button('close-modal', 'Quedarme en la aplicación', 'back', 'secondary')}`;
  if (modal === 'reset') content = `<h2 id="dialog-title">¿Borrar el progreso?</h2><p>Se borrarán las historias practicadas, los pequeños gestos y la aventura en curso. Tus ajustes y el PIN se conservan.</p>${button('confirm-reset', 'Sí, borrar el progreso', 'back')}${button('close-modal', 'Conservar mi progreso', 'check', 'secondary')}`;
  return `<div class="modal-shade"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${modal !== 'recovery-code' ? `<button type="button" class="close-dialog" data-action="close-modal" aria-label="Cerrar ventana">×</button>` : ''}${icon('lock', 'dialog-icon')}${content}<p class="form-message" role="status">${esc(formMessage)}</p></section></div>`;
}
function render(focus = false): void {
  stopEyes();
  document.documentElement.classList.toggle('large-text', state.settings.largeText);
  document.documentElement.classList.toggle('reduce-motion', !state.settings.motion);
  const views: Record<Route, () => string> = { home, feelings, help, path, lesson: lessonView, settings, family, friends, calm, kindness, scala: scalaHouse };
  const landscapes: Record<Route, string> = { home: "garden", feelings: "forest", help: "forest", path: "garden", lesson: lessonById(lessonId)!.scene, settings: "house", family: "house", friends: "urban", calm: "forest", kindness: "garden", scala: "house" };
  root.innerHTML = `<div class="app-shell" data-landscape="${landscapes[route]}">${header()}<main id="main-content" class="page page-${route}">${views[route]()}</main><p id="save-notice" class="save-notice" role="alert" ${storageError ? '' : 'hidden'}>${storageError ? 'No pudimos guardar este cambio. Mantén la app abierta y vuelve a intentarlo.' : ''}</p>${nav()}</div>${modalView()}`;
  root.querySelector('.app-shell')?.toggleAttribute('inert', modal !== null);
  if (modal) root.querySelector<HTMLInputElement>('.dialog input')?.focus();
  else if (focus) { window.scrollTo(0, 0); root.querySelector<HTMLElement>('#page-title')?.focus({ preventScroll: true }); }
  updateVoiceButton();
  stopEyes = animateEyes(root, state.settings.motion && modal === null);
}
function updateVoiceButton(): void {
  const voiceButton = root.querySelector<HTMLButtonElement>('.voice-button');
  if (voiceButton) { voiceButton.setAttribute('aria-pressed', String(audio.speaking)); voiceButton.querySelector('span:last-child')!.textContent = audio.speaking ? 'Detener la narración' : voiceButton.classList.contains('question-voice') ? 'Escuchar la pregunta y las opciones' : 'Escuchar la historia'; }
}
audio.onVoiceChange = updateVoiceButton;
function openModal(next: Modal): void { previousFocus = document.activeElement as HTMLElement; modal = next; formMessage = ''; render(); }
function closeModal(): void {
  modal = null; formMessage = ''; adultResetPin = false; render();
  const action = previousFocus?.dataset.action;
  const destination = previousFocus?.dataset.nav;
  if (action) root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus();
  else if (destination) root.querySelector<HTMLElement>(`[data-nav="${destination}"]`)?.focus();
  else root.querySelector<HTMLElement>('.brand-home')?.focus();
}
function navigate(next: Route): void {
  audio.stopVoice(); stopCalm();
  if (next === 'family') {
    if (!adultUnlocked) { openModal(state.pin ? 'unlock' : 'setup'); return; }
  } else adultUnlocked = false;
  route = next; selectedMood = null; render(true);
}
function openLesson(id: string, resume = false): void {
  if (!lessonById(id)) return;
  audio.stopVoice(); stopCalm(); adultUnlocked = false; lessonId = id; step = resume && state.session?.lessonId === id ? state.session.step : 0; selected = null;
  state = { ...state, session: { lessonId, step } }; void persist(); route = 'lesson'; render(true);
  if (step === 1 || step === 2) void audio.playVoice(`pregunta-${lessonId}-${step}`);
}
const navCue: Record<Route, Cue> = { home: 'home', feelings: 'feel', help: 'help', path: 'path', lesson: 'story', family: 'family', settings: 'settings', friends: 'family', calm: 'calm', kindness: 'kindness', scala: 'scala' };
root.addEventListener('click', async event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!target || target.disabled || busy) return;
  const destination = target.dataset.nav as Route | undefined;
  if (destination) { audio.play(navCue[destination]); navigate(destination); return; }
  if (target.dataset.chapter !== undefined) { chapter = target.dataset.chapter === 'all' ? null : Number(target.dataset.chapter); audio.play('path'); render(); return; }
  if (target.dataset.calm !== undefined) { stopCalm(); calmId = Number(target.dataset.calm); calmMessage = ''; audio.play('calm'); render(); return; }
  if (target.dataset.kindness !== undefined) { kindnessId = Number(target.dataset.kindness); audio.play('kindness'); render(); return; }
  if (target.dataset.musicTheme) { state = { ...state, settings: { ...state.settings, musicTheme: target.dataset.musicTheme === 'clasico' ? 'clasico' : 'tierno' } }; audio.update(state.settings); void persist(); audio.play('toggle'); render(); return; }
  if (target.dataset.lesson) { audio.play('story'); openLesson(target.dataset.lesson); return; }
  if (target.dataset.mood && isMood(target.dataset.mood)) { selectedMood = target.dataset.mood; audio.play('feel'); render(); root.querySelector<HTMLElement>(`[data-mood="${selectedMood}"]`)?.focus(); return; }
  if (target.dataset.choice !== undefined && (step === 1 || step === 2)) {
    audio.stopVoice(); selected = Number(target.dataset.choice); state = recordPractice(state, lessonId); void persist(); audio.play('select'); render(); root.querySelector<HTMLElement>(`[data-choice="${selected}"]`)?.focus(); return;
  }
  const action = target.dataset.action;
  if (!action) return;
  audio.play(action === 'narration' ? 'voice' : action === 'finish' ? 'complete' : action.includes('back') ? 'back' : 'practice');
  if (action === 'calm-start') { startCalm(); return; }
  if (action === 'calm-stop') { stopCalm(); calmMessage = 'Puedes descansar o elegir otra actividad cuando quieras.'; render(); return; }
  if (action === 'kindness-done') { state = { ...state, kindness: [...new Set([...state.kindness, kindnessId])] }; await persist(); render(); return; }
  if (action === 'catalog' && adultUnlocked) { openModal('external'); return; }
  if (action === 'open-catalog' && adultUnlocked && modal === 'external') {
    audio.setActive(false); adultUnlocked = false; modal = null; route = 'home'; render(true);
    try { await Browser.open({ url: scalaWebsite, toolbarColor: '#ffe3ba' }); if (!Capacitor.isNativePlatform()) audio.setActive(!document.hidden); } catch { audio.setActive(true); openModal('unlock'); formMessage = 'No pudimos abrir el navegador. Puedes intentarlo de nuevo con una persona adulta.'; render(); }
    return;
  }
  if (action.startsWith('lesson:')) { openLesson(action.slice(7)); return; }
  if (action === 'continue') { openLesson(state.session?.lessonId || nextLesson(state), true); return; }
  if (action === 'lesson-next') {
    if ((step === 1 || step === 2) && (selected === null || !lessonById(lessonId)!.challenges[step - 1].choices[selected]?.helpful)) return;
    step = Math.min(3, step + 1); selected = null; audio.stopVoice(); state = { ...state, session: { lessonId, step } }; void persist(); render(true); if (step === 1 || step === 2) void audio.playVoice(`pregunta-${lessonId}-${step}`); return;
  }
  if (action === 'lesson-back') { audio.stopVoice(); step = Math.max(0, step - 1); selected = null; state = { ...state, session: { lessonId, step } }; void persist(); render(true); if (step === 1 || step === 2) void audio.playVoice(`pregunta-${lessonId}-${step}`); return; }
  if (action === 'finish') { state = completeLesson(state, lessonId); await persist(); navigate('path'); return; }
  if (action === 'narration' || action === 'question-voice') { const played = await audio.playVoice(action === 'narration' ? lessonId : `pregunta-${lessonId}-${step}`); if (!played) target.querySelector('span:last-child')!.textContent = state.settings.voice === 0 ? 'Activa la narración en Ajustes' : 'Toca otra vez para escuchar'; return; }
  if (action === 'forgot') { openModal('recovery'); return; }
  if (action === 'close-modal') { closeModal(); return; }
  if (action === 'saved-code') { recoveryCode = ''; modal = null; adultUnlocked = true; route = 'family'; render(true); return; }
  if (action === 'change-pin' && adultUnlocked) { adultResetPin = true; openModal('setup'); return; }
  if (action === 'reset' && adultUnlocked) { openModal('reset'); return; }
  if (action === 'confirm-reset' && adultUnlocked) { state = resetProgress(state); await persist(); closeModal(); return; }
  if (action === 'lock-family') { adultUnlocked = false; navigate('home'); return; }
  if (['home', 'help', 'path', 'family'].includes(action)) navigate(action as Route);
});
root.addEventListener('input', event => {
  const input = event.target as HTMLInputElement;
  const setting = input.dataset.setting as 'music' | 'sound' | 'voice' | undefined;
  if (!setting) return;
  state = { ...state, settings: { ...state.settings, [setting]: Math.max(0, Math.min(1, Number(input.value) / 100)) } };
  audio.update(state.settings); const output = root.querySelector(`#volume-${setting}`); if (output) output.textContent = input.value + '%'; void persist();
});
root.addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  const toggle = input.dataset.toggle as keyof Pick<Settings, 'motion' | 'largeText'> | undefined;
  if (toggle) { state = { ...state, settings: { ...state.settings, [toggle]: input.checked } }; audio.play('toggle'); void persist(); render(); root.querySelector<HTMLElement>(`[data-toggle="${toggle}"]`)?.focus(); }
  else if (input.dataset.setting) audio.play('toggle');
});
root.addEventListener('submit', async event => {
  event.preventDefault();
  if (!(event.target instanceof HTMLFormElement) || event.target.id !== 'pin-form' || busy || !modal) return;
  const form = new FormData(event.target);
  if (state.pinBlockedUntil > Date.now() && modal !== 'setup') { formMessage = 'Espera un momento antes de volver a intentarlo.'; render(); return; }
  const mode = modal;
  busy = true; formMessage = ''; render();
  try {
    if (mode === 'setup') {
      if (state.pin && !adultUnlocked && !adultResetPin) throw new Error('Abre el acceso con tu PIN o código primero.');
      const pin = String(form.get('pin') || '');
      if (pin !== String(form.get('confirm') || '')) throw new Error('Los dos PIN deben coincidir.');
      if (form.get('adult') !== 'on') throw new Error('La persona adulta debe confirmar este paso.');
      const result = await createPin(pin);
      state = { ...state, pin: result.record, failedPins: 0, pinBlockedUntil: 0 };
      await persist(); recoveryCode = result.recovery; modal = 'recovery-code'; adultResetPin = false;
    } else if (mode === 'unlock' || mode === 'recovery') {
      if (!state.pin) throw new Error('Primero crea un acceso familiar.');
      const valid = mode === 'unlock' ? await verifyPin(String(form.get('pin') || ''), state.pin) : await verifyRecovery(String(form.get('recovery') || ''), state.pin);
      if (!valid) { state = pinFailure(state, Date.now()); await persist(); throw new Error(state.pinBlockedUntil > Date.now() ? 'Espera un momento antes de volver a intentarlo.' : 'No coincide. Revisa las cifras e inténtalo de nuevo.'); }
      state = { ...state, failedPins: 0, pinBlockedUntil: 0 }; await persist();
      if (mode === 'recovery') { adultResetPin = true; modal = 'setup'; }
      else { adultUnlocked = true; modal = null; route = 'family'; }
    }
    audio.play('lock');
  } catch (error) { formMessage = error instanceof Error ? error.message : 'No pudimos abrir el acceso. Inténtalo de nuevo.'; }
  finally { busy = false; render(!modal); }
});
document.addEventListener('keydown', event => {
  if (!modal) return;
  if (event.key === 'Escape' && modal !== 'recovery-code' && !busy) { closeModal(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...root.querySelectorAll<HTMLElement>('.dialog button:not([disabled]), .dialog input:not([disabled])')];
  const first = focusable[0]; const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
function suspend(active: boolean): void {
  audio.setActive(active);
  if (!active) { stopEyes(); stopCalm(); adultUnlocked = false; selectedMood = null; if (modal !== 'recovery-code') modal = null; void flushState(); }
  else if (entered) render();
}
document.addEventListener('visibilitychange', () => suspend(!document.hidden));
if (Capacitor.isNativePlatform()) {
  void Browser.addListener('browserFinished', () => suspend(true));
  void App.addListener('appStateChange', ({ isActive }) => suspend(isActive));
  void App.addListener('backButton', () => {
    if (busy || modal === 'recovery-code') return;
    if (modal) closeModal();
    else if (entered && route !== 'home') navigate('home');
    else { audio.setActive(false); void flushState().finally(() => App.exitApp()); }
  });
}
enter.addEventListener('click', () => {
  entered = true; launch.hidden = true; root.hidden = false; render(true); void audio.unlock().then(() => audio.play('home'));
});
async function prepareVisuals(): Promise<void> {
  const assets = [...Object.keys(characters).map(id => `/characters/${id}.webp`), ...['heart', 'story', 'mischief', 'help', 'friends', 'home', 'gear', 'sun', 'play', 'check', 'back', 'lock', 'voice', 'gift', 'feel', 'care', 'adventure'].map(id => `/icons/toys/${id}.webp`), '/backgrounds/garden.webp', '/backgrounds/forest.webp'];
  await Promise.all(assets.map(async source => { const image = new Image(); image.src = source; await image.decode().catch(() => undefined); }));
}
void Promise.all([loadState(), prepareVisuals()]).then(([result]) => {
  state = result.state; audio.update(state.settings); enter.disabled = false; enter.textContent = 'Entrar a mi aventura';
}).catch(() => { enter.disabled = false; enter.textContent = 'Entrar a mi aventura'; });
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
function premiumHome(): string {
  return `<section class="explore-world"><div class="section-heading"><span class="eyebrow">OTROS RINCONES DE NUESTRO MUNDO</span><h2>Pequeños momentos, grandes cuidados</h2></div><div class="world-grid">${tile('calm', 'feel', 'Mi rincón de calma', 'Pausas suaves, a tu ritmo', 'green')}${tile('kindness', 'gift', 'Pequeños gestos', '30 maneras de cuidar', 'peach')}${tile('scala', 'home', 'La casa SCALA', 'Un lugar para crecer juntos', 'yellow')}</div></section>`;
}
function chapterTabs(): string {
  return `<div class="chapter-tabs" aria-label="Grupos de aventuras"><button type="button" data-chapter="all" aria-pressed="${chapter === null}">Todas</button>${['1–5', '6–10', '11–15', '16–20', '21–25', '26–30'].map((label, i) => `<button type="button" data-chapter="${i}" aria-pressed="${chapter === i}">${label}</button>`).join('')}</div>`;
}
function musicPicker(): string {
  return `<section class="settings-card continuous-music">${icon('heart')}<h2>Una melodía que te acompaña</h2><p>Desde la bienvenida y durante tu aventura. Puedes ajustar su volumen o apagarla cuando quieras.</p></section>`;
}
function adultCatalog(): string {
  return `<section class="small-card adult-catalog"><span class="eyebrow">CATÁLOGO PROMOCIONAL · SOLO PARA ADULTOS</span>${icon('home')}<h2>Recursos de SCALA para tu familia</h2><p>Conoce nuestros juegos, cuentos, alabanzas y otros contenidos en la página de SCALA.</p>${button('catalog', 'Conocer los recursos de SCALA', 'story', 'secondary')}<small>Enlace externo opcional. No es necesario para jugar ni continuar las historias.</small></section>`;
}
function scalaHouse(): string {
  return `${button('home', 'Volver a nuestro mundo', 'back', 'text-button')}${title('UN LUGAR DONDE TU VOZ CUENTA', 'La casa SCALA', 'Aprendemos, compartimos y crecemos acompañados.')}<section class="story-scene house"><div class="cast">${actor('escalito')}${actor('ana')}${actor('lupi')}</div></section><section class="story-text"><h2>Construimos con pequeños cuidados</h2><p>Escalito y sus amigos descubrieron una casita con una puerta azul. Allí cada persona tiene lugar para hablar, crear y aprender, incluso en los días difíciles.</p><p>En este mundo imaginario, las familias acompañan y cuidan. Las historias nos invitan a llevar a nuestra vida el respeto, la fe y los gestos amables.</p></section>${button('lesson:casa-scala', 'Descubrir nuestra casa', 'story')}<div class="house-values"><span>${icon('voice')}Escuchamos</span><span>${icon('heart')}Cuidamos</span><span>${icon('friends')}Aprendemos juntos</span></div>`;
}
function kindness(): string {
  const done = state.kindness.includes(kindnessId);
  return `${button('home', 'Volver a nuestro mundo', 'back', 'text-button')}${title('LA BONDAD SE PRACTICA EN PEQUEÑO', 'Pequeños gestos', 'Puedes elegir una idea y probarla con alguien que te cuide.')}<section class="kindness-card">${icon('gift')}<span class="pill">Gesto ${kindnessId + 1} de 30</span><h2>${kindnessIdeas[kindnessId]}</h2><p>No es una obligación ni una competencia. Elige lo que sea cómodo y seguro para ti.</p>${done ? '<p class="kindness-saved" role="status">Este gesto ya está guardado como practicado.</p>' : button('kindness-done', 'Lo practiqué con cariño', 'check')}</section><div class="gesture-picker" aria-label="Elegir un gesto">${kindnessIdeas.map((_, i) => `<button type="button" data-kindness="${i}" aria-label="Gesto ${i + 1}${state.kindness.includes(i) ? ', practicado' : ''}" aria-pressed="${kindnessId === i}">${i + 1}${state.kindness.includes(i) ? '<span aria-hidden="true">✓</span>' : ''}</button>`).join('')}</div><p class="quiet-note">${state.kindness.length} gestos practicados a tu ritmo. Si alguien te lastima, la bondad también puede ser pedir ayuda y cuidar tus límites.</p>`;
}
function calm(): string {
  const activity = calmActivities[calmId];
  return `${button('home', 'Volver a nuestro mundo', 'back', 'text-button')}${title('UN MOMENTO PARA RESPIRAR Y ESTAR', 'Mi rincón de calma', 'No tienes que sentirte de una manera concreta. Puedes parar cuando quieras.')}<div class="calm-options">${calmActivities.map((item, i) => `<button type="button" data-calm="${i}" aria-pressed="${calmId === i}">${icon(i === 0 ? 'feel' : i === 1 ? 'sun' : 'heart')}<span>${item.title}<small>${item.subtitle}</small></span></button>`).join('')}</div><section class="calm-card ${calmTimer ? 'running' : ''}"><div class="calm-orbit" aria-hidden="true">${icon('heart')}</div><h2>${activity.title}</h2><p id="calm-phase" aria-live="polite">${calmMessage || (calmTimer ? activity.phases[0] : 'Busca un lugar cómodo, acompañado si lo necesitas.')}</p><p id="calm-time" class="quiet-note">${calmTimer ? 'Este momento dura 40 segundos.' : 'Una pausa breve. Sin contener la respiración.'}</p>${calmTimer ? button('calm-stop', 'Terminar la pausa', 'back', 'secondary') : button('calm-start', 'Comenzar mi momento', 'play')}</section>${button('help', 'Necesito hablar con alguien', 'help', 'secondary')}<p class="quiet-note">Una pausa no reemplaza pedir ayuda. Si respirar de esta manera te incomoda, elige mirar el paisaje o detente.</p>`;
}
function stopCalm(): void {
  if (calmTimer) clearInterval(calmTimer);
  calmTimer = null; calmStarted = 0;
}
function startCalm(): void {
  stopCalm(); calmMessage = ''; calmStarted = Date.now();
  calmTimer = setInterval(() => {
    const activity = calmActivities[calmId];
    const elapsed = Math.floor((Date.now() - calmStarted) / 1000);
    if (elapsed >= activity.seconds) { stopCalm(); calmMessage = activity.end; audio.play('calm'); render(); return; }
    const phase = document.querySelector('#calm-phase');
    const message = activity.phases[Math.min(3, Math.floor(elapsed / 10))];
    if (phase && phase.textContent !== message) phase.textContent = message;
    const remaining = document.querySelector('#calm-time');
    if (remaining) remaining.textContent = `${activity.seconds - elapsed} segundos. Puedes parar cuando quieras.`;
  }, 1000);
  render();
}
