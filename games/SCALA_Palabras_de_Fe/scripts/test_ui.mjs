import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const dataset = JSON.parse(fs.readFileSync('src/data/bible-levels.json', 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = path.resolve('dist', url.pathname === '/' ? 'index.html' : `.${decodeURIComponent(url.pathname)}`);
  if (!file.startsWith(path.resolve('dist') + path.sep) || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  response.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
const failures = [];
const results = [];
fs.mkdirSync('entregables', { recursive: true });

async function saveState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('scala.palabras-de-fe.v1')));
}

async function typeWord(page, word) {
  await page.locator('[data-action="keyboard"]').click();
  await page.locator('#typed-word').fill(word);
  await page.locator('#word-form .primary').click();
}

async function dragWord(page, word, avoidCrossing = false) {
  const letters = await page.locator('.letter').evaluateAll(buttons => buttons.map(button => ({ text: button.textContent.toLowerCase(), index: Number(button.dataset.letter) })));
  const used = new Set();
  const points = [];
  for (const letter of word) {
    const match = letters.find(item => item.text === letter && !used.has(item.index));
    assert(match, `Falta la letra ${letter} para ${word}`);
    used.add(match.index);
    const box = await page.locator(`[data-letter="${match.index}"]`).boundingBox();
    points.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  const wheel = await page.locator('#wheel').boundingBox();
  for (const point of points.slice(1)) {
    if (avoidCrossing) await page.mouse.move(wheel.x + wheel.width / 2, wheel.y + wheel.height / 2, { steps: 8 });
    await page.mouse.move(point.x, point.y, { steps: 12 });
  }
  await page.mouse.up();
}

try {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    window.scalaPlayedAudio = [];
    window.scalaDecodedAudio = 0;
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (...args) {
      return decode.apply(this, args).then(buffer => {
        window.scalaDecodedAudio++;
        return buffer;
      });
    };
    const createSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = createSource.call(this);
      const connect = source.connect.bind(source);
      const start = source.start.bind(source);
      let gain = 0;
      source.connect = function (...args) {
        if (args[0]?.gain) gain = args[0].gain.value;
        return connect(...args);
      };
      source.start = function (...args) {
        window.scalaPlayedAudio.push({ duration: source.buffer?.duration, rate: source.playbackRate.value, gain });
        return start(...args);
      };
      return source;
    };
  });
  const page = await context.newPage();
  const externalRequests = [];
  page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(base);
  await page.locator('.hero-logo').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('16px "SCALA Sans"') && document.fonts.check('16px "SCALA Serif"')), true);
  assert.equal(await page.locator('.hero-logo').evaluate(image => image.naturalWidth), 2048);
  await page.screenshot({ path: 'entregables/portada.png', fullPage: true });
  await page.locator('[data-action="play"]').click();
  await page.locator('#modal [data-action="close"]').last().click();
  await page.waitForFunction(() => window.scalaDecodedAudio === 7);
  assert.equal(await page.locator('.hidden-letter').count(), 10);
  await dragWord(page, 'amor');
  const letterAudio = await page.evaluate(() => window.scalaPlayedAudio.filter(item => Math.abs(item.duration - 0.56) < 0.001));
  assert.equal(letterAudio.length, 4);
  assert(letterAudio.every(item => Math.abs(item.gain - 0.24) < 0.001));
  await page.locator('[data-action="shuffle"]').click();
  const shuffleAudio = await page.evaluate(() => window.scalaPlayedAudio.at(-1));
  assert(Math.abs(shuffleAudio.duration - 0.06820861678004535) < 0.001);
  assert(Math.abs(shuffleAudio.gain - 0.55) < 0.001);
  assert.equal(shuffleAudio.rate, 1);
  results.push('Campanilla en las cuatro letras del gesto; sonido de mezclar conservado');
  assert((await saveState(page)).game.levels['1'].solved.includes('amor'));
  assert.equal((await saveState(page)).coins, 155);
  await typeWord(page, 'amor');
  assert.equal((await saveState(page)).coins, 155);
  await typeWord(page, 'mar');
  assert.equal((await saveState(page)).coins, 160);
  await typeWord(page, 'mar');
  assert.equal((await saveState(page)).coins, 160);
  await typeWord(page, 'zzzz');
  assert.equal((await saveState(page)).coins, 160);
  await page.locator('[data-action="hint"]').click();
  await page.locator('.hint-target').first().click();
  assert.equal((await saveState(page)).coins, 125);
  assert.equal((await saveState(page)).game.levels['1'].revealedCells.length, 1);
  await page.screenshot({ path: 'entregables/juego.png', fullPage: true });
  await page.reload();
  await page.locator('[data-action="play"]').click();
  assert.equal(await page.locator('#coin-count').textContent(), '125');
  assert((await saveState(page)).game.levels['1'].solved.includes('amor'));
  for (const word of ['ramo', 'roma']) await typeWord(page, word);
  await page.locator('.victory-modal').waitFor();
  assert.equal((await saveState(page)).rewardedLevels.length, 1);
  await page.screenshot({ path: 'entregables/nivel-completado.png', fullPage: true });
  await page.locator('#modal [data-action="next"]').click();
  assert.equal((await saveState(page)).game.currentIndexInGroup, 1);
  await page.locator('.level-heading').click();
  assert.equal(await page.locator('[data-level="3"]').isDisabled(), true);
  await page.screenshot({ path: 'entregables/capitulos.png', fullPage: true });
  await page.locator('#modal [data-action="close"]').click();
  await page.locator('.game-header [data-action="settings"]').click();
  await page.locator('[data-action="sound"]').click();
  assert.equal((await saveState(page)).sound, false);
  await page.locator('#modal [data-action="close"]').click();
  const mutedAudioCount = await page.evaluate(() => window.scalaPlayedAudio.length);
  await page.locator('.letter').first().click();
  assert.equal(await page.evaluate(() => window.scalaPlayedAudio.length), mutedAudioCount);
  await page.locator('#clear-word').click();
  await page.locator('.game-header [data-action="settings"]').click();
  await page.locator('[data-action="music"]').click();
  assert.equal((await saveState(page)).music, false);
  assert.equal(await page.locator('[data-action="music"]').evaluate(button => button === document.activeElement), true);
  await page.locator('[data-action="privacy"]').click();
  assert.equal(await page.locator('#modal').getAttribute('aria-labelledby'), 'modal-title');
  assert((await page.locator('.privacy-sections').textContent()).includes('copias de seguridad'));
  await page.screenshot({ path: 'entregables/privacidad.png', fullPage: true });
  await page.locator('#modal [data-action="settings"]').click();
  await page.locator('[data-action="restart-confirm"]').click();
  await page.locator('#modal [data-action="settings"]').click();
  assert.equal((await saveState(page)).game.currentIndexInGroup, 1);
  await page.screenshot({ path: 'entregables/ajustes.png', fullPage: true });
  await page.locator('#modal [data-action="close"]').click();
  assert.equal(await page.locator('.game-header [data-action="settings"]').evaluate(button => button === document.activeElement), true);
  await page.locator('.coin-balance').click();
  const beforeGift = (await saveState(page)).coins;
  await page.locator('[data-action="claim-daily"]').click();
  assert.equal((await saveState(page)).coins, beforeGift + 50);
  await page.locator('.coin-balance').click();
  assert.equal(await page.locator('[data-action="claim-daily"]').count(), 0);
  await page.locator('#modal [data-action="close"]').first().click();
  results.push('Gesto real, duplicados, bonus, palabras incorrectas, pista, guardado, recompensa de nivel, bloqueo, ajustes y regalo diario');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-action="play"]').click();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('16px "SCALA Sans"') && document.fonts.check('16px "SCALA Serif"')), true);
  assert.equal((await saveState(page)).game.currentIndexInGroup, 1);
  assert.equal(await page.locator('.letter').count(), dataset.levels[1].letterWheel.length);
  await page.waitForFunction(() => window.scalaDecodedAudio === 7);
  await page.locator('.game-header [data-action="settings"]').click();
  await page.locator('[data-action="sound"]').click();
  await page.locator('#modal [data-action="close"]').click();
  await page.locator('.letter').first().click();
  const offlineAudio = await page.evaluate(() => window.scalaPlayedAudio.at(-1));
  assert(Math.abs(offlineAudio.duration - 0.56) < 0.001);
  assert(Math.abs(offlineAudio.gain - 0.24) < 0.001);
  results.push('Campanilla disponible sin conexión y selección de letras silenciosa con Sonidos desactivado');
  results.push('Recarga y juego sin conexión con progreso conservado');
  assert.deepEqual(externalRequests, []);
  results.push('Tipografías sin conexión, privacidad accesible, foco conservado y ninguna petición a servidores externos');
  await context.close();
  for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-action="play"]').click();
    await page.locator('#modal [data-action="close"]').last().click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    const footer = await page.locator('.game-tools').boundingBox();
    assert(footer.y + footer.height <= viewport.height + 2, `Controles fuera de pantalla ${viewport.width}`);
    await page.screenshot({ path: `entregables/movil-${viewport.width}.png`, fullPage: true });
    results.push(`Pantalla ${viewport.width}×${viewport.height}: sin desbordamiento y controles accesibles`);
    await context.close();
  }
  for (const number of [265, 1000]) {
    const level = dataset.levels[number - 1];
    const context = await browser.newContext({ viewport: { width: 320, height: 640 }, reducedMotion: 'reduce' });
    await context.addInitScript(level => {
      localStorage.setItem('scala.palabras-de-fe.v1', JSON.stringify({
        version: 1, updatedAt: Date.now(), coins: 500, rewardedLevels: Array.from({ length: level.number - 1 }, (item, index) => { void item; return String(index + 1); }),
        creditedWords: [], lastDaily: '', streak: 0, sound: false, music: false, haptic: false, started: true, tutorialSeen: true,
        game: { schemaVersion: 3, currentGroupId: level.groupId, currentIndexInGroup: level.indexInGroup, levels: {} },
      }));
    }, level);
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-action="play"]').click();
    assert.equal(await page.locator('.letter').count(), 8);
    const board = await page.locator('#board').boundingBox();
    const area = await page.locator('.board-area').boundingBox();
    assert(board.x >= 0 && board.x + board.width <= 320);
    assert(board.y >= area.y - 1 && board.y + board.height <= area.y + area.height + 1);
    assert.equal(await page.locator('.cell.revealed').first().count(), 0);
    await dragWord(page, level.focusWord, true);
    assert((await saveState(page)).game.levels[level.id]?.solved.includes(level.focusWord), `Gesto en nivel ${number}: ${await page.locator('#toast').textContent()}`);
    if (number === 1000) {
      for (const answer of level.answers) {
        if ((await saveState(page)).rewardedLevels.length === 1000) break;
        if (!(await saveState(page)).game.levels[level.id].solved.includes(answer.text)) await typeWord(page, answer.text);
      }
      await page.locator('.victory-modal').waitFor();
      assert((await page.locator('#modal h2').textContent()).includes('vida edificada'));
      const before = (await saveState(page)).coins;
      await page.locator('#modal [data-action="next"]').click();
      assert.equal((await saveState(page)).coins, before);
      await page.locator('[data-action="play"]').click();
      await page.locator('#completed-next').click();
      assert.equal((await saveState(page)).coins, before);
      results.push('Nivel 1000: final completo, letras repetidas y recompensas sin duplicarse');
    } else {
      await page.screenshot({ path: 'entregables/crucigrama-amplio.png', fullPage: true });
      results.push('Crucigrama de 11 columnas con 8 letras en 320×640 y movimiento reducido');
    }
    await context.close();
  }
  assert.deepEqual(failures, []);
  fs.writeFileSync('entregables/validacion-interfaz.json', JSON.stringify({ passed: true, results, pageErrors: failures }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, results }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
