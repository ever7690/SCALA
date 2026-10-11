# SCALA Business AI — piloto 0.1.0

Aplicación Android sin servidor para pequeños negocios. Prototipo funcional de gestión local, **no** es una solución SaaS multiempresa operativa todavía.

## Funciones

- Panel de control: ventas del mes, pendientes de cobro, clientes, inventario bajo, actividad y gráfico de ventas.
- Gestión de clientes, teléfono de WhatsApp y notas.
- Catálogo de productos/servicios, códigos, precios, inventario.
- Registro de ventas, cálculo monetario en centavos, descuento de inventario, anulación con devolución de existencias y marcado de cobro.
- Cotizaciones compartibles y conversión a venta sin duplicar el descuento de stock.
- Compartir presupuestos y comprobantes comerciales con otras aplicaciones; WhatsApp abre la conversación pero nunca envía mensajes de forma automática.
- Copias de seguridad JSON exportables/importables con Android Documents UI y confirmación antes de sobreescribir.
- Almacenamiento local en WebView. No requiere internet para trabajar, sin anuncios, sin permisos de red.
- Logotipo original SCALA incorporado en compilación usando el archivo ya existente en el repositorio.

**Límites claros:** No hay WhatsApp Business API conectada, pagos QR bancarios confirmados, emisión de factura fiscal, múltiples cuentas, sincronización, backend, autenticación ni IA remota. No se deben vender estas capacidades como disponibles. Los comprobantes comerciales no sustituyen facturas fiscales.

## Compilación en GitHub Actions (nube)

El workflow `.github/workflows/scala-business-android.yml` ejecuta pruebas y compila `app-debug.apk` en la rama `scala/business-ai`, luego publica el APK en **Actions → SCALA Business AI Android → Artifacts**. El APK está firmado únicamente con clave de depuración, apto para instalar y probar, NO publicar en Google Play.

## Compilación en OBRERO 1

Requisitos: JDK 17; Android SDK platform 35 + build tools 35.0.0; Gradle 8.12. Desde raíz del repositorio:

```bash
cp games/SCALA_Palabras_de_Fe/public/brand/scala-original.png apps/SCALA_Business_AI/app/src/main/assets/logo.png
cd apps/SCALA_Business_AI
node tests/core.test.js
gradle --no-daemon :app:assembleDebug
```

Salida: `app/build/outputs/apk/debug/app-debug.apk`. Comando de instalación opcional: `adb install -r app/build/outputs/apk/debug/app-debug.apk`.

## Privacidad y operación

La información se queda en el teléfono; realizar respaldos frecuentes y guardarlos en un lugar privado. La app usa almacenamiento privado de WebView con origen estable `https://scala.local/` cargado directamente desde recursos empaquetados, no contacta ese dominio ni necesita permiso INTERNET. El origen ficticio solo sirve para almacenamiento seguro del dispositivo.

Licencia: código propio SCALA 2026. No se incluye código, elementos gráficos ni sonidos copiados de terceros no autorizados. El logotipo se copia intacto desde el recurso original del propietario.
