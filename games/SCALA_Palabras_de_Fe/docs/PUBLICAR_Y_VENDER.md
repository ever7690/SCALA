# SCALA Palabras de Fe 1.1.2

Esta entrega prepara una versión comercial de pago único: 1.000 crucigramas en español, 10 capítulos, 29 versículos Reina-Valera 1909, monedas virtuales, pistas, palabras extra y regalo diario. Incluye sonidos, música ambiental, progreso local y juego sin conexión. No contiene publicidad, cuentas ni compras internas. El precio se fija al distribuir el juego, no dentro de la aplicación.

## Archivos de venta

- `SCALA_Palabras_de_Fe_1.1.2_comercial.apk`: instalación directa en Android 7 o posterior, firmada con la clave propia de este juego.
- `SCALA_Palabras_de_Fe_1.1.2_Google_Play.aab`: paquete firmado para cargar en Play Console. Un AAB no se instala directamente por USB.
- `tienda/`: ícono PNG 512 × 512, gráfico JPEG 1024 × 500 y cuatro capturas JPEG 1080 × 1920 de la interfaz real del juego. La versión web de producción comparte interfaz y contenido con el APK; estas capturas no sustituyen la prueba en un teléfono Android.
- `textos-tienda.json`: nombre, descripción breve y descripción completa en español.
- `privacidad.html`: política que debe completarse con tu contacto real y alojarse en una URL pública antes de presentar el juego en Google Play.
- `FIRMA_APK.txt`, `FIRMA_AAB.txt`, `SHA256_COMERCIAL.txt`: comprobaciones de firma y huellas de los archivos comerciales.
- `validacion-niveles.json`, `validacion-interfaz.json` y `auditoria-npm.json`: resultados de las comprobaciones realizadas.

La clave privada y su contraseña se entregan en un respaldo separado. No van dentro del paquete comercial, del APK, del AAB ni del repositorio. Conserva ese respaldo en un lugar privado y una segunda copia segura: la misma clave se necesita para actualizar una instalación vendida directamente.

## Antes de cobrar por la primera entrega

1. Instala esta actualización en el Realme y revisa portada, icono, gestos, sonidos, pistas, final de nivel y guardado después de cerrar y volver a abrir. Repite un nivel en modo avión. La versión 1.1.0 de pruebas ya fue instalada y revisada visualmente por el propietario; la 1.1.2 requiere escuchar la campanilla nueva en el dispositivo. Los demás efectos y la música conservan sus archivos.
2. Define precio, canal de venta y contacto de soporte. Entrega el contacto con el comprobante o la ficha del producto. Completa también `src/data/privacy.json` con ese contacto antes de publicar en una tienda.
3. Distribuye el APK `comercial`, junto con el nombre de la aplicación, la versión, Android mínimo, tus datos de soporte y la huella SHA-256. El APK de pruebas y los archivos sin firmar son para desarrollo.

No se incluyen pasarela de pago, servidor de licencias ni protección contra la copia del APK. La venta directa es una entrega del archivo a través de tu propio canal de cobro. Para gestionar compra y distribución desde una tienda, utiliza su sistema de pago y distribución.

## Presentación en Google Play

El paquete usa `com.scala.palabrasdefe`, versión `1.1.2`, código de versión `4`, SDK objetivo 36 y SDK mínimo 24. API 36 cumple el requisito de SDK objetivo publicado para nuevas aplicaciones y actualizaciones desde el 31 de agosto de 2026. Esto no equivale a aprobación de la tienda.

El propietario debe completar cuenta y verificación de desarrollador, perfil de pagos, precio, países, datos de soporte, clasificación de contenido, público objetivo y declaración de seguridad de los datos. Según el comportamiento actual de esta APK, la aplicación no recopila ni comparte datos personales; el progreso se conserva localmente y Android puede administrar copias del sistema. El formulario y la política siguen siendo necesarios aunque no se recopilen datos. No declares una clasificación por edad ni participación en un programa para niños sin completar los formularios correspondientes.

La política debe estar en una URL pública accesible, con tu contacto real de privacidad; un PDF o un archivo local no reemplaza esa URL. El AAB firmado y las imágenes están preparados para carga, pero la publicación y el cobro requieren tus decisiones y la revisión de la plataforma. Las cuentas personales creadas después del 13 de noviembre de 2023 tienen requisitos de prueba cerrada antes del acceso a producción; consulta los requisitos aplicables a tu cuenta.

Si quieres que los APK vendidos directamente y los descargados de Google Play puedan actualizarse entre sí, configura Play App Signing con la misma clave de firma de la aplicación. Si Play firma con otra clave, las instalaciones no se actualizan entre esos canales. Sigue el proceso de importación y clave de subida que solicite Play Console; no publiques tu clave privada.

## Actualizar la aplicación instalada de pruebas

La variante comercial tiene un identificador distinto de la de pruebas (`com.scala.palabrasdefe.debug`). Se instala junto a ella y comienza con su propio progreso. No desinstales la versión de pruebas para revisar la comercial. Para mantener el progreso de la APK de pruebas instalada en OBRERO 1, recompila allí: utilizará la misma clave local de depuración.

```bash
cd /home/obrero/SCALA-juego
git pull --ff-only origin scala/bible-word-puzzle
cd games/SCALA_Palabras_de_Fe
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
bash scripts/build_android.sh
adb -d install -r entregables/SCALA_Palabras_de_Fe_1.1.2_pruebas.apk
```

Para instalar el APK comercial descargado y descomprimido en OBRERO 1:

```bash
adb -d install -r /ruta/SCALA_Palabras_de_Fe_1.1.2_comercial.apk
```

## Crear futuras versiones comerciales

Incrementa `version` en `package.json` y en el lockfile, `versionName` y `versionCode` en `android/app/build.gradle`. Compila y firma con el respaldo original de este juego:

```bash
bash scripts/build_android.sh
bash scripts/sign_android.sh /ruta/privada/scala-palabras-de-fe.p12 /ruta/privada/scala-password.txt
```

## Fuentes de requisitos de publicación

- [SDK objetivo de Google Play](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Política de datos y privacidad](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Formulario de seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Imágenes y capturas](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Pruebas para cuentas personales nuevas](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Firma de aplicaciones Android](https://developer.android.com/studio/publish/app-signing)

Requisitos consultados el 9 de octubre de 2026.
