import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const directory = 'artwork/premium-masters/stories-final';
for (const name of fs.readdirSync(directory)) {
  const match = name.match(/^(scene|icon|adventure)-(.+)\.png$/u);
  if (!match) continue;
  const [, kind, id] = match;
  const source = path.join(directory, name);
  const target = kind === 'scene' ? `public-runtime/stories/${id}.webp` : kind === 'icon' ? `public-runtime/icons/stories/${id}.webp` : 'public-runtime/icons/toys/adventure.webp';
  if (fs.existsSync(target)) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const filter = kind === 'scene' ? 'scale=1280:853' : 'scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=0x00000000';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-vf', filter, '-c:v', 'libwebp', ...(kind === 'scene' ? ['-quality', '90'] : ['-lossless', '1']), target]);
  console.log(JSON.stringify({ kind, id, target, sha256: crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') }));
}
