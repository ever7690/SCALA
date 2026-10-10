# SCALA Pequeños Valientes

Aventura educativa cristiana original para niños de 6 a 12 años y sus familias. Escalito, Lupi, Ana, Luz, Mateo y Roko acompañan **30 historias completas y 60 decisiones** sobre sentimientos, límites, apoyo adulto, amistad, reparación, fe y dignidad. Cada historia tiene narración en español, una práctica y orientación para la familia.

La versión 1.1.0 añade tres rincones: pausas de calma opcionales de 40 segundos, 30 pequeños gestos y la casa SCALA, un lugar de encuentro imaginario. Incluye paisajes en todas las pantallas, bienvenida urbana con la marca estática, 16 iconos infantiles en 3D, expresiones con movimiento suave desactivable, dos melodías y 17 efectos originales. Las historias están abiertas: no se bloquean por fecha ni se exige una racha diaria.

La zona infantil funciona sin conexión, sin anuncios de terceros, cobros, cuentas, analítica ni chat. El espacio familiar, protegido por PIN, contiene una promoción claramente identificada de los recursos de SCALA en **https://vitacala.online/**. Requiere confirmación antes de abrir el navegador externo. Ese sitio necesita internet y tiene sus propias prácticas de datos. La app no añade permiso de Internet para sus actividades locales.

Las emociones elegidas no se guardan. Se conserva el progreso educativo, los gestos practicados, el punto de continuación, los ajustes y la protección familiar solo en este dispositivo. El adulto conserva la responsabilidad de escuchar y proteger.

## Comprobar y compilar

Necesita Node.js 22 o superior, JDK 21 y Android SDK con plataforma 36 y herramientas 36.0.0.

```bash
npm ci
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:ui
bash scripts/build_android.sh
```

Los recursos de producción ya están en public-runtime/. No hace falta generar imágenes ni voz durante la compilación. El identificador comercial es com.scala.pequenosvalientes, versión 1.1.0, código 2. Usando la misma clave, la instalación conserva el progreso y el PIN de 1.0.0. La variante de pruebas usa .debug y no reemplaza la comercial.

## Firmar

```bash
bash scripts/sign_android.sh /ruta/a/tu-clave.p12 /ruta/a/archivo-de-contrasena.txt
```

Conserva la misma clave para las actualizaciones. Nunca publiques la clave ni su contraseña. El script produce el APK comercial y el AAB firmado en entregables/.

## Producción y publicación

Las seis narraciones anteriores se conservan; las 24 nuevas usan una voz femenina cálida de catálogo Kokoro ef_dora. Son voces diferentes, con el mismo objetivo de lectura amable. Jardín tierno es una composición original; Mundo amable conserva la música anterior. Consulta docs/RECURSOS_Y_DERECHOS.md y los manifiestos de recursos. Los originales de imagen y WAV de producción no se publican en Git; los archivos finales sí.

Esta actualización se entrega para comprobar en el teléfono. Las pruebas técnicas no sustituyen la revisión del contenido infantil y la observación con familias. La documentación identifica los pasos de publicación pendientes: soporte y política pública, revisión del contenido y recursos y configuración y aprobación de la tienda. No se promete tratamiento, eficacia clínica ni facturación.
