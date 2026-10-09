# SCALA Palabras de Fe

Juego Android completo de conectar letras y resolver crucigramas, basado en el motor MIT de Word Tracer. Interfaz propia SCALA en español, con el logotipo original suministrado.

Incluye 1.000 niveles distintos, 10 capítulos, palabras extra, monedas, pistas de letra, regalo diario con racha, 29 versículos RV1909, sonidos Kenney CC0, música original, ajustes y guardado automático local. No necesita cuentas ni conexión para jugar.

## Compilar en OBRERO 1

Requisitos: Linux Mint/Ubuntu, Node.js 22 o superior, JDK 21 y Android SDK con plataforma 36. Gradle 9.3.1 se descarga mediante el wrapper; no hay que instalar Gradle globalmente.

```bash
git clone --branch scala/bible-word-puzzle --single-branch https://github.com/ever7690/SCALA.git SCALA-juego
cd SCALA-juego/games/SCALA_Palabras_de_Fe
bash scripts/build_android.sh
```

Si ya tienes el repositorio, usa una carpeta independiente para evitar modificar los otros proyectos de SCALA.

Si trabajas desde MASTER, conecta primero con `ssh -t obrero@192.168.1.42` y ejecuta los comandos de compilación en esa sesión. El wrapper usa el paquete binario oficial de Gradle 9.3.1 y comprueba su SHA-256. Ante un error de conexión `NoRouteToHost`, prueba IPv4 para esa compilación:

```bash
JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Djava.net.preferIPv4Stack=true" bash scripts/build_android.sh
```

En Android Studio, instala Android SDK Platform 36 y Android SDK Build-Tools 36.0.0. Define `ANDROID_HOME` con la ruta de tu SDK; por ejemplo `$HOME/Android/Sdk`. El script ejecuta la comprobación del código, valida los 1.000 niveles, genera la web, sincroniza Capacitor y compila ambos APK con dos trabajadores y 1,5 GB de memoria Gradle.

Entregables:

- `entregables/SCALA_Palabras_de_Fe_1.0.0_pruebas.apk`: firmado automáticamente con la clave de depuración, instalable para pruebas.
- `entregables/SCALA_Palabras_de_Fe_1.0.0_sin_firmar.apk`: variante release, pendiente de firma con la clave de publicación del propietario.
- `entregables/SHA256SUMS.txt`: huellas de los APK producidos.

```bash
adb install -r entregables/SCALA_Palabras_de_Fe_1.0.0_pruebas.apk
```

La app requiere Android 7.0 o posterior y se muestra en vertical. Identificadores: `com.scala.palabrasdefe` en release y `com.scala.palabrasdefe.debug` en pruebas. Los dos guardan el progreso por separado.

## Desarrollo y verificación

```bash
npm ci
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:ui
npx cap sync android
```

`npm test` comprueba todos los crucigramas, sus cruces, sus soluciones y la restauración del progreso. Las pruebas de interfaz comprueban gestos, letras repetidas, pistas, recompensas, guardado, menú y funcionamiento sin conexión en móviles pequeños.

## Marca y contenido

`public/brand/scala-original.png` conserva el PNG recibido de 2048 × 1638 píxeles sin alteraciones. La interfaz utiliza `object-fit: contain`; no estira ni recorta el logotipo. Los iconos del sistema se adaptaron al tamaño Android.

Niveles: `src/data/bible-levels.json`. Versículos: `src/data/verses.json`. Efectos: `public/audio/`. Música: `scala-amanecer.ogg`. Estilo: `src/styles.css`.

Licencias y procedencia en `NOTICE.md`, `LICENSE` y `licenses/`. No se incluyen recursos propietarios de Bible Word Puzzle. El APK de pruebas está preparado para revisión; la publicación definitiva requiere la clave del propietario y la revisión final en su teléfono.
