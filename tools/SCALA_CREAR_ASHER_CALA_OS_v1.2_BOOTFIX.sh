#!/usr/bin/env bash
set -Eeuo pipefail

SRC="$HOME/Descargas/MiniOS11 X-24H2 v26.06 x64.iso"
OUT="$HOME/Descargas/ASHER_CALA_OS_SCALA_GAMING_v1.2_FINAL_BOOTFIX_x64.iso"
IMGDIR="$HOME/Escritorio/ASHERIMAGENES"
WORK="$HOME/.cache/scala-asher-v12-bootfix"
ORIGINAL_SHA="798325928641854d3214e3d565eeb29088288334f66b51d83f907ab0561f6eb1"
ISO_INSTALL=""

fail() {
  echo
  echo "============================================================"
  echo " ERROR SCALA"
  echo " $*"
  echo "============================================================"
  exit 1
}

cleanup_on_fail() {
  rc=$?
  if command -v mountpoint >/dev/null 2>&1 && mountpoint -q "$WORK/udf-mount" 2>/dev/null; then
    sudo umount "$WORK/udf-mount" 2>/dev/null || true
  fi
  if [ "$rc" -ne 0 ]; then
    echo
    echo "Proceso detenido. La ISO final NO se marca como valida."
    rm -f "$OUT.tmp" 2>/dev/null || true
  fi
}
trap cleanup_on_fail EXIT

echo "============================================================"
echo " SCALA - ASHER CALA OS v1.2 FINAL BOOTFIX"
echo "============================================================"
echo "Fuente : $SRC"
echo "Salida : $OUT"
echo

[ -f "$SRC" ] || fail "No encuentro la ISO original MiniOS."

echo "[1/12] Verificando ISO original..."
GOT_SHA="$(sha256sum "$SRC" | awk '{print $1}')"
[ "$GOT_SHA" = "$ORIGINAL_SHA" ] || fail "La ISO fuente no coincide con la MiniOS original esperada. SHA: $GOT_SHA"
echo "ISO ORIGINAL: OK"

echo
echo "[2/12] Comprobando espacio libre..."
FREE_KB="$(df -Pk "$HOME" | awk 'NR==2 {print $4}')"
NEED_KB=$((12 * 1024 * 1024))
[ "$FREE_KB" -ge "$NEED_KB" ] || fail "Se requieren al menos 12 GB libres en HOME. Libres: $((FREE_KB/1024/1024)) GB"
echo "ESPACIO: OK"

echo
echo "[3/12] Verificando herramientas..."
MISSING=()
command -v xorriso >/dev/null 2>&1 || MISSING+=(xorriso)
command -v wimlib-imagex >/dev/null 2>&1 || MISSING+=(wimtools)
command -v sha256sum >/dev/null 2>&1 || MISSING+=(coreutils)

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "Faltan herramientas: ${MISSING[*]}"
  echo "Intentando instalarlas sin tocar repositorios ajenos..."
  sudo apt-get update     -o Dir::Etc::sourcelist="sources.list"     -o Dir::Etc::sourceparts="-"     -o APT::Get::List-Cleanup="0"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "${MISSING[@]}"
fi

command -v xorriso >/dev/null 2>&1 || fail "xorriso no disponible."
command -v wimlib-imagex >/dev/null 2>&1 || fail "wimlib-imagex no disponible."
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum no disponible."
echo "HERRAMIENTAS: OK"

rm -rf "$WORK"
mkdir -p "$WORK/payload/SCALA" "$WORK/payload/SetupScripts"

ESD="$WORK/install.esd"
PADDED="$WORK/install.padded.esd"
CHECK_ESD="$WORK/install.check.esd"
UPDATE_CMDS="$WORK/update.txt"
ELT_SRC="$WORK/eltorito.src.txt"
ELT_OUT="$WORK/eltorito.out.txt"

echo
echo "[4/12] Localizando imagen de Windows sin alterar la ISO..."
REPORT="$(xorriso -indev "$SRC" -find / -type f -exec report_lba -- 2>/dev/null || true)"

# Descubrimiento robusto: mayusculas/minusculas y ESD/WIM.
LINE="$(printf '%s\n' "$REPORT" | grep -Ei "File data lba:.*'/[^']*sources/install\.(esd|wim)(;[0-9]+)?'" | head -n1 || true)"

if [ -z "$LINE" ]; then
  echo "Rutas candidatas encontradas:"
  printf '%s\n' "$REPORT" | grep -Ei "File data lba:.*(install\.(esd|wim)|/sources/)" | tail -n 30 || true
  fail "No pude localizar install.esd/install.wim dentro de la ISO original."
fi

ISO_INSTALL="$(printf '%s\n' "$LINE" | sed -n "s/.*'\(.*\)'.*/\1/p")"
LBA="$(printf '%s\n' "$LINE" | awk -F',' '{gsub(/[[:space:]]/,"",$2); print $2}')"
ISO_ESD_SIZE="$(printf '%s\n' "$LINE" | awk -F',' '{gsub(/[[:space:]]/,"",$4); print $4}')"

[[ "$LBA" =~ ^[0-9]+$ ]] || fail "LBA invalido: $LBA"
[[ "$ISO_ESD_SIZE" =~ ^[0-9]+$ ]] || fail "Tamano de imagen invalido: $ISO_ESD_SIZE"
[ -n "$ISO_INSTALL" ] || fail "Ruta interna invalida."

echo "Imagen Windows : $ISO_INSTALL"
echo "LBA            : $LBA"
echo "Bytes          : $ISO_ESD_SIZE"

xorriso -osirrox on -indev "$SRC" -extract "$ISO_INSTALL" "$ESD" >/dev/null 2>&1
[ -f "$ESD" ] || fail "No se pudo extraer $ISO_INSTALL."
EXTRACTED_SIZE="$(stat -c '%s' "$ESD")"
[ "$EXTRACTED_SIZE" -eq "$ISO_ESD_SIZE" ] || fail "Tamano extraido no coincide con el registrado en la ISO."

# Las ISO suelen extraer archivos con permisos de solo lectura.
chmod u+rw "$ESD" 2>/dev/null || true
[ -w "$ESD" ] || fail "La imagen Windows extraida sigue sin permiso de escritura."

echo "EXTRACCION WINDOWS: OK"

echo
echo "[5/12] Verificando install.esd original..."
wimlib-imagex verify "$ESD"
IMAGE_COUNT="$(wimlib-imagex info "$ESD" | awk -F: '/^Image Count/ {gsub(/[[:space:]]/,"",$2); print $2; exit}')"
[[ "$IMAGE_COUNT" =~ ^[0-9]+$ ]] || fail "No pude determinar el numero de imagenes del ESD."
[ "$IMAGE_COUNT" -ge 1 ] || fail "install.esd no contiene imagenes."
echo "IMAGENES WINDOWS: $IMAGE_COUNT"

echo
echo "[6/12] Creando capa SCALA estable..."

cat > "$WORK/payload/SCALA/DEDICATORIA.txt" <<'EOF'
ASHER CALA OS - SCALA Gaming Edition

Este sistema operativo va dedicado a mi hijo Asher Cala,
con mucho cariño de su padre Ever Nelson Calamontes,
a su hijo Asher Cala Quilla.
EOF

cat > "$WORK/payload/SCALA/SYSTEM_SCALA.ps1" <<'EOF'
$ErrorActionPreference = "SilentlyContinue"

New-Item "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" AllowGameDVR 0 -Type DWord

New-Item "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" DisableWindowsConsumerFeatures 1 -Type DWord

New-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" "SCALA First Logon" 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\USER_SCALA.ps1"'

powercfg /S SCHEME_MIN | Out-Null
exit 0
EOF

cat > "$WORK/payload/SCALA/USER_SCALA.ps1" <<'EOF'
$ErrorActionPreference = "SilentlyContinue"

New-Item "HKCU:\Software\Microsoft\GameBar" -Force | Out-Null
Set-ItemProperty "HKCU:\Software\Microsoft\GameBar" AllowAutoGameMode 1 -Type DWord
Set-ItemProperty "HKCU:\Software\Microsoft\GameBar" AutoGameModeEnabled 1 -Type DWord

New-Item "HKCU:\System\GameConfigStore" -Force | Out-Null
Set-ItemProperty "HKCU:\System\GameConfigStore" GameDVR_Enabled 0 -Type DWord

New-Item "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Force | Out-Null
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" AppsUseLightTheme 0 -Type DWord
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" SystemUsesLightTheme 0 -Type DWord
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" EnableTransparency 0 -Type DWord

New-Item "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" -Force | Out-Null
Set-ItemProperty "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" "(default)" ""

$img = Get-ChildItem "C:\SCALA\ASHERIMAGENES" -File -ErrorAction SilentlyContinue |
       Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|bmp)$' } |
       Select-Object -First 1
if ($img) {
    Set-ItemProperty "HKCU:\Control Panel\Desktop" Wallpaper $img.FullName
    rundll32.exe user32.dll,UpdatePerUserSystemParameters
}

$desk = [Environment]::GetFolderPath("Desktop")
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$desk\SCALA Gaming Center.lnk")
$lnk.TargetPath = "C:\SCALA\GAMING_CENTER.cmd"
$lnk.WorkingDirectory = "C:\SCALA"
$lnk.Save()

exit 0
EOF

cat > "$WORK/payload/SCALA/DIAGNOSTICO.ps1" <<'EOF'
$ErrorActionPreference = "SilentlyContinue"
$out = "$env:USERPROFILE\Desktop\SCALA_DIAGNOSTICO.txt"

"ASHER CALA OS - DIAGNOSTICO SCALA" | Out-File $out
"Fecha: $(Get-Date)" | Out-File $out -Append
"" | Out-File $out -Append
"=== SISTEMA ===" | Out-File $out -Append

Get-CimInstance Win32_OperatingSystem |
  Select-Object Caption,Version,BuildNumber,
    @{N="RAM Total GB";E={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}},
    @{N="RAM Libre GB";E={[math]::Round($_.FreePhysicalMemory/1MB,2)}} |
  Format-List | Out-String | Out-File $out -Append

"" | Out-File $out -Append
"=== CPU ===" | Out-File $out -Append
Get-CimInstance Win32_Processor |
  Select-Object Name,LoadPercentage |
  Format-List | Out-String | Out-File $out -Append

"" | Out-File $out -Append
"=== GAME MODE ===" | Out-File $out -Append
Get-ItemProperty "HKCU:\Software\Microsoft\GameBar" |
  Select-Object AllowAutoGameMode,AutoGameModeEnabled |
  Format-List | Out-String | Out-File $out -Append

"" | Out-File $out -Append
"=== DISCO ===" | Out-File $out -Append
Get-Volume |
  Select-Object DriveLetter,FileSystem,
    @{N="GB Libres";E={[math]::Round($_.SizeRemaining/1GB,1)}} |
  Format-Table | Out-String | Out-File $out -Append

Start-Process notepad.exe $out
EOF

cat > "$WORK/payload/SCALA/GAMING_CENTER.cmd" <<'EOF'
@echo off
title ASHER CALA OS - SCALA Gaming Center
color 0B
:menu
cls
echo ==================================================
echo        ASHER CALA OS - SCALA GAMING CENTER
echo ==================================================
echo 1. Reaplicar perfil gaming
echo 2. Ver RAM y CPU
echo 3. Limpiar temporales de usuario
echo 4. Optimizar unidad
echo 5. Reparar archivos del sistema
echo 6. Diagnostico SCALA
echo 7. Ver dedicatoria
echo 0. Salir
echo.
set /p op=Opcion:
if "%op%"=="1" powershell -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\USER_SCALA.ps1"
if "%op%"=="2" powershell -NoProfile "Get-CimInstance Win32_OperatingSystem ^| Select TotalVisibleMemorySize,FreePhysicalMemory; Get-CimInstance Win32_Processor ^| Select Name,LoadPercentage"
if "%op%"=="3" del /q /f "%TEMP%\*" 2>nul
if "%op%"=="4" defrag C: /O
if "%op%"=="5" sfc /scannow
if "%op%"=="6" powershell -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\DIAGNOSTICO.ps1"
if "%op%"=="7" notepad "C:\SCALA\DEDICATORIA.txt"
if "%op%"=="0" exit
pause
goto menu
EOF

cat > "$WORK/payload/SetupScripts/SetupComplete.cmd" <<'EOF'
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\SYSTEM_SCALA.ps1"
exit /b 0
EOF

mkdir -p "$WORK/payload/SCALA/ASHERIMAGENES"
if [ -d "$IMGDIR" ]; then
  while IFS= read -r -d '' f; do
    cp -f "$f" "$WORK/payload/SCALA/ASHERIMAGENES/"
  done < <(find "$IMGDIR" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.bmp' \) -print0 | sort -z | head -z -n 5)
fi

IMG_COUNT="$(find "$WORK/payload/SCALA/ASHERIMAGENES" -maxdepth 1 -type f | wc -l)"
echo "Imagenes ASHER integradas: $IMG_COUNT"

cat > "$UPDATE_CMDS" <<EOF
add "$WORK/payload/SCALA" /SCALA
add "$WORK/payload/SetupScripts/SetupComplete.cmd" /Windows/Setup/Scripts/SetupComplete.cmd
EOF

echo
echo "[7/12] Integrando SCALA dentro de TODAS las imagenes Windows..."

# Si el contenedor WIM/ESD trae bandera interna de solo lectura, lo reexportamos
# una sola vez a un archivo nuevo totalmente escribible.
TEST_COPY="$WORK/test-write.esd"
rm -f "$TEST_COPY"
if ! wimlib-imagex update "$ESD" 1 --check < "$UPDATE_CMDS"; then
  echo "La imagen original esta marcada como solo lectura. Creando copia WIM/ESD escribible..."
  WRITABLE="$WORK/install-writable.esd"
  rm -f "$WRITABLE"

  if [ "$IMAGE_COUNT" -eq 1 ]; then
    case "${ISO_INSTALL,,}" in
      *.esd|*.esd\;*)
        wimlib-imagex export "$ESD" 1 "$WRITABLE" --compress=LZMS --solid --check
        ;;
      *.wim|*.wim\;*)
        wimlib-imagex export "$ESD" 1 "$WRITABLE" --compress=LZX --check
        ;;
    esac
  else
    for i in $(seq 1 "$IMAGE_COUNT"); do
      if [ "$i" -eq 1 ]; then
        case "${ISO_INSTALL,,}" in
          *.esd|*.esd\;*)
            wimlib-imagex export "$ESD" "$i" "$WRITABLE" --compress=LZMS --solid --check
            ;;
          *.wim|*.wim\;*)
            wimlib-imagex export "$ESD" "$i" "$WRITABLE" --compress=LZX --check
            ;;
        esac
      else
        wimlib-imagex export "$ESD" "$i" "$WRITABLE" --check
      fi
    done
  fi

  mv "$WRITABLE" "$ESD"
  chmod u+rw "$ESD"
  wimlib-imagex verify "$ESD"

  # La prueba anterior no se aplico; ahora integramos desde cero.
  for i in $(seq 1 "$IMAGE_COUNT"); do
    echo "  -> Imagen $i/$IMAGE_COUNT"
    wimlib-imagex update "$ESD" "$i" --check < "$UPDATE_CMDS"
  done
else
  echo "  -> Imagen 1/$IMAGE_COUNT"
  # La imagen 1 ya fue modificada por la prueba exitosa.
  if [ "$IMAGE_COUNT" -gt 1 ]; then
    for i in $(seq 2 "$IMAGE_COUNT"); do
      echo "  -> Imagen $i/$IMAGE_COUNT"
      wimlib-imagex update "$ESD" "$i" --check < "$UPDATE_CMDS"
    done
  fi
fi

echo
echo "[8/12] Recomprimiendo imagen Windows sin cambiar su tipo logico..."
case "${ISO_INSTALL,,}" in
  *.esd|*.esd\;*)
    wimlib-imagex optimize "$ESD" --solid --solid-compress=LZMS:80 --solid-chunk-size=64M --threads=1 --check
    ;;
  *.wim|*.wim\;*)
    wimlib-imagex optimize "$ESD" --recompress --compress=LZX:80 --threads=1 --check
    ;;
  *)
    fail "Formato de imagen Windows no reconocido: $ISO_INSTALL"
    ;;
esac
wimlib-imagex verify "$ESD"

NEW_SIZE="$(stat -c '%s' "$ESD")"
if [ "$NEW_SIZE" -gt "$ISO_ESD_SIZE" ]; then
  echo "La imagen aun supera el espacio original. Reintentando compresion maxima..."
  case "${ISO_INSTALL,,}" in
    *.esd|*.esd\;*)
      wimlib-imagex optimize "$ESD" --solid --solid-compress=LZMS:100 --solid-chunk-size=64M --threads=1 --check
      ;;
    *.wim|*.wim\;*)
      wimlib-imagex optimize "$ESD" --recompress --compress=LZX:100 --threads=1 --check
      ;;
  esac
  wimlib-imagex verify "$ESD"
  NEW_SIZE="$(stat -c '%s' "$ESD")"
fi

[ "$NEW_SIZE" -le "$ISO_ESD_SIZE" ] || fail "El ESD personalizado no cabe sin modificar la estructura de arranque. Original=$ISO_ESD_SIZE Nuevo=$NEW_SIZE. Se cancela por seguridad."
echo "ESD PERSONALIZADO: OK ($NEW_SIZE bytes)"

echo
echo "[9/12] Preparando ESD al MISMO tamano fisico..."
cp "$ESD" "$PADDED"
truncate -s "$ISO_ESD_SIZE" "$PADDED"
PAD_SIZE="$(stat -c '%s' "$PADDED")"
[ "$PAD_SIZE" -eq "$ISO_ESD_SIZE" ] || fail "No se pudo igualar el tamano fisico del ESD."
wimlib-imagex verify "$PADDED" || fail "El ESD con relleno no pasa verificacion WIM."
echo "ESD MISMO TAMANO: OK"

echo
echo "[10/12] Creando ISO final sin reconstruir UDF/ISO9660..."
rm -f "$OUT" "$OUT.tmp"
cp --reflink=auto "$SRC" "$OUT.tmp"
dd if="$PADDED" of="$OUT.tmp" bs=2048 seek="$LBA" conv=notrunc status=progress
sync

START=$((LBA * 2048))
END=$((START + ISO_ESD_SIZE))
cmp -n "$START" "$SRC" "$OUT.tmp" >/dev/null || fail "Se alteraron bytes antes de install.esd."
cmp -i "$END:$END" "$SRC" "$OUT.tmp" >/dev/null || fail "Se alteraron bytes despues de la imagen Windows."
echo "ESTRUCTURA EXTERNA: IDENTICA"

# Ya estan escritos dentro de la ISO. Liberamos espacio antes de la validacion final.
rm -f "$PADDED" "$ESD"

echo
echo "[11/12] Validando BIOS/UEFI/El Torito, ISO9660 y UDF..."
xorriso -indev "$SRC" -report_el_torito plain 2>/dev/null | sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$ELT_SRC"
xorriso -indev "$OUT.tmp" -report_el_torito plain 2>/dev/null | sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$ELT_OUT"
cmp "$ELT_SRC" "$ELT_OUT" >/dev/null || fail "La configuracion El Torito no coincide con la original."

xorriso -osirrox on -indev "$OUT.tmp" -extract "$ISO_INSTALL" "$CHECK_ESD" >/dev/null 2>&1
[ -f "$CHECK_ESD" ] || fail "No se pudo extraer install.esd de la ISO final."
[ "$(stat -c '%s' "$CHECK_ESD")" -eq "$ISO_ESD_SIZE" ] || fail "Tamano install.esd final incorrecto."
wimlib-imagex verify "$CHECK_ESD"

for i in $(seq 1 "$IMAGE_COUNT"); do
  wimlib-imagex dir "$CHECK_ESD" "$i" --path=/SCALA/DEDICATORIA.txt >/dev/null
  wimlib-imagex dir "$CHECK_ESD" "$i" --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null
done

# Verificacion REAL de la vista UDF, que es critica para Windows/Ventoy.
UDF_MNT="$WORK/udf-mount"
mkdir -p "$UDF_MNT"
sudo mount -t udf -o loop,ro "$OUT.tmp" "$UDF_MNT" 2>/dev/null || fail "La ISO final no pudo montarse como UDF."

UDF_INSTALL="$(find "$UDF_MNT" -maxdepth 3 -type f \( -iname 'install.esd' -o -iname 'install.wim' \) -print | grep -i '/sources/' | head -n1 || true)"
[ -n "$UDF_INSTALL" ] || fail "UDF no expone install.esd/install.wim en SOURCES."

wimlib-imagex verify "$UDF_INSTALL" >/dev/null
for i in $(seq 1 "$IMAGE_COUNT"); do
  wimlib-imagex dir "$UDF_INSTALL" "$i" --path=/SCALA/DEDICATORIA.txt >/dev/null
  wimlib-imagex dir "$UDF_INSTALL" "$i" --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null
done

sudo umount "$UDF_MNT"
echo "UDF WINDOWS: OK"

mv "$OUT.tmp" "$OUT"

echo
echo "[12/12] Hash final..."
FINAL_SHA="$(sha256sum "$OUT" | awk '{print $1}')"
FINAL_SIZE="$(stat -c '%s' "$OUT")"

echo
echo "============================================================"
echo " ASHER CALA OS v1.2 FINAL BOOTFIX CREADO"
echo "============================================================"
echo "ISO      : $OUT"
echo "TAMANO   : $FINAL_SIZE bytes"
echo "SHA-256  : $FINAL_SHA"
echo
echo "VALIDACIONES:"
echo " - MiniOS fuente SHA: OK"
echo " - UDF/ISO metadata: NO RECONSTRUIDA"
echo " - BIOS/UEFI/El Torito: IDENTICOS A LA ORIGINAL"
echo " - ISO9660 fuera de la imagen Windows: IDENTICO"
echo " - UDF: MONTADO Y VERIFICADO"
echo " - Imagen Windows sustituida en su MISMO LBA"
echo " - WIM/ESD: VERIFY OK"
echo " - SCALA presente en todas las imagenes Windows"
echo " - SetupComplete presente en todas las imagenes"
echo "============================================================"
echo "LISTO PARA COPIAR A VENTOY Y HACER PRUEBA FISICA."
echo "============================================================"

rm -rf "$WORK"
trap - EXIT
