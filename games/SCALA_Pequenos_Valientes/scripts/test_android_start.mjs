import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

fs.mkdirSync('entregables/android', { recursive: true });
const adb = (...args) => execFileSync('adb', args, { timeout: 20000, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const wait = () => new Promise(resolve => setTimeout(resolve, 1000));
const packageName = 'com.scala.pequenosvalientes.debug';
const port = 9343;
let socket;
let commandId = 0;
const pending = new Map();
const exceptions = [];
function command(method, params = {}) {
  const id = ++commandId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('DevTools no respondió: ' + method)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
function capture(name) {
  const bytes = execFileSync('adb', ['exec-out', 'screencap', '-p'], { timeout: 20000, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync('entregables/android/' + name + '.png', bytes);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
try {
  adb('logcat', '-c');
  console.log(adb('install', '-r', 'android/app/build/outputs/apk/debug/app-debug.apk').trim());
  assert.match(adb('shell', 'dumpsys', 'package', packageName), /versionCode=2\b/u);
  console.log(adb('shell', 'am', 'start', '-W', '-n', packageName + '/com.scala.pequenosvalientes.MainActivity').trim());
  const pid = adb('shell', 'pidof', packageName).trim().split(/\s+/u)[0];
  assert.ok(pid);
  adb('forward', 'tcp:' + port, 'localabstract:webview_devtools_remote_' + pid);
  let target;
  for (let attempt = 0; attempt < 30; attempt++) {
    await wait();
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list', { signal: AbortSignal.timeout(3000) });
      const pages = await response.json();
      target = pages.find(page => page.type === 'page' && page.webSocketDebuggerUrl);
      if (target) break;
    } catch { target = null; }
  }
  assert.ok(target, 'El WebView de la aplicación debe estar disponible.');
  socket = new WebSocket(target.webSocketDebuggerUrl.replace('localhost', '127.0.0.1'));
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('No se abrió la vista Android.')), 10000);
    socket.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Error al conectar con la vista Android.')); }, { once: true });
  });
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    if (response.method === 'Runtime.exceptionThrown') exceptions.push(response.params.exceptionDetails);
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id); clearTimeout(request.timeout);
    if (response.error) request.reject(new Error(JSON.stringify(response.error)));
    else request.resolve(response.result);
  });
  await command('Runtime.enable');
  let ready = false;
  for (let attempt = 0; attempt < 35; attempt++) {
    ready = await evaluate("Boolean(document.querySelector('#enter-world') && !document.querySelector('#enter-world').disabled)");
    if (ready) break;
    await wait();
  }
  assert.ok(ready, 'La bienvenida debe mostrar una entrada preparada.');
  assert.equal(await evaluate('window.Capacitor.isNativePlatform()'), true);
  const before = await evaluate('document.body.innerText');
  assert.ok(before.includes('Scala desarrollo cristiano'));
  fs.writeFileSync('entregables/android/bienvenida.txt', before);
  assert.equal(await evaluate("document.querySelector('#launch-brand').hidden"), false);
  const welcomeImage = capture('01-bienvenida');
  const point = await evaluate("(() => { const r = document.querySelector('#enter-world').getBoundingClientRect(); return { x: r.left+r.width/2, y: r.top+r.height/2, scale: window.devicePixelRatio }; })()");
  const windows = adb('shell', 'dumpsys', 'window', 'windows');
  fs.writeFileSync('entregables/android/ventanas.txt', windows);
  const section = windows.split(/(?=Window #\d+ Window\{)/u).find(part => part.trimStart().startsWith('Window #') && part.includes(packageName + '/com.scala.pequenosvalientes.MainActivity'));
  const content = section?.match(/content=\[(\d+),(\d+)\]/u);
  const offsetX = content ? Number(content[1]) : 0;
  const offsetY = content ? Number(content[2]) : 24 * point.scale;
  adb('shell', 'input', 'tap', String(Math.round(point.x * point.scale + offsetX)), String(Math.round(point.y * point.scale + offsetY)));
  let homeVisible = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    homeVisible = await evaluate("Boolean(document.querySelector('#launch-brand').hidden && !document.querySelector('#app').hidden && document.querySelector('#page-title')?.textContent.includes('pequeño valiente'))");
    if (homeVisible) break;
    await wait();
  }
  assert.ok(homeVisible, 'La entrada debe abrir el inicio infantil.');
  await evaluate("Promise.all(Array.from(document.images).map(image => image.decode().catch(() => undefined)))");
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await wait();
  fs.writeFileSync('entregables/android/inicio.txt', await evaluate('document.body.innerText'));
  assert.notEqual(capture('02-inicio'), welcomeImage, 'La pantalla debe cambiar después de pulsar la entrada.');
  assert.deepEqual(exceptions, []);
  const logs = adb('logcat', '-d', '-v', 'brief');
  assert.ok(!logs.includes('Process: ' + packageName + ', PID:'), 'La aplicación no debe sufrir una excepción nativa.');
  fs.writeFileSync('entregables/VERIFICACION_ANDROID.json', JSON.stringify({ passed: true, api: 30, package: packageName, versionCode: 2, userAgent: await evaluate('navigator.userAgent'), checks: ['APK instalado', 'bienvenida cargada en WebView nativo', 'marca y pie de página presentes', 'inicio infantil tras pulsar entrada', 'sin excepciones JavaScript ni fallo nativo'] }, null, 2) + '\n');
  console.log('Instalación y entrada en Android 11 comprobadas.');
} finally {
  try { capture('estado-final'); fs.writeFileSync('entregables/android/logcat.txt', adb('logcat', '-d', '-v', 'brief')); } catch (error) { console.log('Diagnóstico incompleto:', error.message); }
  for (const request of pending.values()) clearTimeout(request.timeout);
  socket?.close();
  try { adb('forward', '--remove', 'tcp:' + port); adb('shell', 'am', 'force-stop', packageName); } catch (error) { console.log('Limpieza Android:', error.message); }
}
