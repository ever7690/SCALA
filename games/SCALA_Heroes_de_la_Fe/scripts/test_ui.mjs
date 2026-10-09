import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const directory = 'entregables/interfaz';
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync('entregables/pruebas-interfaz.json', JSON.stringify({ passed: false, phase: 'running' }));
const key = 'scala.heroes-de-fe.v1';
const data = JSON.parse(fs.readFileSync('src/data/questions.json'));
const { base, close } = await serve();
let browser;
const checks = [];
const errors = [];
async function value(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key); }
async function click(page, selector) {
  await page.locator(selector).first().click();
}
async function answer(page, right = true) {
  await click(page, '[data-action="answer"][data-option="' + (right ? '0' : '1') + '"]');
  await page.locator('[data-action="next"]').waitFor();
  await click(page, '[data-action="next"]');
}
async function round(page, right = 12) {
  for (let position = 0; position < 12; position++) await answer(page, position < right);
}
async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: directory + '/' + name + '.png', fullPage: true });
}
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    globalThis.__sounds = [];
    const OriginalAudio = globalThis.Audio;
    globalThis.Audio = function (...args) {
      const instance = new OriginalAudio(...args);
      globalThis.__music = instance;
      return instance;
    };
    const original = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      globalThis.__sounds.push({ frames: this.buffer?.length ?? 0, rate: this.playbackRate.value });
      return original.apply(this, args);
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#launch-brand img').evaluate(image => image.decode());
  assert.equal(await page.locator('#launch-brand p').textContent(), 'Scala desarrollo cristiano');
  assert.ok(await page.locator('#launch-brand').evaluate(node => getComputedStyle(node).backgroundImage.includes('radial-gradient')));
  assert.equal(await page.locator('#launch-brand img').evaluate(node => node.getBoundingClientRect().width), 244);
  const welcome = await page.evaluate(() => {
    const footer = document.querySelector('#launch-brand p');
    const logo = document.querySelector('#launch-brand img').getBoundingClientRect();
    return { footerBottom: innerHeight - footer.getBoundingClientRect().bottom, footerSize: parseFloat(getComputedStyle(footer).fontSize), footerColor: getComputedStyle(footer).color, logoCenter: (logo.top + logo.bottom) / 2, screenCenter: innerHeight / 2 };
  });
  assert.ok(welcome.footerBottom >= 28 && welcome.footerBottom <= 55);
  assert.ok(welcome.footerSize <= 12.5);
  assert.equal(welcome.footerColor, 'rgb(23, 27, 22)');
  assert.ok(Math.abs(welcome.logoCenter - welcome.screenCenter) < 2);
  await page.screenshot({ path: directory + '/00-bienvenida.png' });
  await page.locator('.featured .portrait').evaluate(image => image.decode());
  assert.equal(await page.locator('.scala-logo').evaluate(image => image.naturalWidth), 2048);
  await page.locator('#launch-brand').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.brand-signature').count(), 0);
  assert.equal(await page.locator('#app img[src="/brand/scala-original.png"]').count(), 1);
  const masthead = await page.evaluate(() => {
    const logo = document.querySelector('.scala-logo');
    const style = getComputedStyle(logo);
    return { width: logo.getBoundingClientRect().width, background: style.backgroundColor, border: parseFloat(style.borderTopWidth), headingGap: document.querySelector('.home-heading').getBoundingClientRect().top - document.querySelector('.topbar').getBoundingClientRect().bottom };
  });
  assert.equal(masthead.width, 96);
  assert.equal(masthead.background, 'rgba(0, 0, 0, 0)');
  assert.equal(masthead.border, 0);
  assert.ok(masthead.headingGap >= 0 && masthead.headingGap <= 5);
  assert.equal(await page.locator('.progress-panel .eyebrow [data-icon="footprint"]').count(), 1);
  assert.equal(await page.locator('[data-icon="sparkle"]').count(), 0);
  assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(252, 250, 244)');
  assert.ok(!fs.readFileSync('android/app/src/main/res/drawable/splash.xml', 'utf8').includes('scala_logo'));
  assert.ok(fs.readFileSync('android/app/src/main/res/values-v31/styles.xml', 'utf8').includes('@drawable/scala_launch_empty'));
  checks.push('Bienvenida única, firma pequeña al pie, logo transparente ampliado sin duplicación y huellas en Tu camino');
  await screenshot(page, '01-inicio');
  await click(page, '[data-action="help"]');
  await page.locator('#modal[open]').waitFor();
  await page.waitForFunction(() => globalThis.__sounds.length > 0);
  assert.ok(await page.evaluate(() => globalThis.__sounds.length > 0));
  assert.ok(await page.evaluate(() => globalThis.__sounds.every(sound => sound.frames > 0)));
  await click(page, '#modal [data-action="close"]');
  await page.waitForFunction(() => globalThis.__sounds.length >= 2);
  await click(page, '[data-action="coins"]');
  await page.locator('.coin-balance').waitFor();
  assert.equal(await page.locator('.coin-balance strong').textContent(), '120');
  assert.equal(await page.locator('.coin-aid').count(), 3);
  await page.waitForFunction(() => globalThis.__sounds.length >= 3);
  assert.equal(await page.evaluate(() => new Set(globalThis.__sounds.slice(0, 3).map(sound => sound.frames)).size), 3);
  await screenshot(page, '00-monedas');
  await click(page, '#modal [data-action="close"]');
  await click(page, '[data-action="nav"][data-view="settings"]');
  await page.locator('[data-setting="music"]').check();
  await page.waitForFunction(() => globalThis.__music?.readyState >= 2);
  assert.equal(await page.evaluate(() => globalThis.__music.loop), true);
  assert.equal(await page.evaluate(() => new URL(globalThis.__music.src).pathname), '/audio/heroes-luz-del-camino.ogg');
  const musicDuration = await page.evaluate(async () => {
    const context = new AudioContext();
    try {
      const response = await fetch(globalThis.__music.src);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      return buffer.duration;
    } finally { await context.close(); }
  });
  assert.ok(Math.abs(musicDuration - 87.2) < 0.1);
  await page.waitForFunction(() => !globalThis.__music.paused);
  await page.locator('[data-setting="music"]').uncheck();
  await page.locator('[data-setting="haptic"]').uncheck();
  const beforeMute = await page.evaluate(() => globalThis.__sounds.length);
  await page.locator('[data-setting="sound"]').uncheck();
  await click(page, '[data-action="nav"][data-view="home"]');
  assert.equal(await page.evaluate(() => globalThis.__sounds.length), beforeMute);
  checks.push('Ayuda, cierre y monedas con notas distintas; música original decodificada y silencio respetado');
  await click(page, '[data-action="start"]');
  await page.locator('.question-panel').waitFor();
  await screenshot(page, '02-pregunta');
  assert.equal(await page.locator('.answer').count(), 4);
  await click(page, '[data-aid="half"]');
  assert.equal(await page.locator('.answer.removed').count(), 2);
  assert.equal((await value(page)).coins, 95);
  assert.equal(await page.locator('[data-option="0"]').isDisabled(), false);
  await click(page, '[data-aid="verse"]');
  await page.locator('.scripture-hint').waitFor();
  assert.equal((await value(page)).coins, 75);
  await page.reload();
  await click(page, '[data-action="resume"]');
  await page.locator('.question-panel').waitFor();
  assert.equal(await page.locator('.answer.removed').count(), 2);
  assert.equal(await page.locator('.scripture-hint').count(), 1);
  assert.equal((await value(page)).settings.sound, false);
  await page.locator('[data-option="0"]').dblclick();
  await page.locator('[data-action="next"]').waitFor();
  assert.equal((await value(page)).session.answers.filter(Boolean).length, 1);
  await screenshot(page, '03-respuesta');
  await click(page, '[data-action="favorite"]');
  await click(page, '[data-action="scripture"]');
  await page.locator('#modal[open] .scripture-text').waitFor();
  const frozenAt = await page.locator('#clock').textContent();
  await page.waitForTimeout(1150);
  assert.equal(await page.locator('#clock').textContent(), frozenAt);
  await click(page, '#modal [data-action="close"]');
  await click(page, '[data-action="next"]');
  for (let position = 1; position < 12; position++) await answer(page);
  await page.locator('.result-heading').waitFor();
  const finished = await value(page);
  assert.equal(finished.xp, 220);
  assert.equal(finished.coins, 121);
  assert.equal(finished.rounds, 1);
  assert.equal(finished.favorites.length, 1);
  assert.equal(await page.locator('.unlock-card').count(), 1);
  await screenshot(page, '04-resultado');
  await page.reload();
  assert.equal((await value(page)).xp, 220);
  checks.push('Ronda real, ayudas cobradas una vez, doble toque y reanudación comprobados');
  await click(page, '[data-action="nav"][data-view="journey"]');
  await screenshot(page, '05-camino');
  assert.equal(await page.locator('.hero-card').count(), 12);
  await click(page, '.hero-card[data-hero="abraham"]');
  await click(page, '#modal [data-action="practice"]');
  await page.locator('.question-panel').waitFor();
  assert.equal(await page.locator('#clock').textContent(), 'Sin reloj');
  await click(page, '[data-aid="half"]');
  await click(page, '[data-aid="verse"]');
  assert.equal((await value(page)).coins, 121);
  await round(page);
  await page.locator('.result-heading').waitFor();
  assert.equal((await value(page)).xp, 220);
  assert.equal((await value(page)).coins, 121);
  checks.push('Héroe desbloqueado y práctica gratuita sin reloj ni XP');
  await click(page, '[data-action="nav"][data-view="home"]');
  await click(page, '[data-action="daily"]');
  await page.locator('.question-panel').waitFor();
  await round(page);
  await page.locator('.result-heading').waitFor();
  const daily = await value(page);
  assert.equal(daily.xp, 465);
  assert.equal(daily.coins, 187);
  await click(page, '[data-action="again"]');
  await page.locator('.question-panel').waitFor();
  await round(page);
  await page.locator('.result-heading').waitFor();
  const replayed = await value(page);
  assert.equal(replayed.xp, daily.xp);
  assert.equal(replayed.coins, daily.coins);
  assert.equal(replayed.session.rewardXp, 0);
  checks.push('Desafío diario y repetición sin duplicar premios');
  await click(page, '[data-action="nav"][data-view="home"]');
  await click(page, '[data-action="duel"]');
  await page.locator('#duel-form').waitFor();
  await page.locator('[name="first"]').fill('<Ana>');
  await page.locator('[name="second"]').fill('Luis');
  await page.locator('#duel-form [type="submit"]').click();
  await page.locator('.question-panel').waitFor();
  const firstDuel = await value(page);
  await click(page, '[data-option="0"]');
  await page.locator('.answer-feedback.neutral').waitFor();
  assert.equal(await page.locator('.answer.correct,.answer.incorrect').count(), 0);
  assert.equal(await page.locator('[data-action="scripture"]').count(), 0);
  await click(page, '[data-action="next"]');
  for (let position = 1; position < 12; position++) await answer(page);
  await page.locator('.handoff').waitFor();
  assert.equal(await page.locator('.duel-scores').count(), 0);
  await screenshot(page, '06-cambio-de-turno');
  await page.reload();
  await click(page, '[data-action="resume"]');
  await page.locator('.handoff').waitFor();
  await click(page, '[data-action="second"]');
  await page.locator('.question-panel').waitFor();
  assert.deepEqual((await value(page)).session.questionIds, firstDuel.session.questionIds);
  assert.deepEqual((await value(page)).session.choiceOrders, firstDuel.session.choiceOrders);
  await round(page, 11);
  await page.locator('.duel-scores').waitFor();
  assert.ok((await page.locator('.result-heading').textContent()).includes('<Ana>'));
  assert.equal(await page.locator('.result-heading ana').count(), 0);
  const finalDuel = await value(page);
  assert.equal(finalDuel.xp, daily.xp);
  assert.equal(finalDuel.coins, daily.coins);
  await screenshot(page, '07-duelo');
  checks.push('Duelo de dos turnos justo, nombres escapados y cambio de turno persistente');
  await click(page, '[data-action="nav"][data-view="collection"]');
  await screenshot(page, '08-coleccion');
  await click(page, '[data-action="tab"][data-tab="favorites"]');
  assert.equal(await page.locator('.saved-question').count(), 1);
  await click(page, '[data-action="nav"][data-view="settings"]');
  await screenshot(page, '09-ajustes');
  await click(page, '[data-action="privacy"]');
  assert.ok((await page.locator('#modal').textContent()).includes('no envía datos'));
  await click(page, '#modal [data-action="close"]');
  await click(page, '[data-action="credits"]');
  await click(page, '#modal [data-license="phosphor"]');
  await page.locator('.license-text').waitFor();
  assert.ok((await page.locator('.license-text').textContent()).includes('Copyright (c) 2023 Phosphor Icons'));
  await click(page, '#modal [data-action="close"]');
  await click(page, '[data-action="nav"][data-view="home"]');
  await click(page, '[data-action="start"]');
  await page.locator('.question-panel').waitFor();
  const offlineQuestion = await page.locator('.question-panel').getAttribute('data-question-id');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await click(page, '[data-action="resume"]');
  assert.equal(await page.locator('.question-panel').getAttribute('data-question-id'), offlineQuestion);
  await page.locator('.question-hero img').evaluate(image => image.decode());
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('16px Manrope')), true);
  const offlineAudio = await page.evaluate(async () => {
    const context = new AudioContext();
    try {
      return await Promise.all(['/audio/heroes-coins.wav', '/audio/heroes-luz-del-camino.ogg'].map(async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Offline audio unavailable');
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        return { duration: buffer.duration, channels: buffer.numberOfChannels };
      }));
    } finally { await context.close(); }
  });
  assert.ok(offlineAudio.every(buffer => buffer.duration > 0 && buffer.channels === 2));
  assert.ok(Math.abs(offlineAudio[1].duration - 87.2) < 0.1);
  assert.ok(await page.evaluate(async () => (await (await fetch('/licenses/PHOSPHOR-MIT.txt')).text()).includes('Phosphor Icons')));
  checks.push('Modo sin conexión: recarga, fuentes, ilustraciones, música, efectos y ronda guardada');
  await context.setOffline(false);
  await context.close();
  for (const width of [320, 390]) {
    const small = await browser.newContext({ viewport: { width, height: width === 320 ? 640 : 844 }, reducedMotion: 'reduce' });
    const longest = [...data].sort((a, b) => b.prompt.length + Math.max(...b.choices.map(item => item.length)) - a.prompt.length - Math.max(...a.choices.map(item => item.length)))[0];
    const ids = [longest.id, ...data.filter(item => item.heroId === longest.heroId && item.id !== longest.id).slice(0, 11).map(item => item.id)];
    await small.addInitScript(({ key, longest, ids }) => {
      localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, xp: 4000, coins: 120, settings: { sound: false, music: false, haptic: false, reducedMotion: true }, session: { id: 'long-question', mode: 'journey', heroId: longest.heroId, seed: 123, questionIds: ids, index: 0, answers: ids.map(() => null) } }));
    }, { key, longest, ids });
    const screen = await small.newPage();
    screen.on('pageerror', error => errors.push(error.message));
    await screen.goto(base);
    assert.ok(await screen.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await click(screen, '[data-action="resume"]');
    await screen.locator('.question-panel').waitFor();
    assert.equal(await screen.locator('.question-panel').getAttribute('data-question-id'), longest.id);
    assert.ok(await screen.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const option of await screen.locator('.answer').all()) {
      assert.ok((await option.boundingBox()).height >= 44);
      await option.scrollIntoViewIfNeeded();
      assert.ok(await option.isVisible());
    }
    await screenshot(screen, '10-pantalla-' + width);
    await small.close();
  }
  checks.push('320 y 390 px, pregunta larga, cuatro opciones accesibles y sin desbordamiento');
  assert.deepEqual(errors, []);
  const report = { passed: true, checks, pageErrors: errors };
  fs.writeFileSync('entregables/pruebas-interfaz.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  await close();
}
