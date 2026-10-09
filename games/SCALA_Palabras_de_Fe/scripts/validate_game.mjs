import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

fs.mkdirSync('.tests', { recursive: true });
fs.writeFileSync('.tests/package.json', '{"type":"module"}');
for (const name of ['types', 'game-engine']) {
  const source = fs.readFileSync(`src/${name}.ts`, 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  fs.writeFileSync(`.tests/${name}.js`, result.outputText);
}
const engine = await import(pathToFileURL(path.resolve('.tests/game-engine.js')));
const { levels, chapters } = JSON.parse(fs.readFileSync('src/data/bible-levels.json', 'utf8'));
assert.equal(levels.length, 1000);
assert.equal(chapters.length, 10);
const signatures = new Set();
const ids = new Set();
let words = 0;
let bonuses = 0;
for (const [index, level] of levels.entries()) {
  assert.equal(level.number, index + 1);
  assert.equal(level.id, String(index + 1));
  assert(!ids.has(level.id));
  ids.add(level.id);
  assert(level.answers.length >= 3);
  assert(level.answers.some(answer => answer.text === level.focusWord));
  assert(level.letterWheel.length <= 8);
  const signature = level.answers.map(answer => answer.text).sort().join('|');
  assert(!signatures.has(signature), `Nivel repetido ${level.id}`);
  signatures.add(signature);
  const occupied = new Map();
  for (const answer of level.answers) {
    assert(engine.canSpellWithTokens(answer.text, level.letterWheel), `No se puede formar ${answer.text}`);
    assert.equal(answer.path.length, answer.text.length);
    assert(answer.text.length >= 3);
    const [dr, dc] = [answer.path[1][0] - answer.path[0][0], answer.path[1][1] - answer.path[0][1]];
    assert((dr === 0 && dc === 1) || (dr === 1 && dc === 0));
    for (const [position, [row, col]] of answer.path.entries()) {
      assert(row >= 0 && row < level.rows && col >= 0 && col < level.cols);
      assert.equal(row, answer.path[0][0] + dr * position);
      assert.equal(col, answer.path[0][1] + dc * position);
      const key = `${row}:${col}`;
      if (occupied.has(key)) assert.equal(occupied.get(key), answer.text[position], `Cruce inválido nivel ${level.id}`);
      occupied.set(key, answer.text[position]);
    }
  }
  const visited = new Set();
  const pending = [occupied.keys().next().value];
  while (pending.length) {
    const key = pending.pop();
    if (visited.has(key)) continue;
    visited.add(key);
    const [row, col] = key.split(':').map(Number);
    for (const next of [`${row + 1}:${col}`, `${row - 1}:${col}`, `${row}:${col + 1}`, `${row}:${col - 1}`]) if (occupied.has(next) && !visited.has(next)) pending.push(next);
  }
  assert.equal(visited.size, occupied.size, `Crucigrama desconectado ${level.id}`);
  const session = new engine.GameSession(level);
  for (const answer of level.answers) session.submitWord(answer.text);
  assert(session.isLevelComplete(), `Nivel no se completa ${level.id}`);
  for (const word of level.bonusWords) {
    assert(engine.canSpellWithTokens(word, level.letterWheel));
    assert(!level.answers.some(answer => answer.text === word));
  }
  words += level.answers.length;
  bonuses += level.bonusWords.length;
}
const first = levels.filter(level => level.groupId === chapters[0].id);
const manager = new engine.GameStateManager(chapters, chapters[0].id, first);
for (const chapter of chapters) manager.setGroupLevels(chapter.id, levels.filter(level => level.groupId === chapter.id));
manager.submitWord(levels[0].answers[0].text);
const before = manager.serialize();
const hydrated = engine.GameStateManager.hydrate(chapters, chapters[0].id, first, JSON.parse(JSON.stringify(before)));
assert.deepEqual(hydrated.getSolvedWords(), manager.getSolvedWords());
assert.equal(hydrated.getCurrentLevel().id, manager.getCurrentLevel().id);
for (const level of levels) {
  manager.jumpToLevel(level.groupId, level.indexInGroup);
  for (const answer of level.answers) manager.submitWord(answer.text);
  assert(manager.isCurrentLevelComplete());
}
manager.jumpToLevel(chapters[0].id, 99);
assert.equal(manager.advanceToNextLevel().advanced, true);
assert.equal(manager.getCurrentLevel().id, '101');
const final = manager.serialize();
assert.equal(Object.values(final.levels).filter(level => level.completed).length, 1000);
const restored = engine.GameStateManager.hydrate(chapters, chapters[1].id, levels.filter(level => level.groupId === chapters[1].id), final);
assert.equal(restored.getCurrentLevel().id, '101');
assert(restored.isCurrentLevelComplete());
const logo = crypto.createHash('sha256').update(fs.readFileSync('public/brand/scala-original.png')).digest('hex');
assert.equal(logo, 'a6ada3a8a2afe73f0a38718fefd55b9734984800872049f5cd56f2259cec85e1');
const report = { passed: true, levels: levels.length, chapters: chapters.length, crosswordWords: words, bonusWords: bonuses, logoOriginalSHA256: logo, checks: ['soluciones', 'cruces', 'conectividad', 'niveles únicos', 'restauración', 'transición de capítulos', 'logo sin cambios'] };
fs.mkdirSync('entregables', { recursive: true });
fs.writeFileSync('entregables/validacion-niveles.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
