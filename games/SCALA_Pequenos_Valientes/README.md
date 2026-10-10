# SCALA Pequeños Valientes

Aventura educativa cristiana original para niños de 6 a 12 años y sus familias. Escalito, Lupi, Ana, Luz, Mateo y Roko acompañan **30 historias completas y 60 decisiones** sobre sentimientos, límites, apoyo adulto, amistad, reparación, fe y dignidad. Cada historia tiene narración en español, una práctica y orientación para la familia.

La versión 1.2.0 incorpora una ilustración propia y un icono diferente para cada una de las 30 historias, un icono exclusivo de Mi aventura y 60 preguntas narradas con sus opciones A, B y C. La música aportada por SCALA se reproduce desde la bienvenida, se repite y baja suavemente durante la voz. Conserva las 30 narraciones de historias, los 17 efectos originales, las pausas de calma opcionales, los 30 pequeños gestos y la casa SCALA. Los seis personajes recortados tienen movimiento suave de ojos desactivable; las ilustraciones completas son estáticas. Las historias están abiertas y se pueden repetir a cualquier ritmo.

La zona infantil funciona sin conexión, sin anuncios de terceros, cobros, cuentas, analítica ni chat. El espacio familiar, protegido por PIN, contiene una promoción claramente identificada de los recursos de SCALA en **https://vitacala.online/**. Requiere confirmación antes de abrir el navegador externo. Ese sitio necesita internet y tiene sus propias prácticas de datos. La app no añade permiso de Internet para sus actividades locales.

Las emociones elegidas no se guardan. Se conserva el progreso educativo, los gestos practicados, el punto de continuación, los ajustes y la protección familiar solo en este dispositivo. El adulto conserva la responsabilidad de escuchar y proteger.

Esta rama conserva la actualización preparada. Falta volver a adjuntar el MP3 original de SCALA antes de compilar la APK final; no se publica una sustitución. El informe artwork/VERIFICACION_PREVIA_1.2.0.json distingue las pruebas de interfaz con audio provisional de la compilación e instalación Android pendientes.

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

Los recursos de producción están en public-runtime/. No hace falta generar imágenes ni voz durante la compilación. El identificador comercial es com.scala.pequenosvalientes, versión 1.2.0, código 3. Usando la misma clave, la instalación conserva el progreso y el PIN de las versiones anteriores. La variante de pruebas usa .debug y no reemplaza la comercial. Las pruebas verifican el SHA-256 del MP3 aportado por SCALA y rechazan una compilación si falta o se sustituye ese archivo.

## Firmar

```bash
bash scripts/sign_android.sh /ruta/a/tu-clave.p12 /ruta/a/archivo-de-contrasena.txt
```

Conserva la misma clave para las actualizaciones. Nunca publiques la clave ni su contraseña. El script produce el APK comercial y el AAB firmado en entregables/.

## Producción y publicación

Las 30 narraciones de las historias se conservan sin cambios. Las 60 preguntas usan Kokoro ef_dora, velocidad 0,96, con la misma producción local de las últimas 24 historias. El proceso no utiliza créditos de voz externos. La música de esta versión es el archivo MP3 enviado por SCALA; las composiciones anteriores se conservan como recursos de archivo, sin selector en la interfaz. Consulta docs/RECURSOS_Y_DERECHOS.md y los manifiestos de recursos. Los originales de imagen y los modelos de voz no se publican en Git; los archivos finales sí.

Esta actualización se entrega para comprobar en el teléfono. Las pruebas técnicas no sustituyen la revisión del contenido infantil y la observación con familias. La documentación identifica los pasos de publicación pendientes: soporte y política pública, revisión del contenido y recursos y configuración y aprobación de la tienda. No se promete tratamiento, eficacia clínica ni facturación.
