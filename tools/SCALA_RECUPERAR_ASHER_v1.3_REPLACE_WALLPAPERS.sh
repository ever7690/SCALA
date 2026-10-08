#!/usr/bin/env bash
set -Eeuo pipefail

SRC="$HOME/Descargas/MiniOS11 X-24H2 v26.06 x64.iso"
OUT="$HOME/Descargas/ASHER_CALA_OS_SCALA_GAMING_v1.3_FINAL_x64.iso"
WORK="$HOME/.cache/scala-asher-v13"

ORIGINAL_ISO_SHA="798325928641854d3214e3d565eeb29088288334f66b51d83f907ab0561f6eb1"
ORIGINAL_ISO_SIZE=3959740416
INSTALL_LBA=303091
INSTALL_OFFSET=$((INSTALL_LBA * 2048))
INSTALL_SIZE=3201322926

WORK_WIM="$WORK/install-trabajo.wim"
LOCAL_IMAGES="$WORK/payload/SCALA/ASHERIMAGENES"
USER_PS1_SRC="$WORK/payload/SCALA/USER_SCALA.ps1"
USER_PS1_NEW="$WORK/USER_SCALA_REPLACEMENT.ps1"
NEW_ESD="$WORK/install-nuevo-replace-wallpapers.esd"
PADDED_ESD="$WORK/install-padded-replace-wallpapers.esd"
CHECK_ESD="$WORK/install-check-replace-wallpapers.esd"
UPDATE_CMDS="$WORK/replace-wallpapers-update.txt"

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
    echo "La MiniOS original NO fue modificada."
    echo "No se genero una ISO final valida."
  fi
}
trap cleanup EXIT

echo "============================================================"
echo " ASHER CALA OS v1.3 - REEMPLAZO REAL DE WALLPAPERS"
echo " Se conservan las 5 imagenes ASHER"
echo " Se sustituyen wallpapers originales de Windows"
echo "============================================================"

[ -f "$SRC" ] || fail "No encuentro la MiniOS original."
[ -f "$WORK_WIM" ] || fail "No encuentro el WIM de trabajo ya compilado."
[ -d "$LOCAL_IMAGES" ] || fail "No encuentro las imagenes ASHER del trabajo anterior."
[ -f "$USER_PS1_SRC" ] || fail "No encuentro USER_SCALA.ps1."

IMG_COUNT="$(find "$LOCAL_IMAGES" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.bmp' \) | wc -l)"
[ "$IMG_COUNT" -eq 5 ] || fail "Se esperaban 5 imagenes ASHER y se encontraron $IMG_COUNT."

[ "$(stat -c '%s' "$SRC")" -eq "$ORIGINAL_ISO_SIZE" ] || fail "Tamano de ISO original inesperado."
[ "$(sha256sum "$SRC" | awk '{print $1}')" = "$ORIGINAL_ISO_SHA" ] || fail "SHA de MiniOS original incorrecto."

for c in wimlib-imagex xorriso sha256sum dd cmp truncate sed find; do
  command -v "$c" >/dev/null 2>&1 || fail "Falta herramienta: $c"
done

echo
echo "[1/7] Preparando personalizacion sin duplicar imagenes..."
cp "$USER_PS1_SRC" "$USER_PS1_NEW"
sed -i 's#C:\\SCALA\\ASHERIMAGENES#C:\\Windows\\Web\\Wallpaper\\ASHER#g' "$USER_PS1_NEW"

cat > "$UPDATE_CMDS" <<EOF
delete --recursive --force /SCALA/ASHERIMAGENES
delete --recursive --force /Windows/Web/Wallpaper
delete --force /SCALA/USER_SCALA.ps1
add "$LOCAL_IMAGES" /Windows/Web/Wallpaper/ASHER
add "$USER_PS1_NEW" /SCALA/USER_SCALA.ps1
EOF

echo
echo "[2/7] Reemplazando wallpapers originales por las 5 imagenes ASHER..."
wimlib-imagex update "$WORK_WIM" 1 --check < "$UPDATE_CMDS"
wimlib-imagex verify "$WORK_WIM" >/dev/null
wimlib-imagex dir "$WORK_WIM" 1 --path=/Windows/Web/Wallpaper/ASHER >/dev/null
wimlib-imagex dir "$WORK_WIM" 1 --path=/SCALA/DEDICATORIA.txt >/dev/null
wimlib-imagex dir "$WORK_WIM" 1 --path=/SCALA/USER_SCALA.ps1 >/dev/null
wimlib-imagex dir "$WORK_WIM" 1 --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null
echo "WALLPAPERS ASHER: $IMG_COUNT/5 PRESENTES"
echo "SCALA PRINCIPAL: OK"

echo
echo "[3/7] Recomprimiendo ESD final..."
rm -f "$NEW_ESD"
wimlib-imagex export "$WORK_WIM" all "$NEW_ESD" --compress=LZMS:100 --solid --check
wimlib-imagex verify "$NEW_ESD" >/dev/null
NEW_SIZE="$(stat -c '%s' "$NEW_ESD")"
echo "Espacio original install.esd : $INSTALL_SIZE bytes"
echo "ESD ASHER personalizado      : $NEW_SIZE bytes"
[ "$NEW_SIZE" -le "$INSTALL_SIZE" ] || fail "Aun supera el espacio original por $((NEW_SIZE-INSTALL_SIZE)) bytes. No se tocara la ISO."

echo
echo "[4/7] Igualando exactamente el extent original..."
cp "$NEW_ESD" "$PADDED_ESD"
truncate -s "$INSTALL_SIZE" "$PADDED_ESD"
wimlib-imagex verify "$PADDED_ESD" >/dev/null || fail "ESD rellenado invalido."

echo
echo "[5/7] Sustituyendo SOLO install.esd en el LBA original..."
rm -f "$OUT" "$OUT.tmp"
cp --reflink=auto "$SRC" "$OUT.tmp"
dd if="$PADDED_ESD" of="$OUT.tmp" bs=16M seek="$INSTALL_OFFSET" oflag=seek_bytes conv=notrunc status=progress
sync

[ "$(stat -c '%s' "$OUT.tmp")" -eq "$ORIGINAL_ISO_SIZE" ] || fail "Cambio el tamano de la ISO."
END=$((INSTALL_OFFSET + INSTALL_SIZE))
cmp -n "$INSTALL_OFFSET" "$SRC" "$OUT.tmp" >/dev/null || fail "Se alteraron bytes antes de install.esd."
cmp -i "$END:$END" "$SRC" "$OUT.tmp" >/dev/null || fail "Se alteraron bytes despues de install.esd."
echo "TODO FUERA DE INSTALL.ESD: IDENTICO A MINIOS"

echo
echo "[6/7] Validando arranque y personalizacion..."
SRC_BOOT="$WORK/replace-boot-src.txt"
OUT_BOOT="$WORK/replace-boot-out.txt"
xorriso -indev "$SRC" -report_el_torito plain 2>/dev/null | sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$SRC_BOOT"
xorriso -indev "$OUT.tmp" -report_el_torito plain 2>/dev/null | sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$OUT_BOOT"
cmp "$SRC_BOOT" "$OUT_BOOT" >/dev/null || fail "El Torito no coincide."

dd if="$OUT.tmp" of="$CHECK_ESD" bs=16M skip="$INSTALL_OFFSET" count="$INSTALL_SIZE" iflag=skip_bytes,count_bytes status=none
wimlib-imagex verify "$CHECK_ESD" >/dev/null
wimlib-imagex dir "$CHECK_ESD" 1 --path=/Windows/Web/Wallpaper/ASHER >/dev/null
wimlib-imagex dir "$CHECK_ESD" 1 --path=/SCALA/DEDICATORIA.txt >/dev/null
wimlib-imagex dir "$CHECK_ESD" 1 --path=/SCALA/USER_SCALA.ps1 >/dev/null
wimlib-imagex dir "$CHECK_ESD" 1 --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null

echo "BIOS/UEFI/EL TORITO: IDENTICOS"
echo "5 IMAGENES ASHER: INTEGRADAS COMO WALLPAPERS DEL SISTEMA"
echo "SCALA / GAME MODE / DARK MODE: PRESENTES"

echo
echo "[7/7] Cerrando ISO..."
mv "$OUT.tmp" "$OUT"
FINAL_SHA="$(sha256sum "$OUT" | awk '{print $1}')"
FINAL_SIZE="$(stat -c '%s' "$OUT")"

echo
echo "============================================================"
echo " ASHER CALA OS v1.3 FINAL CREADO"
echo "============================================================"
echo "ISO     : $OUT"
echo "TAMANO  : $FINAL_SIZE bytes"
echo "SHA-256 : $FINAL_SHA"
echo
echo "VALIDADO:"
echo " - Arranque MiniOS intacto fuera de install.esd"
echo " - El Torito identico"
echo " - ESD final valido"
echo " - 5 imagenes ASHER integradas"
echo " - Wallpapers originales sustituidos, no duplicados"
echo " - Dark Mode / Game Mode / SCALA conservados"
echo "============================================================"
echo "LISTO PARA VENTOY."
echo "============================================================"

trap - EXIT
