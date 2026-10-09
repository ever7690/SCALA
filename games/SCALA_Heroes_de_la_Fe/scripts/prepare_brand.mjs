import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const selections = [
  { id: 'portada-clara', master: 'artwork/heroes-portada-clara-v2.png', production: 'public/backgrounds/heroes-portada-clara.webp', width: 1024, height: 1536 },
  { id: 'lectura-clara', master: 'artwork/heroes-lectura-clara-v2.png', production: 'public/backgrounds/heroes-lectura-clara.webp', width: 1024, height: 1536 },
  { id: 'heroes-icon', master: 'artwork/heroes-icon-final-v2.png', production: 'public/brand/heroes-icon.png', width: 512, height: 512 },
];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const assets = [];
  for (const item of selections) {
    const encoded = fs.readFileSync(item.master).toString('base64');
    const isIcon = item.id === 'heroes-icon';
    const result = await page.evaluate(async ({ encoded, isIcon, width, height }) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + encoded;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.fillStyle = isIcon ? '#ffffff' : '#fcfbf7';
      context.fillRect(0, 0, width, height);
      const padding = isIcon ? 16 : 0;
      context.drawImage(image, padding, padding, width - 2 * padding, height - 2 * padding);
      const mime = isIcon ? 'image/png' : 'image/webp';
      const data = canvas.toDataURL(mime, 0.95).split(',')[1];
      let round = null;
      if (isIcon) {
        const masked = document.createElement('canvas');
        masked.width = width; masked.height = height;
        const brush = masked.getContext('2d');
        brush.beginPath(); brush.arc(width / 2, height / 2, width / 2, 0, Math.PI * 2); brush.clip();
        brush.drawImage(canvas, 0, 0);
        round = masked.toDataURL('image/png').split(',')[1];
      }
      return { data, round, dimensions: [image.width, image.height] };
    }, { encoded, isIcon, width: item.width, height: item.height });
    fs.mkdirSync(item.production.substring(0, item.production.lastIndexOf('/')), { recursive: true });
    fs.writeFileSync(item.production, Buffer.from(result.data, 'base64'));
    if (isIcon) {
      const directory = 'android/app/src/main/res/mipmap-nodpi/';
      fs.mkdirSync(directory, { recursive: true });
      for (const name of ['ic_launcher.png', 'scala_launcher_art.png']) fs.writeFileSync(directory + name, Buffer.from(result.data, 'base64'));
      for (const name of ['ic_launcher_round.png', 'scala_launcher_round_art.png']) fs.writeFileSync(directory + name, Buffer.from(result.round, 'base64'));
    }
    assets.push({ id: item.id, master: item.master, dimensions: result.dimensions, masterSHA256: crypto.createHash('sha256').update(fs.readFileSync(item.master)).digest('hex'), production: item.production, productionSHA256: crypto.createHash('sha256').update(fs.readFileSync(item.production)).digest('hex'), bytes: fs.statSync(item.production).size });
  }
  const previous = JSON.parse(fs.readFileSync('docs/arte-verificado.json', 'utf8'));
  fs.writeFileSync('docs/arte-verificado.json', JSON.stringify({ assets: [...previous.assets.filter(item => !selections.some(selection => selection.id === item.id)), ...assets], originalMastersPreserved: true, palette: 'Blanco cálido, marfil, oliva y dorado', launcherText: 'Héroes de Fe', launcherLaurel: false }, null, 2) + '\n');
  console.log(JSON.stringify({ newAssets: assets.length, productionBytes: assets.reduce((total, item) => total + item.bytes, 0), mastersPreserved: true, iconText: 'Héroes de Fe', laurel: false }));
} finally { await browser.close(); }
