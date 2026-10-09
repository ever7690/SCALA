import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

fs.mkdirSync('public/heroes', { recursive: true });
fs.mkdirSync('entregables', { recursive: true });
const roster = JSON.parse(fs.readFileSync('src/data/heroes.json', 'utf8'));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const assets = [];
  for (const id of [...roster.map(hero => hero.id), 'heroes-icon']) {
    const master = 'artwork/' + id + '-v1.png';
    const isIcon = id === 'heroes-icon';
    const encoded = fs.readFileSync(master).toString('base64');
    const output = await page.evaluate(async ({ encoded, isIcon }) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + encoded;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = isIcon ? 512 : 768;
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL(isIcon ? 'image/png' : 'image/webp', 0.94).split(',')[1];
      if (isIcon) {
        context.clearRect(0, 0, 512, 512);
        context.save();
        context.beginPath();
        context.arc(256, 256, 256, 0, 2 * Math.PI);
        context.clip();
        context.drawImage(image, 0, 0, 512, 512);
        context.restore();
      }
      return { data, round: isIcon ? canvas.toDataURL('image/png').split(',')[1] : null, width: image.width, height: image.height };
    }, { encoded, isIcon });
    const destination = isIcon ? 'public/brand/heroes-icon.png' : 'public/heroes/' + id + '.webp';
    fs.writeFileSync(destination, Buffer.from(output.data, 'base64'));
    if (isIcon) {
      const resources = 'android/app/src/main/res/mipmap-nodpi/';
      for (const name of ['ic_launcher.png', 'scala_launcher_art.png']) fs.writeFileSync(resources + name, Buffer.from(output.data, 'base64'));
      for (const name of ['ic_launcher_round.png', 'scala_launcher_round_art.png']) fs.writeFileSync(resources + name, Buffer.from(output.round, 'base64'));
    }
    assets.push({ id, master, dimensions: [output.width, output.height], masterSHA256: crypto.createHash('sha256').update(fs.readFileSync(master)).digest('hex'), production: destination, productionSHA256: crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex'), bytes: fs.statSync(destination).size });
  }
  fs.writeFileSync('docs/arte-verificado.json', JSON.stringify({ assets, originalMastersPreserved: true }, null, 2) + '\n');
  console.log(JSON.stringify({ portraits: roster.length, productionBytes: assets.reduce((total, item) => total + item.bytes, 0), mastersPreserved: true }));
} finally { await browser.close(); }
