import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const output = 'entregables/tienda';
fs.mkdirSync(output, { recursive: true });
const dataset = JSON.parse(fs.readFileSync('src/data/bible-levels.json', 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
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
const png = file => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  const mark = png('public/brand/palabras-de-fe-icon-v2.png');
  await page.setContent(`<html><body style="margin:0;background:#081829;display:grid;place-items:center;width:512px;height:512px"><img src="${mark}" style="width:100%;height:100%;object-fit:contain"></body></html>`);
  await page.locator('img').evaluate(image => image.decode());
  const icon = await page.evaluate(async mark => {
    const image = new Image();
    image.src = mark;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d', { alpha: true });
    context.fillStyle = '#081829';
    context.fillRect(0, 0, 512, 512);
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, 512, 512);
    const square = canvas.toDataURL('image/png').split(',')[1];
    context.clearRect(0, 0, 512, 512);
    context.save();
    context.beginPath();
    context.arc(256, 256, 256, 0, 2 * Math.PI);
    context.clip();
    context.drawImage(image, 0, 0, 512, 512);
    context.restore();
    return { square, round: canvas.toDataURL('image/png').split(',')[1] };
  }, mark);
  fs.writeFileSync(`${output}/icono-512.png`, Buffer.from(icon.square, 'base64'));
  if (process.argv.includes('--brand')) {
    fs.copyFileSync(`${output}/icono-512.png`, 'public/brand/scala-icon.png');
    const resources = 'android/app/src/main/res/mipmap-nodpi';
    for (const name of ['ic_launcher.png', 'scala_launcher_art.png']) fs.writeFileSync(`${resources}/${name}`, Buffer.from(icon.square, 'base64'));
    for (const name of ['ic_launcher_round.png', 'scala_launcher_round_art.png']) fs.writeFileSync(`${resources}/${name}`, Buffer.from(icon.round, 'base64'));
  }
  await page.setViewportSize({ width: 900, height: 370 });
  await page.setContent(`<html><head><style>body{margin:0;background:#f7f3e8;color:#18334a;font:14px system-ui}.row{display:flex;gap:55px;justify-content:center;align-items:center;height:270px}.sample{text-align:center}.mask{background:#081829;width:144px;height:144px;display:grid;place-items:center;overflow:hidden}.mask img{width:100%;height:100%;object-fit:contain}.circle{border-radius:50%}.squircle{border-radius:27%}.sample p{margin-top:18px;font-weight:600}.note{text-align:center;color:#576a76;font-size:13px}</style></head><body><div class="row"><div class="sample"><div class="mask circle"><img src="${mark}"></div><p>Palabras de Fe</p></div><div class="sample"><div class="mask squircle"><img src="${mark}"></div><p>Palabras de Fe</p></div><div class="sample"><div class="mask"><img src="${mark}"></div><p>Palabras de Fe</p></div></div><p class="note">Palabras de Fe · máscaras habituales de Android · arte sin recuadro ni margen exterior.</p></body></html>`);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.screenshot({ path: 'entregables/preview-iconos.png' });
  if (!process.argv.includes('--brand-only')) {
    const font = file => fs.readFileSync(file).toString('base64');
    await page.setViewportSize({ width: 1024, height: 500 });
    const focus = dataset.levels[0];
    const cells = new Map();
    for (const answer of focus.answers) for (const [index, point] of answer.path.entries()) {
      const key = point.join(':');
      cells.set(key, { letter: answer.text[index], show: cells.get(key)?.show || answer.text === 'amor' });
    }
    let board = '';
    for (let row = 0; row < focus.rows; row++) for (let col = 0; col < focus.cols; col++) {
      const cell = cells.get(`${row}:${col}`);
      board += `<span class="tile ${!cell ? 'empty' : cell.show ? 'found' : ''}">${cell?.show ? cell.letter.toUpperCase() : ''}</span>`;
    }
    await page.setContent(`<html><head><style>@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font('public/fonts/manrope-variable.woff2')})}@font-face{font-family:Lora;src:url(data:font/woff2;base64,${font('public/fonts/lora-variable.woff2')})}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 70% 110%,#667365,transparent 65%),linear-gradient(130deg,#081829,#15384b);color:#f7f0de;width:1024px;height:500px;position:relative;overflow:hidden;font-family:Manrope}.glow{position:absolute;right:-60px;bottom:-200px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,#b4a57250,transparent 65%)}.brand{position:absolute;left:74px;top:70px;font-size:15px;color:#eac776;letter-spacing:4px;font-weight:750}.copy{position:absolute;left:74px;top:142px}h1{font:400 62px/1.17 Lora;margin:0;letter-spacing:-1.5px}h1 span{color:#edc777}p{font-size:19px;color:#c7d4dc;line-height:1.6;margin:23px 0}.bottom{font-size:14px;letter-spacing:.5px;color:#e8d8b7}.puzzle{position:absolute;right:94px;top:95px;display:grid;grid-template-columns:repeat(${focus.cols},48px);grid-template-rows:repeat(${focus.rows},48px);gap:7px;transform:rotate(-8deg)}.tile{border:1px solid #fff7df;background:linear-gradient(140deg,#fff5dc,#e6dfcd);border-radius:9px;box-shadow:0 4px 0 #98a5a5,0 8px 22px #06152330;display:grid;place-items:center;font-size:25px;font-weight:800;color:#17374d}.tile.found{background:linear-gradient(140deg,#f7df9d,#e3b963);border-color:#ffedb4;box-shadow:0 4px 0 #9d823f,0 8px 22px #06152330}.tile.empty{background:none;border:0;box-shadow:none}.line{position:absolute;left:74px;bottom:60px;width:72px;height:2px;background:#caa75c}</style></head><body><div class="glow"></div><div class="brand">SCALA</div><div class="copy"><h1>Palabras <span>de Fe</span></h1><p>Conecta palabras.<br>Descubre la Biblia.</p><div class="bottom">1.000 niveles · Sin conexión</div></div><div class="puzzle">${board}</div><div class="line"></div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/grafico-1024x500.jpg`, type: 'jpeg', quality: 96 });
    await page.close();
    for (const [position, number] of [1, 265, 701].entries()) {
      const level = dataset.levels[number - 1];
      const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, reducedMotion: 'reduce' });
      await context.addInitScript(level => {
        localStorage.setItem('scala.palabras-de-fe.v1', JSON.stringify({
          version: 1, updatedAt: Date.now(), coins: 180, rewardedLevels: Array.from({ length: level.number - 1 }, (item, index) => { void item; return String(index + 1); }),
          creditedWords: [], lastDaily: '', streak: 0, sound: false, music: false, haptic: false, tutorialSeen: true, started: true,
          game: { schemaVersion: 3, currentGroupId: level.groupId, currentIndexInGroup: level.indexInGroup, levels: {} },
        }));
      }, level);
      const screen = await context.newPage();
      await screen.goto(base);
      await screen.locator('[data-action="play"]').click();
      await screen.evaluate(() => document.fonts.ready);
      await screen.locator('[data-action="keyboard"]').click();
      await screen.locator('#typed-word').fill(level.focusWord);
      await screen.locator('#word-form .primary').click();
      await screen.locator('#toast.visible').waitFor({ state: 'hidden' });
      await screen.screenshot({ path: `${output}/captura-${position + 1}-1080x1920.jpg`, type: 'jpeg', quality: 96 });
      if (position === 2) {
        await screen.locator('#play-screen [data-action="verses"]').click();
        await screen.screenshot({ path: `${output}/captura-4-coleccion-1080x1920.jpg`, type: 'jpeg', quality: 96 });
      }
      await context.close();
    }
    console.log('Materiales de tienda preparados: ícono 512, gráfico 1024×500 y cuatro capturas 1080×1920.');
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
