#!/usr/bin/env bash
set -Eeuo pipefail

SRC="$HOME/Descargas/MiniOS11 X-24H2 v26.06 x64.iso"
OUT="$HOME/Descargas/ASHER_CALA_OS_SCALA_GAMING_v1.3_FINAL_x64.iso"
IMGDIR="$HOME/Escritorio/ASHERIMAGENES"
WORK="$HOME/.cache/scala-asher-v13"

ORIGINAL_ISO_SHA="798325928641854d3214e3d565eeb29088288334f66b51d83f907ab0561f6eb1"
ORIGINAL_ISO_SIZE=3959740416
INSTALL_LBA=303091
INSTALL_OFFSET=$((INSTALL_LBA * 2048))
INSTALL_SIZE=3201322926
ORIGINAL_INSTALL_SHA="77668ca0242b42056c9458482da61c01469cb8528c14744e20888f476b3c8a69"

fail() {
  echo
  echo "============================================================"
  echo " ERROR SCALA"
  echo " $*"
  echo "============================================================"
  exit 1
}

cleanup() {
  rc=$?
  if [ "$rc" -ne 0 ]; then
    rm -f "$OUT.tmp" 2>/dev/null || true
    echo
    echo "La MiniOS original NO fue modificada."
    echo "No se genero una ISO final valida."
  fi
}
trap cleanup EXIT

echo "============================================================"
echo " ASHER CALA OS - SCALA GAMING v1.3 FINAL"
echo " METODO: ARRANQUE ORIGINAL INTACTO / SOLO INSTALL.ESD"
echo "============================================================"

[ -f "$SRC" ] || fail "No encuentro: $SRC"

echo "[1/10] Verificando MiniOS original..."
[ "$(stat -c '%s' "$SRC")" -eq "$ORIGINAL_ISO_SIZE" ] || fail "Tamano de ISO original inesperado."
SRC_SHA="$(sha256sum "$SRC" | awk '{print $1}')"
[ "$SRC_SHA" = "$ORIGINAL_ISO_SHA" ] || fail "SHA-256 de la MiniOS original no coincide."
echo "ISO ORIGINAL: OK"

echo
echo "[2/10] Verificando herramientas ya instaladas..."
for c in wimlib-imagex xorriso sha256sum dd cmp truncate; do
  command -v "$c" >/dev/null 2>&1 || fail "Falta herramienta: $c. Instale xorriso y wimtools antes de continuar."
done
echo "HERRAMIENTAS: OK"

echo
echo "[3/10] Preparando espacio de trabajo..."
FREE_KB="$(df -Pk "$HOME" | awk 'NR==2 {print $4}')"
NEED_KB=$((14 * 1024 * 1024))
[ "$FREE_KB" -ge "$NEED_KB" ] || fail "Se requieren al menos 14 GB libres en HOME."
rm -rf "$WORK"
mkdir -p "$WORK/payload/SCALA/ASHERIMAGENES" "$WORK/payload/SetupScripts"

ORIG_ESD="$WORK/install-original.esd"
WORK_WIM="$WORK/install-trabajo.wim"
NEW_ESD="$WORK/install-nuevo.esd"
PADDED_ESD="$WORK/install-padded.esd"
CHECK_ESD="$WORK/install-check.esd"
UPDATE_CMDS="$WORK/update.txt"

echo
echo "[4/10] Extrayendo install.esd por su LBA validado..."
dd if="$SRC" of="$ORIG_ESD" bs=16M skip="$INSTALL_OFFSET" count="$INSTALL_SIZE" iflag=skip_bytes,count_bytes status=progress
[ "$(stat -c '%s' "$ORIG_ESD")" -eq "$INSTALL_SIZE" ] || fail "Extraccion de install.esd incompleta."
ESD_SHA="$(sha256sum "$ORIG_ESD" | awk '{print $1}')"
[ "$ESD_SHA" = "$ORIGINAL_INSTALL_SHA" ] || fail "install.esd extraido no coincide con la base validada."
wimlib-imagex verify "$ORIG_ESD" >/dev/null
IMAGE_COUNT="$(wimlib-imagex info "$ORIG_ESD" | awk -F: '/^Image Count/ {gsub(/[[:space:]]/,"",$2); print $2; exit}')"
[ "$IMAGE_COUNT" = "1" ] || fail "Se esperaba 1 imagen Windows y se encontraron: $IMAGE_COUNT"
echo "INSTALL.ESD ORIGINAL: OK"

echo
echo "[5/10] Creando capa SCALA..."

cat > "$WORK/payload/SCALA/DEDICATORIA.txt" <<'EOF'
ASHER CALA OS - SCALA Gaming Edition

Este sistema operativo va dedicado a mi hijo Asher Cala,
con mucho cariño de su padre Ever Nelson Calamontes,
a su hijo Asher Cala Quilla.
EOF

cat > "$WORK/payload/SCALA/SYSTEM_SCALA.ps1" <<'EOF'
$ErrorActionPreference = "SilentlyContinue"

# Game DVR fuera; Game Mode se fuerza por usuario.
New-Item "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" AllowGameDVR 0 -Type DWord

# Menos contenido promocional, sin quitar Store, Gaming Services, audio, red ni Bluetooth.
New-Item "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" DisableWindowsConsumerFeatures 1 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" DisableTailoredExperiencesWithDiagnosticData 1 -Type DWord

# Telemetria reducida sin tocar servicios esenciales.
New-Item "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" AllowTelemetry 1 -Type DWord

# Edge sin precarga; WebView permanece disponible.
New-Item "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Edge" StartupBoostEnabled 0 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Edge" BackgroundModeEnabled 0 -Type DWord

# Defender permanece habilitado; limitar CPU de escaneos.
New-Item "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Scan" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Scan" AvgCPULoadFactor 20 -Type DWord

# Perfil multimedia estable para juegos.
New-Item "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" SystemResponsiveness 10 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" NetworkThrottlingIndex 0xffffffff -Type DWord
New-Item "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" "GPU Priority" 8 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" Priority 6 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" "Scheduling Category" "High"
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games" "SFIO Priority" "High"

# Alto rendimiento si existe; si no, Windows conserva su plan actual.
powercfg /S SCHEME_MIN | Out-Null

# Primera sesion: ajustes de usuario.
New-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" -Force | Out-Null
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" "SCALA First Logon" 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\USER_SCALA.ps1"'

# Mantenimiento semanal seguro.
schtasks /Create /F /SC WEEKLY /D SUN /ST 03:00 /TN "SCALA Maintenance" /TR 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\MAINTAIN_SCALA.ps1"' /RU SYSTEM | Out-Null
exit 0
EOF

cat > "$WORK/payload/SCALA/USER_SCALA.ps1" <<'EOF'
$ErrorActionPreference = "SilentlyContinue"

# Game Mode ON / Game DVR OFF.
New-Item "HKCU:\Software\Microsoft\GameBar" -Force | Out-Null
Set-ItemProperty "HKCU:\Software\Microsoft\GameBar" AllowAutoGameMode 1 -Type DWord
Set-ItemProperty "HKCU:\Software\Microsoft\GameBar" AutoGameModeEnabled 1 -Type DWord
New-Item "HKCU:\System\GameConfigStore" -Force | Out-Null
Set-ItemProperty "HKCU:\System\GameConfigStore" GameDVR_Enabled 0 -Type DWord

# Tema oscuro, sin transparencia.
New-Item "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Force | Out-Null
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" AppsUseLightTheme 0 -Type DWord
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" SystemUsesLightTheme 0 -Type DWord
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" EnableTransparency 0 -Type DWord

# Menos widgets/sugerencias.
New-Item "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Force | Out-Null
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" TaskbarDa 0 -Type DWord
New-Item "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Force | Out-Null
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" SystemPaneSuggestionsEnabled 0 -Type DWord

# Menu contextual clasico.
New-Item "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" -Force | Out-Null
Set-ItemProperty "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" "(default)" ""

# Fondo ASHER.
$img = Get-ChildItem "C:\SCALA\ASHERIMAGENES" -File -ErrorAction SilentlyContinue |
       Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|bmp)$' } |
       Select-Object -First 1
if ($img) {
    Set-ItemProperty "HKCU:\Control Panel\Desktop" Wallpaper $img.FullName
    rundll32.exe user32.dll,UpdatePerUserSystemParameters
}

# Acceso al Gaming Center.
$desk = [Environment]::GetFolderPath("Desktop")
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$desk\SCALA Gaming Center.lnk")
$lnk.TargetPath = "C:\SCALA\GAMING_CENTER.cmd"
$lnk.WorkingDirectory = "C:\SCALA"
$lnk.Save()
exit 0
EOF

cat > "$WORK/payload/SCALA/MAINTAIN_SCALA.ps1" <<'EOF'
$ErrorActionPreference = "SilentlyContinue"
Get-ChildItem "$env:WINDIR\Temp" -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
Get-ChildItem "$env:TEMP" -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
defrag C: /O | Out-Null
exit 0
EOF

cat > "$WORK/payload/SCALA/DIAGNOSTICO.ps1" <<'EOF'
$ErrorActionPreference = "SilentlyContinue"
$out = "$env:USERPROFILE\Desktop\SCALA_DIAGNOSTICO.txt"
"ASHER CALA OS - DIAGNOSTICO SCALA" | Out-File $out
"Fecha: $(Get-Date)" | Out-File $out -Append
Get-CimInstance Win32_OperatingSystem | Select Caption,Version,BuildNumber,@{N="RAM Total GB";E={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}},@{N="RAM Libre GB";E={[math]::Round($_.FreePhysicalMemory/1MB,2)}} | Format-List | Out-String | Out-File $out -Append
Get-CimInstance Win32_Processor | Select Name,LoadPercentage | Format-List | Out-String | Out-File $out -Append
"Procesos activos: $((Get-Process).Count)" | Out-File $out -Append
Get-ItemProperty "HKCU:\Software\Microsoft\GameBar" | Select AllowAutoGameMode,AutoGameModeEnabled | Format-List | Out-String | Out-File $out -Append
Get-Volume | Select DriveLetter,FileSystem,@{N="GB Libres";E={[math]::Round($_.SizeRemaining/1GB,1)}} | Format-Table | Out-String | Out-File $out -Append
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
echo 3. Limpiar temporales
echo 4. Optimizar unidad
echo 5. Reparar archivos del sistema
echo 6. Diagnostico SCALA
echo 7. Ver dedicatoria
echo 0. Salir
echo.
set /p op=Opcion:
if "%op%"=="1" powershell -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\USER_SCALA.ps1"
if "%op%"=="2" powershell -NoProfile "Get-CimInstance Win32_OperatingSystem ^| Select TotalVisibleMemorySize,FreePhysicalMemory; Get-CimInstance Win32_Processor ^| Select Name,LoadPercentage"
if "%op%"=="3" powershell -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\MAINTAIN_SCALA.ps1"
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

if [ -d "$IMGDIR" ]; then
  while IFS= read -r -d '' f; do
    cp -f "$f" "$WORK/payload/SCALA/ASHERIMAGENES/"
  done < <(find "$IMGDIR" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.bmp' \) -print0 | sort -z | head -z -n 5)
fi
IMG_COUNT="$(find "$WORK/payload/SCALA/ASHERIMAGENES" -maxdepth 1 -type f | wc -l)"
[ "$IMG_COUNT" -ge 1 ] || fail "No se encontraron imagenes en $IMGDIR"
echo "IMAGENES ASHER: $IMG_COUNT"

cat > "$UPDATE_CMDS" <<EOF
add "$WORK/payload/SCALA" /SCALA
add "$WORK/payload/SetupScripts/SetupComplete.cmd" /Windows/Setup/Scripts/SetupComplete.cmd
EOF

echo
echo "[6/10] Convirtiendo ESD solido a WIM escribible..."
rm -f "$WORK_WIM"
wimlib-imagex export "$ORIG_ESD" all "$WORK_WIM" --compress=LZX --check
wimlib-imagex verify "$WORK_WIM" >/dev/null
wimlib-imagex update "$WORK_WIM" 1 --check < "$UPDATE_CMDS"
wimlib-imagex verify "$WORK_WIM" >/dev/null
wimlib-imagex dir "$WORK_WIM" 1 --path=/SCALA/DEDICATORIA.txt >/dev/null
wimlib-imagex dir "$WORK_WIM" 1 --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null
echo "WIM ESCRIBIBLE + SCALA: OK"

echo
echo "[7/10] Recomprimiendo a ESD LZMS solido..."
rm -f "$NEW_ESD"
wimlib-imagex export "$WORK_WIM" all "$NEW_ESD" --compress=LZMS:100 --solid --check
wimlib-imagex verify "$NEW_ESD" >/dev/null
NEW_SIZE="$(stat -c '%s' "$NEW_ESD")"
[ "$NEW_SIZE" -le "$INSTALL_SIZE" ] || fail "El ESD personalizado no cabe en el espacio original. Original=$INSTALL_SIZE Nuevo=$NEW_SIZE"
cp "$NEW_ESD" "$PADDED_ESD"
truncate -s "$INSTALL_SIZE" "$PADDED_ESD"
[ "$(stat -c '%s' "$PADDED_ESD")" -eq "$INSTALL_SIZE" ] || fail "No se pudo igualar el tamano del ESD."
wimlib-imagex verify "$PADDED_ESD" >/dev/null || fail "El ESD rellenado no es valido."
echo "ESD FINAL: OK ($NEW_SIZE bytes; extent conservado $INSTALL_SIZE)"

echo
echo "[8/10] Creando ISO sin reconstruir UDF, ISO9660 ni El Torito..."
rm -f "$OUT" "$OUT.tmp"
cp --reflink=auto "$SRC" "$OUT.tmp"
dd if="$PADDED_ESD" of="$OUT.tmp" bs=16M seek="$INSTALL_OFFSET" oflag=seek_bytes conv=notrunc status=progress
sync
[ "$(stat -c '%s' "$OUT.tmp")" -eq "$ORIGINAL_ISO_SIZE" ] || fail "El tamano de la ISO cambio."

END=$((INSTALL_OFFSET + INSTALL_SIZE))
cmp -n "$INSTALL_OFFSET" "$SRC" "$OUT.tmp" >/dev/null || fail "Cambio inesperado antes de install.esd."
cmp -i "$END:$END" "$SRC" "$OUT.tmp" >/dev/null || fail "Cambio inesperado despues de install.esd."
echo "TODOS LOS BYTES FUERA DE INSTALL.ESD: IDENTICOS"

echo
echo "[9/10] Validando arranque y ESD dentro de la ISO final..."
SRC_BOOT="$WORK/boot-src.txt"
OUT_BOOT="$WORK/boot-out.txt"
xorriso -indev "$SRC" -report_el_torito plain 2>/dev/null | sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$SRC_BOOT"
xorriso -indev "$OUT.tmp" -report_el_torito plain 2>/dev/null | sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$OUT_BOOT"
cmp "$SRC_BOOT" "$OUT_BOOT" >/dev/null || fail "El Torito cambio."

dd if="$OUT.tmp" of="$CHECK_ESD" bs=16M skip="$INSTALL_OFFSET" count="$INSTALL_SIZE" iflag=skip_bytes,count_bytes status=none
[ "$(stat -c '%s' "$CHECK_ESD")" -eq "$INSTALL_SIZE" ] || fail "No se pudo reextraer install.esd final."
wimlib-imagex verify "$CHECK_ESD" >/dev/null
wimlib-imagex dir "$CHECK_ESD" 1 --path=/SCALA/DEDICATORIA.txt >/dev/null
wimlib-imagex dir "$CHECK_ESD" 1 --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null
echo "BIOS/UEFI/EL TORITO: IDENTICOS"
echo "UDF/ISO9660: METADATOS ORIGINALES INTACTOS"
echo "INSTALL.ESD FINAL: VERIFY OK"

echo
echo "[10/10] Cerrando ISO..."
mv "$OUT.tmp" "$OUT"
FINAL_SHA="$(sha256sum "$OUT" | awk '{print $1}')"
FINAL_SIZE="$(stat -c '%s' "$OUT")"

echo
echo "============================================================"
echo " ASHER CALA OS SCALA GAMING v1.3 FINAL CREADO"
echo "============================================================"
echo "ISO     : $OUT"
echo "TAMANO  : $FINAL_SIZE bytes"
echo "SHA-256 : $FINAL_SHA"
echo
echo "VALIDADO:"
echo " - Base MiniOS exacta"
echo " - install.esd original exacto antes de editar"
echo " - Solo install.esd modificado"
echo " - UDF original intacto"
echo " - ISO9660 original intacto fuera del ESD"
echo " - BIOS/UEFI/El Torito identicos"
echo " - ESD final verificado"
echo " - SCALA y SetupComplete presentes"
echo "============================================================"
echo "LISTO PARA VENTOY Y PRUEBA FISICA."
echo "============================================================"

rm -rf "$WORK"
trap - EXIT
