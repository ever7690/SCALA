import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const dataset = JSON.parse(fs.readFileSync('src/data/bible-levels.json', 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
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

async function dragWord(page, word) {
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
  for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 12 });
  await page.mouse.up();
}

try {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(base);
  await page.locator('.hero-logo').waitFor();
  assert.equal(await page.locator('.hero-logo').evaluate(image => image.naturalWidth), 2048);
  await page.screenshot({ path: 'entregables/portada.png', fullPage: true });
  await page.locator('[data-action="play"]').click();
  await page.locator('#modal [data-action="close"]').last().click();
  assert.equal(await page.locator('.hidden-letter').count(), 10);
  await dragWord(page, 'amor');
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
  await page.locator('[data-action="music"]').click();
  assert.equal((await saveState(page)).music, false);
  await page.locator('#modal [data-action="close"]').click();
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
  assert.equal((await saveState(page)).game.currentIndexInGroup, 1);
  assert.equal(await page.locator('.letter').count(), dataset.levels[1].letterWheel.length);
  results.push('Recarga y juego sin conexión con progreso conservado');
  await context.close();
  for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    await page.goto(base);
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
  assert.deepEqual(failures, []);
  fs.writeFileSync('entregables/validacion-interfaz.json', JSON.stringify({ passed: true, results, pageErrors: failures }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, results }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
