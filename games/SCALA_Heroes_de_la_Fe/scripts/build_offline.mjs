import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(name) : [name];
  });
}

const files = walk('dist').filter(file => !file.endsWith('sw.js'));
const hash = crypto.createHash('sha256');
for (const file of files) hash.update(fs.readFileSync(file));
const cacheName = `scala-heroes-${hash.digest('hex').slice(0, 12)}`;
const urls = files.map(file => `/${path.relative('dist', file).replaceAll(path.sep, '/')}`);
urls.push('/');
fs.writeFileSync('dist/sw.js', `const CACHE = ${JSON.stringify(cacheName)};\nconst FILES = ${JSON.stringify(urls)};\nself.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));\nself.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('scala-heroes-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));\nself.addEventListener('fetch', event => { if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });\n`);
console.log(`Contenido sin conexión: ${urls.length} archivos, caché ${cacheName}`);
