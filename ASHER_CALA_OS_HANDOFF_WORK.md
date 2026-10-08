# ASHER CALA OS – HANDOFF PARA CHATGPT WORK

## Objetivo
Crear **ASHER CALA OS – SCALA Gaming** a partir de la ISO funcional:

- `MiniOS11 X-24H2 v26.06 x64.iso`

## Prioridad absoluta
Conservar intacto el arranque funcional de MiniOS:

- BIOS / UEFI
- El Torito
- BCD
- `boot.wim`
- `bootmgr` / `bootmgr.efi`
- UDF / ISO9660 fuera de `install.esd`

**No reconstruir la estructura de arranque.**
**No entregar una ISO hasta que pase validaciones.**
**No quitar la personalización ASHER.**

## Personalización requerida
- Las **5 imágenes ASHER se conservan sí o sí**.
- Reemplazar wallpapers originales de Windows/MiniOS por las imágenes ASHER, no duplicarlas.
- Modo oscuro.
- Game Mode ON.
- Game DVR OFF.
- Perfil ligero para equipos de pocos recursos.
- Alto rendimiento / ajustes gaming conservadores.
- SCALA Gaming Center.
- Dedicatoria:
  “Este sistema operativo va dedicado a mi hijo Asher Cala, con mucho cariño de su padre Ever Nelson Calamontes, a su hijo Asher Cala Quilla.”
- Mantener audio, red, Bluetooth, Store, Gaming Services, drivers y componentes necesarios para estabilidad.

## Archivos fuente en Library
Buscar primero en Library, especialmente en `/SCALA_GAMING_OS_SOURCE/`.

Archivos conocidos:
- `ISO_ORIGINAL_SHA256.txt`
- `ASHERIMAGENES.tar.gz`

La ISO original fue guardada previamente dividida en partes:
- `MiniOS11_X_24H2_v26.06_x64.iso.part-000`
- `MiniOS11_X_24H2_v26.06_x64.iso.part-001`
- `MiniOS11_X_24H2_v26.06_x64.iso.part-002`
- `MiniOS11_X_24H2_v26.06_x64.iso.part-003`
- `MiniOS11_X_24H2_v26.06_x64.iso.part-004`
- `MiniOS11_X_24H2_v26.06_x64.iso.part-005`
- `MiniOS11_X_24H2_v26.06_x64.iso.part-006`
- `MiniOS11_X_24H2_v26.06_x64.iso.part-007`
- `MiniOS11_X_24H2_v26.06_x64.iso.part-008`

## Datos verificados de la ISO original
SHA-256 ISO original:
`798325928641854d3214e3d565eeb29088288334f66b51d83f907ab0561f6eb1`

Tamaño ISO original:
`3,959,740,416 bytes`

`install.esd`:
- LBA: `303091`
- tamaño: `3,201,322,926 bytes`
- SHA-256:
  `77668ca0242b42056c9458482da61c01469cb8528c14744e20888f476b3c8a69`

`boot.wim` SHA-256:
`2af7f724c3e0ede4b0c8936ce2882c9fdfe9f8dcd9996c6609c919f1b2c4b1e0`

## Historial técnico
### v1.1
Falló físicamente en Ventoy con:
- `File: \\Windows\\system32\\boot\\winload.exe`
- `Error code: 0xc000000d`

Causa: se alteró/reconstruyó la estructura ISO/UDF. Ese método queda descartado.

### v1.2
Falló por:
- detección de `install.esd`
- WIM/ESD de solo lectura

### v1.3
Se corrigió el método:
1. extraer `install.esd`
2. convertir ESD sólido a WIM escribible
3. integrar SCALA
4. volver a ESD LZMS sólido
5. reemplazar exactamente el extent original
6. no modificar bytes fuera de `install.esd`

El método ESD -> WIM -> ESD y reemplazo in-place pasó pruebas en GitHub Actions.

## Último fallo real
ESD personalizado:
`3,207,553,036 bytes`

Límite original:
`3,201,322,926 bytes`

Exceso exacto:
`6,230,110 bytes`

Esto **no es un error de arranque**. Es un problema de tamaño.

## Decisión final
- NO quitar las 5 imágenes ASHER.
- NO añadirlas encima de los wallpapers originales.
- Reemplazar recursos gráficos originales equivalentes por las 5 imágenes ASHER para recuperar espacio.
- Si todavía faltan unos MB, optimizar el peso de las imágenes ASHER sin eliminarlas.

## Metodología obligatoria
BASE FUNCIONAL -> PRUEBA -> ESTABILIZACIÓN -> PERSONALIZACIÓN -> OPTIMIZACIÓN -> COMPILACIÓN -> PRUEBA FINAL -> ENTREGA

## Entrega esperada
- ISO final ASHER CALA OS
- tamaño final
- SHA-256 final
- validación de:
  - ESD
  - SCALA presente
  - SetupComplete presente
  - BIOS/UEFI/El Torito iguales a la base
  - bytes fuera de `install.esd` sin cambios
- prueba de arranque/instalación en VM si Work dispone de entorno adecuado
- no afirmar “final” antes de pasar las pruebas

## Instrucción para Work
Continuar desde aquí sin pedir al usuario que repita toda la historia ni que vuelva a subir archivos si ya están disponibles en Library. Buscar primero los archivos fuente en Library, reconstruir la ISO original exacta desde las partes si es necesario, aplicar el método correcto y entregar resultado terminado.
