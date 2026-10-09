# Fase final de venta · SCALA Palabras de Fe 1.1.2

Esta entrega cierra el acabado del juego: botones azul y oro, ícono adaptable con el nombre, 1.000 crucigramas, 10 capítulos, 29 versículos, progreso automático, pistas, monedas virtuales, regalo diario, música ambiental y campanilla suave al seleccionar letras. Los demás sonidos conservan sus archivos. El pago es único al adquirir la aplicación; las monedas del juego no se venden y no tienen valor monetario.

## Material listo

- APK comercial firmada para instalar en Android 7.0 o posterior.
- AAB firmado para presentar en Google Play.
- Ícono, gráfico de presentación y cuatro capturas reales de la interfaz de producción.
- Descripción en español, política de privacidad, licencias, huellas SHA-256 y resultados de verificación.
- Código en la rama `scala/bible-word-puzzle`, con compilación reproducible en OBRERO 1.
- Clave comercial original conservada. El respaldo privado entregado para la versión 1.1.0 sigue siendo el correcto.

## Comprobación final en el Realme

Escucha tres o cuatro letras por separado y desliza una palabra. La selección debe sonar como una campanilla suave y mezclar debe mantener su efecto anterior. Completa un nivel, cierra y vuelve a abrir, y prueba un nivel en modo avión. Comprueba también que desactivar Sonidos silencia las letras.

Para conservar el progreso de la versión de pruebas, ejecuta en OBRERO 1:

```bash
cd /home/obrero/SCALA-juego &&
git pull --ff-only origin scala/bible-word-puzzle &&
cd games/SCALA_Palabras_de_Fe &&
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 &&
export PATH="$JAVA_HOME/bin:$PATH" &&
bash scripts/build_android.sh &&
adb -d install -r entregables/SCALA_Palabras_de_Fe_1.1.2_pruebas.apk
```

Para revisar la APK comercial descargada, instálala directamente. No necesita recompilarse. Se instala junto a la de pruebas y conserva su propio progreso. Las futuras versiones comerciales deben usar la misma clave.

## Venta directa

1. Define el precio, el medio de cobro y un correo o canal de soporte que atiendas. Estos datos corresponden al propietario; el proyecto no los inventa ni inicia cobros.
2. Publica la descripción y capturas incluidas. Indica Android 7.0 o posterior, idioma español, compra única, juego sin conexión y guardado local. El progreso de una instalación de pruebas no se transfiere automáticamente a la comercial.
3. Después del pago, entrega únicamente `SCALA_Palabras_de_Fe_1.1.2_comercial.apk`, la guía para compradores y tus datos de soporte. Conserva el comprobante de la compra y la versión entregada.
4. Atiende incidencias y entrega actualizaciones firmadas con la misma clave. No entregues a clientes el respaldo privado, contraseñas, APK de pruebas ni archivos sin firmar.

La compra y entrega se gestionan mediante el canal elegido por el propietario. La aplicación no incluye una pasarela de pago ni un servidor de licencias.

## Guía para compradores

Abre el APK comercial en tu teléfono Android. Si el instalador solicita permitir instalaciones de la aplicación desde la que abriste el archivo, habilita ese permiso para instalarlo. Después abre **SCALA Palabras de Fe** y pulsa **Comenzar a jugar**. El sonido, la música y la vibración se ajustan desde el engranaje. El juego funciona sin conexión y guarda el avance localmente. Mantén instalada la aplicación y sus datos para conservarlo; no necesitas desinstalar para instalar una actualización firmada por SCALA.

Reiniciar el progreso, borrar los datos o desinstalar puede borrar tu avance. El contacto de soporte y las condiciones de entrega se facilitan con el comprobante de compra o la ficha del producto.

## Google Play

Completa la cuenta y verificación del desarrollador, perfil de pagos, precio, países, contacto de soporte, público objetivo, clasificación de contenido y seguridad de los datos. Aloja la política en una URL pública con el contacto real y usa la ficha y el AAB de esta entrega. El contacto y la URL pública aún requieren los datos del propietario. No se ha enviado el juego a revisión ni publicado desde este proyecto.

Si la cuenta personal fue creada después del 13 de noviembre de 2023, Google exige una prueba cerrada con al menos 12 participantes inscritos durante 14 días continuos antes de solicitar acceso a producción. Cumplir la prueba permite solicitar el acceso; la aprobación depende de Google.

Google admite registro de desarrolladores y comerciantes en Bolivia. Los pagos por transferencia para comerciantes de Bolivia se emiten en USD; la ayuda de Google indica un saldo mínimo de US$100 para ese pago. Verifica los requisitos de tu perfil y las comisiones de tu banco antes de elegir esta vía.

Fuentes oficiales consultadas el 9 de octubre de 2026:

- [Privacidad y datos](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Pruebas para cuentas personales nuevas](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Países admitidos para registro](https://support.google.com/googleplay/android-developer/answer/9306917)
- [Pagos por transferencia](https://support.google.com/googleplay/android-developer/answer/2700656)

## Registro de lanzamiento

| Dato | Estado |
| --- | --- |
| Precio y moneda | Pendiente del propietario |
| Medio de cobro y entrega | Pendiente del propietario |
| Correo o canal de soporte | Pendiente del propietario |
| Contacto y URL pública de privacidad para Google Play | Pendiente del propietario |
| Cuenta y revisión de Google Play | Pendiente si se elige esa tienda |
| Nueva campanilla en el Realme | Pendiente de escuchar la versión 1.1.2 |

La entrega técnica y la firma no equivalen a la aprobación de una tienda ni aseguran ventas. El propietario puede completar precio y soporte en su ficha, comprobante y política; no necesita añadir nuevas funciones para el modelo de venta directa de pago único.
