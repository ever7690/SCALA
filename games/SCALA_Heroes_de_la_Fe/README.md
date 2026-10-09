# SCALA Héroes de la Fe

Juego original de trivia bíblica en español para Android. Identidad SCALA blanca, marfil, oliva y dorada, 12 personajes ilustrados, 240 preguntas propias cotejadas con pasajes de la Biblia Reina-Valera 1909 y notas cálidas y suaves. No necesita conexión, cuentas, anuncios ni compras de monedas.

## Qué puedes jugar

- **Mi camino:** rondas de 12 preguntas, experiencia, monedas, rachas, estrellas y personajes que se desbloquean con tu avance.
- **Práctica libre:** aprende sin reloj; las ayudas no gastan monedas ni entregan XP.
- **Desafío diario:** una pregunta de cada personaje; recompensa una sola vez por fecha del dispositivo.
- **Duelo local:** dos personas en el mismo celular, con las mismas preguntas y opciones. Las soluciones se muestran al terminar ambos turnos. No hay partidas por Internet.
- **Colección:** ocho logros, preguntas favoritas, referencias y pasajes completos.
- **Ajustes:** efectos, música suave, vibración breve y reducción de movimiento. El avance se guarda automáticamente; puedes pausar y continuar una ronda.

50/50 elimina dos opciones incorrectas por 25 monedas; Escritura muestra el pasaje por 20; Pausar congela el reloj durante 12 segundos por 30, una vez por ronda. Cada error suma 5 segundos en los modos con reloj. La práctica no tiene penalización de tiempo. Los premios se liquidan una sola vez al cerrar la ronda.

## Compilar en Obrero 1

Requisitos: Node.js 22 o superior, JDK 21 y Android SDK con plataforma y Build-Tools 36.0.0. El teléfono Realme con Android 11 es compatible; la versión mínima es Android 7.0.

```bash
git clone --branch scala/heroes-de-la-fe --single-branch https://github.com/ever7690/SCALA.git SCALA-heroes
cd SCALA-heroes/games/SCALA_Heroes_de_la_Fe
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
bash scripts/build_android.sh
adb -d install -r entregables/SCALA_Heroes_de_la_Fe_1.1.0_pruebas.apk
```

La APK de pruebas usa `com.scala.heroesdefe.debug`. La comercial usa `com.scala.heroesdefe`, versión 1.1.0 / código 2. Héroes de Fe aparece bajo el ícono del teléfono. Palabras de Fe es una aplicación independiente y permanece instalada.

Para la versión comercial se reutiliza la clave privada SCALA del propietario, con alias `scala-palabrasdefe`. Nunca se guarda la clave ni su contraseña en GitHub.

```bash
bash scripts/sign_android.sh /ruta/scala-palabras-de-fe.p12 /ruta/scala-password.txt
adb -d install -r entregables/SCALA_Heroes_de_la_Fe_1.1.0_comercial.apk
```

Los entregables incluyen APK firmada para instalar, AAB firmado para subir a Google Play, sumas SHA-256, informes de pruebas, auditoría de dependencias y materiales de tienda. La compilación en GitHub Actions usa JDK 21 y produce las versiones nativas. La publicación en una tienda la realiza el propietario desde su cuenta.

## Validación y arte

```bash
npm ci
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:ui
npm run store:prepare
```

Las pruebas verifican recompensas, ayudas, restauración, duplicación de toques, desafío diario, igualdad en el duelo y recarga sin conexión. La interfaz se comprueba en 320 y 390 px. Estas pruebas no sustituyen la instalación en un teléfono físico.

La fuente bíblica, el commit exacto y el SHA-256 del banco están en `docs/fuentes-preguntas.json`. El contenido editorial está en `content/questions.tsv`; `scripts/build_questions.py --bible-dir /ruta/ReinaValera1909` vuelve a comprobar las referencias y la evidencia textual usando `uv run python`.

Los 12 retratos y el ícono son imágenes originales hechas con el generador integrado. Sus prompts completos están en `docs/arte-generado.json`; `docs/arte-verificado.json` documenta los hashes. Los maestros PNG de `artwork/` se conservan intactos. `scripts/prepare_art.mjs` crea retratos WebP de 768 px e íconos PNG de 512 px, incluyendo las máscaras nativas Android. El logo SCALA original conserva sus bytes y proporciones.

Consulta `NOTICE.md`, `licenses/` y `docs/PRIVACIDAD.md` para procedencia y licencias. Las ilustraciones son interpretaciones artísticas, no reconstrucciones históricas.

## Renovación 1.1.0

Interfaz blanca y marfil, detalles oliva y dorados, dos fondos bíblicos exclusivos y nuevo ícono Héroes de Fe sin laurel. Bienvenida blanca y limpia con el logo original ampliado y la firma negra Scala desarrollo cristiano. Música original Luz del Camino y 34 efectos cálidos propios que distinguen navegación, lectura, monedas, ajustes, ayudas y resultados. Los 29 íconos Phosphor Duotone se integran sin dependencias de red. El saldo abre Mis monedas con sus recompensas y ayudas. Conserva la identidad Android y la clave de guardado de 1.0.0.

Para reproducir la preparación del nuevo arte: `node scripts/prepare_brand.mjs`. Para regenerar los íconos desde sus SVG originales: `node scripts/prepare_icons.mjs`. Para regenerar los efectos: `uv run python scripts/generate_sounds.py`. La música generada y su procedencia están en artwork/audio y docs/musica-original.json. Las licencias y hashes de los íconos están en licenses/PHOSPHOR-MIT.txt y docs/iconos-profesionales.json.
