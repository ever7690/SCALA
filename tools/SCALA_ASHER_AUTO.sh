#!/usr/bin/env bash
set -Eeuo pipefail

URL="https://raw.githubusercontent.com/ever7690/SCALA/main/tools/SCALA_CREAR_ASHER_CALA_OS_v1.2_BOOTFIX.sh"
DEST="$HOME/Descargas/SCALA_CREAR_ASHER_CALA_OS_v1.2_BOOTFIX.sh"
LOG="$HOME/Descargas/SCALA_ASHER_CALA_OS_ULTIMO_LOG.txt"

echo "============================================================"
echo " SCALA - EJECUTOR AUTOMATICO ASHER CALA OS"
echo "============================================================"
echo "Descargando la ultima correccion..."
wget -q --show-progress -O "$DEST.tmp" "$URL"
mv "$DEST.tmp" "$DEST"
chmod +x "$DEST"

echo
echo "Ejecutando constructor..."
echo "Log: $LOG"
echo

set +e
bash "$DEST" 2>&1 | tee "$LOG"
RC=${PIPESTATUS[0]}
set -e

echo
echo "============================================================"
if [ "$RC" -eq 0 ]; then
  echo " PROCESO TERMINADO CORRECTAMENTE"
else
  echo " PROCESO DETENIDO CON ERROR"
  echo " Envieme este archivo:"
  echo " $LOG"
fi
echo "============================================================"
exit "$RC"
