import fs from 'node:fs';
import crypto from 'node:crypto';
const checks = JSON.parse(fs.readFileSync('entregables/VERIFICACION_INTERFAZ.json', 'utf8'));
if (!checks.passed) throw new Error('La interfaz no superó la verificación.');
const logoSHA256 = crypto.createHash('sha256').update(fs.readFileSync('public-runtime/brand/scala-original.png')).digest('hex');
fs.writeFileSync('entregables/ESTADO_ENTREGA.json', JSON.stringify({ app: 'SCALA Pequeños Valientes', version: '1.1.0', package: 'com.scala.pequenosvalientes', lessons: 30, decisions: 60, characters: ['Escalito', 'Lupi', 'Ana', 'Luz', 'Mateo', 'Roko'], narration: 'Treinta historias en español; seis voces originales y 24 nuevas', soundEffects: 17, musicThemes: 2, kindnessIdeas: 30, calmActivities: 3, adultCatalog: 'https://vitacala.online/', offline: true, logoSHA256, interfaceChecks: checks.passed, pending: ['Prueba en Android real con el propietario', 'Revisión profesional de contenido infantil', 'Prueba supervisada con familias', 'Verificación de derechos comerciales aplicables', 'Identidad, soporte y URL pública de privacidad', 'Configuración y aprobación de la tienda'] }, null, 2) + '\n');
console.log('Estado de entrega escrito sin declarar revisiones aún no realizadas.');
