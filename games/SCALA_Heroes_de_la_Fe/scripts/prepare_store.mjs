import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const output = 'entregables/tienda';
fs.mkdirSync(output, { recursive: true });
const { base, close } = await serve();
const png = file => 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
const webp = file => 'data:image/webp;base64,' + fs.readFileSync(file).toString('base64');
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 360 }, reducedMotion: 'reduce' });
  const mark = png('public/brand/heroes-icon.png');
  fs.copyFileSync('public/brand/heroes-icon.png', output + '/icono-512.png');
  await page.setContent('<html><head><style>body{margin:0;background:#f3efdf;color:#18384a;font:14px system-ui}.row{display:flex;gap:57px;justify-content:center;align-items:center;height:270px}.sample{text-align:center}.mask{width:144px;height:144px;overflow:hidden;background:#081829}.mask img{width:100%;height:100%}.circle{border-radius:50%}.squircle{border-radius:27%}.sample p{font-weight:650;margin-top:17px}.note{text-align:center;color:#63747c;font-size:12px}</style></head><body><div class="row"><div class="sample"><div class="mask circle"><img src="' + mark + '"></div><p>Héroes de Fe</p></div><div class="sample"><div class="mask squircle"><img src="' + mark + '"></div><p>Héroes de Fe</p></div><div class="sample"><div class="mask"><img src="' + mark + '"></div><p>Héroes de Fe</p></div></div><p class="note">Héroes de Fe · máscaras habituales de Android · fondo completo y sin margen exterior</p></body></html>');
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.screenshot({ path: 'entregables/preview-iconos.png' });
  await page.goto(base);
  await page.setViewportSize({ width: 1024, height: 500 });
  await page.setContent('<html><head><style>@font-face{font-family:Manrope;src:url("' + base + '/fonts/manrope-variable.woff2")}@font-face{font-family:Lora;src:url("' + base + '/fonts/lora-variable.woff2")}*{box-sizing:border-box}body{margin:0;width:1024px;height:500px;background:#081829;color:#f8f0df;font-family:Manrope;position:relative;overflow:hidden}.art{position:absolute;right:0;top:0;width:540px;height:500px;object-fit:cover;object-position:center 10%;opacity:.93}.fade{position:absolute;inset:0;background:linear-gradient(90deg,#081829 40%,#081829c0 51%,#08182900 72%),linear-gradient(0deg,#08182990,transparent 50%)}.copy{position:absolute;left:67px;top:68px;width:475px}.label{font-size:12px;letter-spacing:4px;color:#efc66e;font-weight:800}h1{font:500 61px/1.22 Lora;margin:24px 0 21px;letter-spacing:-1.8px}h1 em{font-weight:400;color:#efc66e}p{font-size:18px;line-height:1.6;color:#c7d4dc;margin:0}.details{margin-top:27px;display:flex;gap:17px;font-size:12px;color:#ecd6a5}.details span{border:1px solid #e8c77850;border-radius:20px;padding:8px 12px}</style></head><body><img class="art" src="' + webp('public/heroes/noe.webp') + '"><div class="fade"></div><div class="copy"><div class="label">SCALA</div><h1>Héroes<br><em>de la Fe</em></h1><p>Cada historia abre un camino.<br>Descubre. Aprende. Comparte.</p><div class="details"><span>12 personajes</span><span>240 preguntas</span><span>Sin conexión</span></div></div></body></html>');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.art').evaluate(image => image.decode());
  await page.screenshot({ path: output + '/grafico-1024x500.jpg', type: 'jpeg', quality: 96 });
  await page.close();
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, reducedMotion: 'reduce' });
  const screen = await context.newPage();
  await screen.goto(base);
  await screen.locator('.featured .portrait').evaluate(image => image.decode());
  await screen.evaluate(() => document.fonts.ready);
  await screen.screenshot({ path: output + '/captura-1-inicio-1080x1920.jpg', type: 'jpeg', quality: 96 });
  await screen.locator('[data-action="nav"][data-view="settings"]').click();
  await screen.locator('[data-setting="music"]').uncheck();
  await screen.locator('[data-setting="sound"]').uncheck();
  await screen.locator('[data-action="nav"][data-view="home"]').click();
  await screen.locator('[data-action="start"]').click();
  await screen.locator('.question-panel').waitFor();
  await screen.screenshot({ path: output + '/captura-2-pregunta-1080x1920.jpg', type: 'jpeg', quality: 96 });
  await screen.locator('[data-option="0"]').click();
  await screen.locator('[data-action="next"]').waitFor();
  await screen.screenshot({ path: output + '/captura-3-respuesta-1080x1920.jpg', type: 'jpeg', quality: 96 });
  await screen.locator('[data-action="next"]').click();
  for (let index = 1; index < 12; index++) {
    await screen.locator('[data-option="0"]').click();
    await screen.locator('[data-action="next"]').click();
  }
  await screen.locator('.result-heading').waitFor();
  await screen.locator('[data-action="nav"][data-view="journey"]').first().click();
  await screen.locator('.hero-grid img').evaluateAll(images => Promise.all(images.slice(0, 4).map(image => image.decode())));
  await screen.screenshot({ path: output + '/captura-4-camino-1080x1920.jpg', type: 'jpeg', quality: 96 });
  await context.close();
  fs.copyFileSync('docs/DESCRIPCION_TIENDA.txt', output + '/DESCRIPCION.txt');
  fs.copyFileSync('docs/PRIVACIDAD.md', output + '/PRIVACIDAD.md');
  console.log(JSON.stringify({ icon: '512×512', graphic: '1024×500', realScreenshots: 4, screenshotDimensions: '1080×1920' }));
} finally { await browser?.close(); await close(); }
