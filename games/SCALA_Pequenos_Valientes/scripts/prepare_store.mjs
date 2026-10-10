import fs from 'node:fs';
fs.mkdirSync('entregables/publicacion', { recursive: true });
for (const file of ['PRIVACIDAD.md', 'REVISION_ANTES_DE_VENDER.md', 'RECURSOS_Y_DERECHOS.md', 'FICHA_TIENDA.md']) fs.copyFileSync('docs/' + file, 'entregables/publicacion/' + file);
fs.copyFileSync('public-runtime/icons/launcher-512.png', 'entregables/publicacion/icono-tienda-512.png');
fs.copyFileSync('artwork/audio-manifest.json', 'entregables/publicacion/RECURSOS_AUDIO.json');
fs.copyFileSync('artwork/PRODUCCION_VISUAL_V2.json', 'entregables/publicacion/PRODUCCION_VISUAL.json');
fs.cpSync('public-runtime/licenses', 'entregables/publicacion/licencias', { recursive: true });
fs.copyFileSync('README.md', 'entregables/publicacion/COMPILAR_Y_FIRMAR.md');
console.log('Materiales de publicación preparados con contacto y revisión pendientes indicados.');
