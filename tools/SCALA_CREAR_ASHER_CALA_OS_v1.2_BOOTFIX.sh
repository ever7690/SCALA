#!/usr/bin/env bash
set -Eeuo pipefail

SRC="$HOME/Descargas/MiniOS11 X-24H2 v26.06 x64.iso"
OUT="$HOME/Descargas/ASHER_CALA_OS_SCALA_GAMING_v1.2_FINAL_BOOTFIX_x64.iso"
IMGDIR="$HOME/Escritorio/ASHERIMAGENES"
WORK="$HOME/.cache/scala-asher-v12-bootfix"
ORIGINAL_SHA="798325928641854d3214e3d565eeb29088288334f66b51d83f907ab0561f6eb1"
ISO_ESD="/sources/install.esd"

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
echo "[3/12] Instalando/verificando herramientas..."
sudo apt-get update
sudo apt-get install -y xorriso wimtools coreutils
command -v xorriso >/dev/null || fail "xorriso no disponible."
command -v wimlib-imagex >/dev/null || fail "wimlib-imagex no disponible."

rm -rf "$WORK"
mkdir -p "$WORK/payload/SCALA" "$WORK/payload/SetupScripts"

ESD="$WORK/install.esd"
PADDED="$WORK/install.padded.esd"
CHECK_ESD="$WORK/install.check.esd"
UPDATE_CMDS="$WORK/update.txt"
ELT_SRC="$WORK/eltorito.src.txt"
ELT_OUT="$WORK/eltorito.out.txt"

echo
echo "[4/12] Localizando install.esd sin alterar la ISO..."
REPORT="$(xorriso -indev "$SRC" -find "$ISO_ESD" -exec report_lba -- 2>/dev/null || true)"
LINE="$(printf '%s\n' "$REPORT" | grep "File data lba:" | grep "'$ISO_ESD'" | head -n1 || true)"
[ -n "$LINE" ] || fail "No pude localizar $ISO_ESD en la ISO original."

LBA="$(printf '%s\n' "$LINE" | awk -F',' '{gsub(/[[:space:]]/,"",$2); print $2}')"
ISO_ESD_SIZE="$(printf '%s\n' "$LINE" | awk -F',' '{gsub(/[[:space:]]/,"",$4); print $4}')"

[[ "$LBA" =~ ^[0-9]+$ ]] || fail "LBA invalido: $LBA"
[[ "$ISO_ESD_SIZE" =~ ^[0-9]+$ ]] || fail "Tamano ESD invalido: $ISO_ESD_SIZE"

echo "install.esd LBA   : $LBA"
echo "install.esd bytes : $ISO_ESD_SIZE"

xorriso -osirrox on -indev "$SRC" -extract "$ISO_ESD" "$ESD" >/dev/null 2>&1
[ -f "$ESD" ] || fail "No se pudo extraer install.esd."
EXTRACTED_SIZE="$(stat -c '%s' "$ESD")"
[ "$EXTRACTED_SIZE" -eq "$ISO_ESD_SIZE" ] || fail "Tamano extraido no coincide con el registrado en la ISO."
echo "EXTRACCION ESD: OK"

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
for i in $(seq 1 "$IMAGE_COUNT"); do
  echo "  -> Imagen $i/$IMAGE_COUNT"
  wimlib-imagex update "$ESD" "$i" --check < "$UPDATE_CMDS"
done

echo
echo "[8/12] Recomprimiendo ESD en modo Microsoft-compatible..."
wimlib-imagex optimize "$ESD" --solid --solid-compress=LZMS:80 --solid-chunk-size=64M --threads=1 --check
wimlib-imagex verify "$ESD"

NEW_SIZE="$(stat -c '%s' "$ESD")"
if [ "$NEW_SIZE" -gt "$ISO_ESD_SIZE" ]; then
  echo "ESD aun mayor que el espacio original. Reintentando compresion maxima..."
  wimlib-imagex optimize "$ESD" --solid --solid-compress=LZMS:100 --solid-chunk-size=64M --threads=1 --check
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
cmp -i "$END:$END" "$SRC" "$OUT.tmp" >/dev/null || fail "Se alteraron bytes despues de install.esd."
echo "ESTRUCTURA EXTERNA: IDENTICA"

echo
echo "[11/12] Validando BIOS/UEFI/El Torito y ESD final..."
xorriso -indev "$SRC" -report_el_torito plain 2>/dev/null | sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$ELT_SRC"
xorriso -indev "$OUT.tmp" -report_el_torito plain 2>/dev/null | sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$ELT_OUT"
cmp "$ELT_SRC" "$ELT_OUT" >/dev/null || fail "La configuracion El Torito no coincide con la original."

xorriso -osirrox on -indev "$OUT.tmp" -extract "$ISO_ESD" "$CHECK_ESD" >/dev/null 2>&1
[ -f "$CHECK_ESD" ] || fail "No se pudo extraer install.esd de la ISO final."
[ "$(stat -c '%s' "$CHECK_ESD")" -eq "$ISO_ESD_SIZE" ] || fail "Tamano install.esd final incorrecto."
wimlib-imagex verify "$CHECK_ESD"

for i in $(seq 1 "$IMAGE_COUNT"); do
  wimlib-imagex dir "$CHECK_ESD" "$i" --path=/SCALA/DEDICATORIA.txt >/dev/null
  wimlib-imagex dir "$CHECK_ESD" "$i" --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null
done

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
echo " - Solo install.esd fue sustituido en su MISMO LBA"
echo " - install.esd: WIM VERIFY OK"
echo " - SCALA presente en todas las imagenes Windows"
echo " - SetupComplete presente en todas las imagenes"
echo "============================================================"
echo "LISTO PARA COPIAR A VENTOY Y HACER PRUEBA FISICA."
echo "============================================================"

rm -rf "$WORK"
trap - EXIT
