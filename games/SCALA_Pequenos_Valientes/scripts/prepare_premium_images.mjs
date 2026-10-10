import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error('Indica la carpeta que contiene los originales aprobados.');
const original = { urban: 'exec-b5121a81-e21e-4f9c-846d-6e80150f788f.png', forest: 'exec-6563a52e-bd2a-4206-9b49-5e4089762e02.png', house: 'exec-d596bda2-0f91-41a4-82c6-6098a93fc09a.png', icons: 'exec-04147448-f5d9-4760-a1e7-0ed4bd9b0d60.png' };
fs.mkdirSync('artwork/premium-masters', { recursive: true });
fs.mkdirSync('public-runtime/icons/toys', { recursive: true });
const hashes = {};
for (const [id, filename] of Object.entries(original)) {
  const input = path.join(sourceRoot, filename);
  const master = `artwork/premium-masters/${id}.png`;
  fs.copyFileSync(input, master);
  hashes[id] = crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
  if (id !== 'icons') execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', master, '-vf', id === 'house' ? 'scale=1440:-1' : 'scale=1080:-1', '-c:v', 'libwebp', '-quality', '91', `public-runtime/backgrounds/${id}.webp`]);
}
const crops = {
  heart: [0, 0, 331, 320], story: [331, 0, 352, 320], mischief: [685, 0, 291, 320], help: [984, 0, 312, 324],
  friends: [0, 322, 347, 309], home: [349, 323, 331, 310], gear: [687, 326, 295, 307], sun: [987, 326, 308, 303],
  play: [21, 630, 307, 278], check: [349, 635, 316, 274], back: [676, 647, 309, 265], lock: [989, 634, 307, 278],
  voice: [0, 915, 354, 299], gift: [356, 910, 312, 304], feel: [679, 920, 307, 294], care: [987, 915, 309, 299],
};
for (const [id, [x, y, w, h]] of Object.entries(crops)) {
  const filter = `crop=${w}:${h}:${x}:${y},scale=192:192:force_original_aspect_ratio=decrease,pad=192:192:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'artwork/premium-masters/icons.png', '-vf', filter, '-c:v', 'libwebp', '-lossless', '1', 'public-runtime/icons/toys/' + id + '.webp']);
}
fs.writeFileSync('artwork/premium-image-exports.json', JSON.stringify({ generator: 'OpenAI image_gen', originalSHA256: hashes, crops, outputIcons: Object.keys(crops), originalBrandModified: false }, null, 2) + '\n');
console.log('Tres paisajes y dieciséis iconos exportados con transparencia.');
