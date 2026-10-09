import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

fs.mkdirSync('entregables/documentacion', { recursive: true });
for (const name of ['README.md', 'NOTICE.md', 'LICENSE']) fs.copyFileSync(name, 'entregables/documentacion/' + name);
for (const file of fs.readdirSync('docs')) fs.copyFileSync('docs/' + file, 'entregables/documentacion/' + file);
const report = { name: 'SCALA Héroes de la Fe', version: JSON.parse(fs.readFileSync('package.json')).version, applicationId: 'com.scala.heroesdefe', questions: 240, heroes: 12, compilerCommit: process.env.GITHUB_SHA ?? null, engine: JSON.parse(fs.readFileSync('entregables/pruebas-motor.json')), interface: JSON.parse(fs.readFileSync('entregables/pruebas-interfaz.json')), vulnerabilities: JSON.parse(fs.readFileSync('entregables/auditoria-npm.json')).metadata.vulnerabilities, assets: JSON.parse(fs.readFileSync('docs/arte-verificado.json')), deviceTest: 'Pendiente en teléfono físico' };
fs.writeFileSync('entregables/VERIFICACION.json', JSON.stringify(report, null, 2) + '\n');
const binaries = fs.readdirSync('entregables').filter(file => /\.(apk|aab)$/.test(file));
fs.writeFileSync('entregables/SHA256SUMS.txt', binaries.map(file => crypto.createHash('sha256').update(fs.readFileSync(path.join('entregables', file))).digest('hex') + '  ' + file).join('\n') + '\n');
console.log(JSON.stringify({ version: report.version, questions: report.questions, heroes: report.heroes, tests: report.engine.passed && report.interface.passed, vulnerabilityCount: report.vulnerabilities.total, binaries: binaries.length }));
