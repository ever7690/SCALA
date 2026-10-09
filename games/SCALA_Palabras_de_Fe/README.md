# SCALA Palabras de Fe 1.1.0

Juego Android de conectar letras y resolver crucigramas, con interfaz propia SCALA en español y motor MIT de Word Tracer. Incluye 1.000 niveles, 10 capítulos, palabras extra, monedas virtuales, pistas, regalo diario con racha, 29 versículos RV1909, sonidos Kenney CC0, música original y progreso local. No necesita cuentas ni conexión para jugar; no contiene anuncios ni compras internas.

La versión 1.1.0 añade el ícono adaptable con el nombre del juego, tipografías Manrope y Lora sin conexión, paisajes suaves, controles más cómodos, animaciones de letras nuevas, navegación con el botón Atrás de Android y privacidad accesible desde Ajustes. Conserva el formato de guardado de la versión anterior.

## Compilar en OBRERO 1

Requisitos: Node.js 22 o superior, JDK 21 y Android SDK con plataforma y Build-Tools 36.0.0. El wrapper descarga Gradle 9.3.1 y verifica su SHA-256; no se necesita Gradle global.

```bash
git clone --branch scala/bible-word-puzzle --single-branch https://github.com/ever7690/SCALA.git SCALA-juego
cd SCALA-juego/games/SCALA_Palabras_de_Fe
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
bash scripts/build_android.sh
```

Desde MASTER, entra primero a OBRERO 1 con `ssh -t obrero@192.168.1.42`. Define `ANDROID_HOME` si el SDK no está en la ruta habitual; por ejemplo `$HOME/Android/Sdk`. Ante un problema de ruta de red con Java, puedes probar IPv4 durante la compilación:

```bash
JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Djava.net.preferIPv4Stack=true" bash scripts/build_android.sh
```

El script comprueba JDK, código y 1.000 niveles, genera el contenido sin conexión y compila con dos trabajadores y 1,5 GB de memoria Gradle. Produce en `entregables/` el APK de pruebas, el APK release sin firmar, el AAB sin firmar y sus huellas. La app requiere Android 7.0 o posterior y se muestra en vertical.

```bash
adb -d install -r entregables/SCALA_Palabras_de_Fe_1.1.0_pruebas.apk
```

Para actualizar una APK de pruebas conservando el progreso, compila en el mismo equipo que creó la instalada. Las claves automáticas de depuración de OBRERO 1 y de la nube son distintas. La variante comercial usa `com.scala.palabrasdefe`; la de pruebas usa `com.scala.palabrasdefe.debug`. Se instalan por separado y cada una guarda su propio progreso.

## Firma y venta

La clave comercial se entrega al propietario en un respaldo privado separado, fuera de este repositorio. Para firmar futuras compilaciones, utiliza la misma clave:

```bash
bash scripts/sign_android.sh /ruta/privada/scala-palabras-de-fe.p12 /ruta/privada/scala-password.txt
```

El script genera el APK comercial y el AAB firmado, verifica ambas firmas y comprueba la alineación del APK. No subas la clave ni su contraseña al repositorio.

[PUBLICAR_Y_VENDER.md](docs/PUBLICAR_Y_VENDER.md) explica instalación, precio, soporte, publicación, firma y requisitos de Google Play. [textos-tienda.json](docs/textos-tienda.json) contiene la ficha comercial. El contacto de soporte y la URL pública de privacidad deben completarse antes de publicar en una tienda. No se ha publicado ni cobrado por el juego desde este proyecto.

## Verificación y materiales

```bash
npm ci
npm run check
npm test
npm audit
npm run build
npx playwright install chromium
npm run test:ui
npm run store:prepare
node scripts/prepare_delivery.mjs
npx cap sync android
```

Las pruebas validan los 1.000 tableros, soluciones, cruces y restauración. La interfaz se comprueba con gestos reales, monedas y recompensas sin duplicarse, pistas, ajustes, foco, privacidad, fuentes sin conexión, pantallas pequeñas, tableros de 11 columnas y el nivel final. `store:prepare` exporta el ícono 512, el gráfico 1024 × 500 y cuatro capturas 1080 × 1920 de la interfaz real de producción. La compilación y las pruebas se ejecutan también en GitHub Actions.

## Marca y recursos

`public/brand/scala-original.png` conserva exactamente el PNG proporcionado de 2048 × 1638, sin cambios y con sus proporciones originales. SHA-256: `a6ada3a8a2afe73f0a38718fefd55b9734984800872049f5cd56f2259cec85e1`.

El ícono Android usa fondo azul en toda la máscara y una variante de la marca con «Palabras de Fe» dentro de la zona segura. El nombre de la aplicación bajo el ícono es «SCALA Palabras de Fe». La variante y su especificación están en [DISENO_ICONO.md](docs/DISENO_ICONO.md).

Niveles: `src/data/bible-levels.json`. Versículos: `src/data/verses.json`. Política: `src/data/privacy.json`, que genera `public/privacidad.html`. Audio: `public/audio/`; música: `scala-amanecer.ogg`. Tipografías: `public/fonts/`. Estilo: `src/styles.css`.

Licencias y procedencia: `NOTICE.md`, `LICENSE` y `licenses/`. No se incluyen código, gráficos ni audio extraídos del juego comercial Bible Word Puzzle.
