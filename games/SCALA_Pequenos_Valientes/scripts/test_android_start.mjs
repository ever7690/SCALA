import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

fs.mkdirSync('entregables/android', { recursive: true });
const adb = (...args) => execFileSync('adb', args, { timeout: 20000, encoding: 'utf8' });
const wait = () => new Promise(resolve => setTimeout(resolve, 1000));
const packageName = 'com.scala.pequenosvalientes.debug';
adb('logcat', '-c');
console.log(adb('install', '-r', 'android/app/build/outputs/apk/debug/app-debug.apk').trim());
const info = adb('shell', 'dumpsys', 'package', packageName);
assert.match(info, /versionCode=2\b/u);
console.log(adb('shell', 'am', 'start', '-W', '-n', packageName + '/com.scala.pequenosvalientes.MainActivity').trim());
let buttonBounds;
for (let attempt = 0; attempt < 20; attempt++) {
  await wait();
  adb('shell', 'uiautomator', 'dump', '/sdcard/scala-window.xml');
  const xml = adb('shell', 'cat', '/sdcard/scala-window.xml');
  const node = xml.match(/<node[^>]+text="Entrar a mi aventura"[^>]+>/u)?.[0];
  const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/u);
  if (bounds) { buttonBounds = bounds.slice(1).map(Number); fs.writeFileSync('entregables/android/bienvenida.xml', xml); break; }
}
assert.ok(buttonBounds, 'La bienvenida debe estar lista y mostrar el botón de entrada.');
fs.writeFileSync('entregables/android/01-bienvenida.png', execFileSync('adb', ['exec-out', 'screencap', '-p'], { timeout: 15000 }));
adb('shell', 'input', 'tap', String(Math.floor((buttonBounds[0] + buttonBounds[2]) / 2)), String(Math.floor((buttonBounds[1] + buttonBounds[3]) / 2)));
let homeVisible = false;
for (let attempt = 0; attempt < 10; attempt++) {
  await wait();
  adb('shell', 'uiautomator', 'dump', '/sdcard/scala-window.xml');
  const xml = adb('shell', 'cat', '/sdcard/scala-window.xml');
  if (xml.includes('pequeño valiente')) { homeVisible = true; fs.writeFileSync('entregables/android/inicio.xml', xml); break; }
}
assert.ok(homeVisible, 'La entrada debe abrir el inicio infantil.');
fs.writeFileSync('entregables/android/02-inicio.png', execFileSync('adb', ['exec-out', 'screencap', '-p'], { timeout: 15000 }));
assert.ok(adb('shell', 'pidof', packageName).trim());
const logs = adb('logcat', '-d', '-v', 'brief');
fs.writeFileSync('entregables/android/logcat.txt', logs);
assert.ok(!logs.includes('FATAL EXCEPTION'), 'No debe haber un fallo nativo al instalar o entrar.');
fs.writeFileSync('entregables/VERIFICACION_ANDROID.json', JSON.stringify({ passed: true, api: 30, package: packageName, versionCode: 2, checks: ['APK instalado', 'bienvenida cargada', 'inicio infantil tras entrar', 'proceso vivo sin excepción fatal'] }, null, 2) + '\n');
adb('shell', 'am', 'force-stop', packageName);
console.log('Instalación y arranque en Android 11 comprobados.');
