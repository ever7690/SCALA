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
NEW_ESD="$WORK/install-nuevo-fit.esd"
PADDED_ESD="$WORK/install-padded-fit.esd"
CHECK_ESD="$WORK/install-check-fit.esd"

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
    echo "No se genero una ISO final valida."
  fi
}
trap cleanup EXIT

echo "============================================================"
echo " ASHER CALA OS v1.3 - RECUPERACION SIN RECOMPILAR DESDE CERO"
echo " OBJETIVO: HACER CABER EL ESD SIN TOCAR EL ARRANQUE"
echo "============================================================"

[ -f "$SRC" ] || fail "No encuentro la MiniOS original."
[ -f "$WORK_WIM" ] || fail "No encuentro el WIM de trabajo ya compilado. No se puede reanudar."

[ "$(stat -c '%s' "$SRC")" -eq "$ORIGINAL_ISO_SIZE" ] || fail "Tamano de ISO original inesperado."
[ "$(sha256sum "$SRC" | awk '{print $1}')" = "$ORIGINAL_ISO_SHA" ] || fail "SHA de MiniOS original incorrecto."

command -v wimlib-imagex >/dev/null 2>&1 || fail "Falta wimlib-imagex."
command -v xorriso >/dev/null 2>&1 || fail "Falta xorriso."

echo
echo "[1/6] Quitando SOLO las 5 imagenes del ESD para recuperar espacio..."
printf '%s\n' 'delete --recursive --force /SCALA/ASHERIMAGENES' |   wimlib-imagex update "$WORK_WIM" 1 --check
wimlib-imagex verify "$WORK_WIM" >/dev/null
wimlib-imagex dir "$WORK_WIM" 1 --path=/SCALA/DEDICATORIA.txt >/dev/null
wimlib-imagex dir "$WORK_WIM" 1 --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null
echo "CAPA SCALA PRINCIPAL: CONSERVADA"

echo
echo "[2/6] Recomprimiendo ESD..."
rm -f "$NEW_ESD"
wimlib-imagex export "$WORK_WIM" all "$NEW_ESD" --compress=LZMS:100 --solid --check
wimlib-imagex verify "$NEW_ESD" >/dev/null
NEW_SIZE="$(stat -c '%s' "$NEW_ESD")"
echo "Original : $INSTALL_SIZE bytes"
echo "Nuevo    : $NEW_SIZE bytes"
[ "$NEW_SIZE" -le "$INSTALL_SIZE" ] || fail "Aun no cabe. No se tocara la ISO."

echo
echo "[3/6] Igualando exactamente el extent original..."
cp "$NEW_ESD" "$PADDED_ESD"
truncate -s "$INSTALL_SIZE" "$PADDED_ESD"
[ "$(stat -c '%s' "$PADDED_ESD")" -eq "$INSTALL_SIZE" ] || fail "No se pudo igualar el tamano."
wimlib-imagex verify "$PADDED_ESD" >/dev/null || fail "ESD padded invalido."

echo
echo "[4/6] Sustituyendo SOLO install.esd en su mismo LBA..."
rm -f "$OUT" "$OUT.tmp"
cp --reflink=auto "$SRC" "$OUT.tmp"
dd if="$PADDED_ESD" of="$OUT.tmp" bs=16M seek="$INSTALL_OFFSET" oflag=seek_bytes conv=notrunc status=progress
sync

[ "$(stat -c '%s' "$OUT.tmp")" -eq "$ORIGINAL_ISO_SIZE" ] || fail "Cambio el tamano de la ISO."
END=$((INSTALL_OFFSET + INSTALL_SIZE))
cmp -n "$INSTALL_OFFSET" "$SRC" "$OUT.tmp" >/dev/null || fail "Se alteraron bytes antes del ESD."
cmp -i "$END:$END" "$SRC" "$OUT.tmp" >/dev/null || fail "Se alteraron bytes despues del ESD."
echo "BYTES FUERA DE INSTALL.ESD: IDENTICOS"

echo
echo "[5/6] Validando El Torito y ESD final..."
SRC_BOOT="$WORK/recovery-boot-src.txt"
OUT_BOOT="$WORK/recovery-boot-out.txt"
xorriso -indev "$SRC" -report_el_torito plain 2>/dev/null |   sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$SRC_BOOT"
xorriso -indev "$OUT.tmp" -report_el_torito plain 2>/dev/null |   sed '/^xorriso/d;/^Drive current/d;/^Media current/d;/^Media status/d;/^Media summary/d' > "$OUT_BOOT"
cmp "$SRC_BOOT" "$OUT_BOOT" >/dev/null || fail "El Torito no coincide."

dd if="$OUT.tmp" of="$CHECK_ESD" bs=16M skip="$INSTALL_OFFSET" count="$INSTALL_SIZE" iflag=skip_bytes,count_bytes status=none
wimlib-imagex verify "$CHECK_ESD" >/dev/null
wimlib-imagex dir "$CHECK_ESD" 1 --path=/SCALA/DEDICATORIA.txt >/dev/null
wimlib-imagex dir "$CHECK_ESD" 1 --path=/Windows/Setup/Scripts/SetupComplete.cmd >/dev/null

echo
echo "[6/6] Cerrando..."
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
echo " - Arranque original fuera de install.esd intacto"
echo " - El Torito identico"
echo " - ESD final valido"
echo " - SCALA y SetupComplete presentes"
echo " - Imagenes ASHER omitidas en esta build para garantizar que el ESD quepa"
echo "============================================================"
echo "LISTO PARA PRUEBA EN VENTOY."
echo "============================================================"

trap - EXIT
