import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { lessons, characters, moods } from '../src/content.ts';
import { initialState, restoreState, completeLesson, recordPractice, nextLesson, pinFailure, resetProgress } from '../src/state.ts';
import { createPin, verifyPin, verifyRecovery } from '../src/pin.ts';
import { calmActivities, kindnessIdeas, scalaWebsite } from '../src/premium.ts';

const checks = [];
assert.equal(lessons.length, 30);
assert.equal(new Set(lessons.map(lesson => lesson.id)).size, 30);
assert.deepEqual(Object.keys(characters), ['escalito', 'lupi', 'ana', 'luz', 'mateo', 'roko']);
assert.equal(moods.length, 5);
for (const lesson of lessons) {
  assert.equal(lesson.challenges.length, 2);
  assert.ok(lesson.paragraphs.length >= 3);
  assert.ok(lesson.narration.length > 400 && lesson.narration.length < 1000);
  assert.ok(lesson.adult.length > 60 && lesson.bible.length > 40);
  for (const challenge of lesson.challenges) {
    assert.ok(challenge.choices.some(choice => choice.helpful));
    assert.ok(challenge.choices.some(choice => !choice.helpful));
    assert.ok(challenge.choices.every(choice => choice.feedback.length > 40));
  }
  assert.ok(fs.statSync(`public-runtime/audio/voz-${lesson.id}.mp3`).size > 100000);
}
assert.match(lessons[1].paragraphs.join(' '), /Si se siente segura/u);
assert.match(lessons[2].paragraphs.join(' '), /otro que lo cuide/u);
assert.match(lessons[4].paragraphs.join(' '), /no obliga/u);
checks.push('treinta historias, sesenta decisiones, referencias y acompañamiento adulto');
let state = initialState();
state = completeLesson(completeLesson(state, 'mi-voz'), 'mi-voz');
assert.deepEqual(state.completed, ['mi-voz']);
assert.equal(nextLesson(state), 'mi-limite');
assert.equal(completeLesson(state, 'inventada'), state);
state = recordPractice(state, 'mi-voz');
assert.equal(state.attempts['mi-voz'], 1);
state = { ...state, session: { lessonId: 'reparamos', step: 2 } };
assert.deepEqual(restoreState(JSON.parse(JSON.stringify(state))), state);
assert.deepEqual(resetProgress(state).completed, []);
assert.equal(resetProgress(state).session, null);
for (const raw of [null, 'string', [], { version: 99 }, { version: 1, completed: [false, {}, 'falsa'], settings: { music: NaN, sound: -2, voice: Infinity }, session: { lessonId: 'fake', step: 100 } }]) {
  const restored = restoreState(raw);
  assert.ok(restored.settings.music >= 0 && restored.settings.music <= 1);
  assert.ok(restored.settings.sound >= 0 && restored.settings.sound <= 1);
  assert.ok(restored.settings.voice >= 0 && restored.settings.voice <= 1);
  assert.equal(restored.session, null);
}
checks.push('progreso único, continuación y recuperación de estado dañado');
const pin = await createPin('2580');
assert.ok(await verifyPin('2580', pin.record));
assert.ok(!await verifyPin('9999', pin.record));
assert.ok(!await verifyPin('25', pin.record));
assert.ok(await verifyRecovery(pin.recovery.match(/.{4}/gu).join('-'), pin.record));
assert.ok(!await verifyRecovery('0000-0000-0000-0000', pin.record));
assert.ok(Object.values(pin.record).every(value => value !== '2580'));
assert.ok(!JSON.stringify(pin.record).includes(pin.recovery));
assert.notEqual((await createPin('2580')).record.hash, pin.record.hash);
state = { ...state, pin: pin.record };
assert.deepEqual(resetProgress(state).pin, pin.record);
const legacy = { ...state, settings: { music: .22, sound: .5, voice: .9, largeText: true, motion: false } };
delete legacy.kindness;
const upgraded = restoreState(legacy);
assert.deepEqual(upgraded.completed, state.completed);
assert.deepEqual(upgraded.pin, state.pin);
assert.deepEqual(upgraded.session, state.session);
assert.equal(upgraded.settings.largeText, true);
assert.equal(upgraded.settings.motion, false);
assert.equal(upgraded.settings.musicTheme, 'tierno');
assert.deepEqual(upgraded.kindness, []);
const gestures = restoreState({ ...state, kindness: [-1, 0, 0, 29, 30, null, '4', 2.5] });
assert.deepEqual(gestures.kindness, [0, 29]);
assert.deepEqual(resetProgress(gestures).kindness, []);
assert.equal(kindnessIdeas.length, 30);
assert.equal(new Set(kindnessIdeas).size, 30);
assert.ok(calmActivities.every(activity => activity.seconds === 40 && activity.phases.length === 4));
assert.equal(scalaWebsite, 'https://vitacala.online/');
checks.push('actualización de 1.0 conserva progreso, PIN y ajustes; gestos independientes');
for (let i = 0; i < 5; i++) state = pinFailure(state, 10000);
assert.equal(state.pinBlockedUntil, 40000);
assert.equal(restoreState(JSON.parse(JSON.stringify(state))).pinBlockedUntil, 40000);
checks.push('PIN con sal, recuperación, borrado separado y bloqueo de intentos');
const manifest = JSON.parse(fs.readFileSync('artwork/audio-manifest.json', 'utf8'));
assert.equal(manifest.files.length, 49);
assert.equal(manifest.files.filter(file => file.name.endsWith('.ogg')).length, 2);
assert.equal(manifest.files.filter(file => file.name.endsWith('.mp3')).length, 30);
assert.ok(Number(manifest.files.find(file => file.name.endsWith('.ogg')).format.duration) > 80);
for (const file of manifest.files) {
  const bytes = fs.readFileSync('public-runtime/audio/' + file.name);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
  if (file.name.endsWith('.wav')) {
    let peak = 0;
    for (let i = 44; i < bytes.length; i += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(i)) / 32768);
    assert.ok(peak > .02 && peak < .31);
    assert.ok(Number(file.format.duration) < 1);
  } else if (file.name.endsWith('.mp3')) {
    assert.ok(Number(file.format.duration) > 25);
    assert.ok(bytes.length > Number(file.format.duration) * 15000, 'Narración completa a 128 kbps');
  }
}
assert.equal(new Set(manifest.files.filter(file => file.name.endsWith('.wav')).map(file => file.sha256)).size, 17);
const logoSha = crypto.createHash('sha256').update(fs.readFileSync('public-runtime/brand/scala-original.png')).digest('hex');
assert.equal(logoSha, 'a6ada3a8a2afe73f0a38718fefd55b9734984800872049f5cd56f2259cec85e1');
const nativeManifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
assert.match(nativeManifest, /allowBackup="false"/u);
assert.match(nativeManifest, /android.permission.INTERNET" tools:node="remove"/u);
assert.ok(!nativeManifest.includes('android.permission.VIBRATE'));
assert.match(fs.readFileSync('android/app/build.gradle', 'utf8'), /com.scala.pequenosvalientes/u);
assert.match(fs.readFileSync('android/app/build.gradle', 'utf8'), /versionCode 3/u);
for (const name of ['heart', 'story', 'mischief', 'help', 'friends', 'home', 'gear', 'sun', 'play', 'check', 'back', 'lock', 'voice', 'gift', 'feel', 'care']) assert.ok(fs.statSync(`public-runtime/icons/toys/${name}.webp`).size > 5000);
for (const name of ['urban', 'forest', 'house']) assert.ok(fs.statSync(`public-runtime/backgrounds/${name}.webp`).size > 100000);
checks.push('17 sonidos suaves distintos, dos melodías, treinta voces, marca original y privacidad nativa');
console.log(JSON.stringify({ passed: true, lessons: 30, decisions: 60, characters: 6, sounds: 17, narrations: 30, logoOriginalSHA256: logoSha, checks }));
