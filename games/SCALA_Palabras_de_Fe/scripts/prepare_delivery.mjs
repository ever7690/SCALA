import fs from 'node:fs';

fs.mkdirSync('entregables/documentacion', { recursive: true });
for (const [source, target] of [
  ['docs/PUBLICAR_Y_VENDER.md', 'entregables/LEEME_VENTA.md'],
  ['docs/FASE_FINAL_VENTA.md', 'entregables/FASE_FINAL_VENTA.md'],
  ['docs/textos-tienda.json', 'entregables/textos-tienda.json'],
  ['public/privacidad.html', 'entregables/privacidad.html'],
  ['NOTICE.md', 'entregables/documentacion/PROCEDENCIA_Y_LICENCIAS.md'],
  ['docs/DISENO_ICONO.md', 'entregables/documentacion/DISENO_ICONO.md'],
  ['docs/prompt-icono.txt', 'entregables/documentacion/prompt-icono-anterior.txt'],
  ['docs/prompt-icono-v2.txt', 'entregables/documentacion/prompt-icono-v2.txt'],
  ['docs/fondos-scala.json', 'entregables/documentacion/fondos-scala.json'],
  ['docs/sonidos-interfaz.json', 'entregables/documentacion/sonidos-interfaz.json'],
  ['LICENSE', 'entregables/documentacion/LICENSE'],
]) fs.copyFileSync(source, target);
fs.cpSync('licenses', 'entregables/documentacion/licenses', { recursive: true });
console.log('Documentación comercial y licencias preparadas.');
