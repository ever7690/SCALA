import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const provenance = JSON.parse(fs.readFileSync('docs/iconos-profesionales.json', 'utf8'));
const glyphs = provenance.icons.map(item => {
  const svg = fs.readFileSync(item.path, 'utf8');
  assert.equal(crypto.createHash('sha256').update(svg).digest('hex'), item.sha256);
  assert.ok(svg.includes('viewBox="0 0 256 256"'));
  assert.ok(!/<script|<image|<use|\bon\w+=|https?:/i.test(svg.replace('http://www.w3.org/2000/svg', '')));
  return '  ' + JSON.stringify(item.key) + ': ' + JSON.stringify(svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')) + ',';
});
fs.writeFileSync('src/icons.ts', 'const glyphs: Record<string, string> = {\n' + glyphs.join('\n') + '\n};\nexport function icon(name: string, className = \u0027\u0027): string {\n  const key = name === \u0027sparkle\u0027 ? \u0027leaf\u0027 : Object.hasOwn(glyphs, name) ? name : \u0027book\u0027;\n  return \u0027<svg class="icon \u0027 + className + \u0027" data-icon="\u0027 + key + \u0027" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">\u0027 + glyphs[key] + \u0027</svg>\u0027;\n}\n');
console.log(JSON.stringify({ family: provenance.family, style: provenance.style, icons: glyphs.length, offline: true }));
