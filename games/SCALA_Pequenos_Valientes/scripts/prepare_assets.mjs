import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { timeout: 60000 });
for (const id of ['escalito', 'lupi', 'ana', 'luz', 'mateo', 'roko']) ffmpeg(['-i', `public/art/characters/${id}-guia-v1.png`, '-vf', 'scale=512:-1:flags=lanczos', '-c:v', 'libwebp', '-quality', '88', `public-runtime/characters/${id}.webp`]);
for (const [source, id] of [['jardin', 'garden'], ['escuela', 'school']]) ffmpeg(['-i', `artwork/${source}-v1.png`, '-vf', 'scale=1152:-1:flags=lanczos', '-c:v', 'libwebp', '-quality', '88', `public-runtime/backgrounds/${id}.webp`]);
for (const [size, destination] of [[512, 'public-runtime/icons/launcher-512.png'], [192, 'public-runtime/icons/launcher-192.png'], [512, 'android/app/src/main/res/mipmap-nodpi/scala_launcher_art.png'], [512, 'android/app/src/main/res/mipmap-nodpi/scala_launcher_round_art.png'], [192, 'android/app/src/main/res/mipmap-nodpi/ic_launcher.png'], [192, 'android/app/src/main/res/mipmap-nodpi/ic_launcher_round.png']]) ffmpeg(['-i', 'artwork/icono-v1.png', '-vf', `scale=${size}:${size}:flags=lanczos`, destination]);
const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', 'artwork/audio/master-music.audio'], { encoding: 'utf8' }));
ffmpeg(['-i', 'artwork/audio/master-music.audio', '-af', 'atrim=start=3,asetpts=PTS-STARTPTS', 'artwork/audio/music-body.wav']);
ffmpeg(['-i', 'artwork/audio/master-music.audio', '-t', '3', 'artwork/audio/music-head.wav']);
ffmpeg(['-i', 'artwork/audio/music-body.wav', '-i', 'artwork/audio/music-head.wav', '-filter_complex', '[0:a][1:a]acrossfade=d=1.5:c1=tri:c2=tri,loudnorm=I=-22:TP=-2:LRA=7[out]', '-map', '[out]', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '5', 'public-runtime/audio/valientes-mundo-amable.ogg']);
for (const id of ['mi-voz', 'mi-limite', 'pido-ayuda', 'acompanamos', 'reparamos', 'mi-valor']) ffmpeg(['-i', `artwork/audio/master-${id}.audio`, '-af', 'loudnorm=I=-18:TP=-2:LRA=6,afade=t=in:d=0.035', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', `public-runtime/audio/voz-${id}.mp3`]);
const melodies = { home: [523.25, 659.25, 783.99], feel: [659.25, 783.99], story: [587.33, 739.99], help: [440, 523.25, 659.25], path: [523.25, 587.33, 659.25], family: [493.88, 622.25], settings: [392, 523.25], back: [659.25, 523.25], select: [783.99], practice: [587.33, 783.99], complete: [523.25, 659.25, 783.99, 1046.5], voice: [523.25, 622.25], lock: [440, 659.25], toggle: [698.46] };
for (const [cue, notes] of Object.entries(melodies)) {
  const rate = 44100;
  const spacing = cue === 'complete' ? .115 : .09;
  const noteLength = .42;
  const samples = Math.ceil((noteLength + spacing * (notes.length - 1)) * rate);
  const pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    let value = 0;
    notes.forEach((frequency, index) => {
      const t = i / rate - spacing * index;
      if (t < 0 || t > noteLength) return;
      const envelope = Math.min(1, t / .013) * Math.exp(-t * 11) * Math.min(1, (noteLength - t) / .055);
      value += .10 * envelope * (Math.sin(2 * Math.PI * frequency * t) + .10 * Math.sin(2 * Math.PI * frequency * 2 * t) + .025 * Math.sin(2 * Math.PI * frequency * 3 * t));
    });
    pcm.writeInt16LE(Math.round(Math.max(-.30, Math.min(.30, value)) * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8); header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(`public-runtime/audio/valientes-${cue}.wav`, Buffer.concat([header, pcm]));
}
const files = fs.readdirSync('public-runtime/audio').map(name => {
  const full = path.join('public-runtime/audio', name);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', full], { encoding: 'utf8' }));
  return { name, bytes: fs.statSync(full).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'), ...probe };
});
fs.writeFileSync('artwork/audio-manifest.json', JSON.stringify({ creditsUsed: 109, provider: 'vidIQ', voice: 'Sarah, stock voice', musicTargetLufs: -22, narrationTargetLufs: -18, files }, null, 2) + '\n');
console.log(JSON.stringify({ characters: 6, backgrounds: 2, launcherSizes: [512, 192], narrations: 6, gentleCues: 14, musicSeconds: duration - 1.5 }));
