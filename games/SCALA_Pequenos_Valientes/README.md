# SCALA Pequeños Valientes

Aventura educativa cristiana original para niños de 6 a 12 años y sus familias. Escalito, Lupi, Ana, Luz, Mateo y Roko acompañan seis historias sobre sentimientos, límites, apoyo adulto, amistad, reparación y dignidad. Incluye doce decisiones con explicaciones amables, narración en español, música original, catorce sonidos suaves, ajustes accesibles, progreso local y acceso familiar con PIN y código de recuperación.

La aplicación funciona sin conexión. No incluye publicidad, compras integradas, cuentas, analítica, chat ni captura de relatos personales. Las emociones elegidas no se guardan. El progreso no califica el estado de ánimo. El adulto conserva la responsabilidad de escuchar y proteger.

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

Los recursos listos para compilar están en `public-runtime/`. No es necesario generar imágenes ni música de nuevo. `scripts/prepare_assets.mjs` es una herramienta de producción opcional que requiere los originales visuales y musicales; no forma parte de la compilación. El nombre Android es «Pequeños Valientes», el identificador comercial es `com.scala.pequenosvalientes` y la versión inicial es 1.0.0, código 1. La variante de pruebas usa `.debug` y no reemplaza la versión comercial.

## Firmar

```bash
bash scripts/sign_android.sh /ruta/a/tu-clave.p12 /ruta/a/archivo-de-contrasena.txt
```

Conserva la misma clave para todas las actualizaciones de esta aplicación. Nunca publiques la clave ni su contraseña. El script produce un APK comercial y un AAB firmado en `entregables/`.

## Antes de publicar para niños

La compilación técnica y las pruebas automatizadas no equivalen a una evaluación pedagógica o clínica. La entrega incluye una lista de revisión familiar, una guía para revisión profesional, la política de privacidad y materiales para la ficha. Faltan la revisión especializada del contenido y la prueba con familias reales, la verificación de los derechos aplicables a los recursos y la configuración y aprobación de la tienda. No se ha realizado un estudio de eficacia ni se promete tratar o prevenir por completo el acoso.

Los gráficos y guiones son originales del proyecto. El logotipo y los personajes aprobados se conservan. Consulta `docs/RECURSOS_Y_DERECHOS.md` y las licencias de las dependencias.
