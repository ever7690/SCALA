#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="SCALA CUT PRO Android"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${HOME}/SCALA-APPS/SALIDAS/SCALA_CUT"
GRADLE_VERSION="8.9"
LOCAL_GRADLE="${PROJECT_DIR}/.scala-gradle/gradle-${GRADLE_VERSION}/bin/gradle"

ok(){ printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
info(){ printf '\033[1;36m[INFO]\033[0m %s\n' "$*"; }
fail(){ printf '\033[1;31m[FALLÓ]\033[0m %s\n' "$*" >&2; exit 1; }

printf '\n====================================================\n'
printf ' SCALA - FABRICA APK / OBRERO 1\n'
printf ' Proyecto: %s\n' "$APP_NAME"
printf '====================================================\n\n'

cd "$PROJECT_DIR"

if [[ -z "${ANDROID_HOME:-}" && -d "$HOME/Android/Sdk" ]]; then
  export ANDROID_HOME="$HOME/Android/Sdk"
fi
if [[ -z "${ANDROID_SDK_ROOT:-}" && -n "${ANDROID_HOME:-}" ]]; then
  export ANDROID_SDK_ROOT="$ANDROID_HOME"
fi
[[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME" ]] || fail "Android SDK no encontrado."
ok "Android SDK: $ANDROID_HOME"

command -v java >/dev/null 2>&1 || fail "Java no está instalado."
JAVA_MAJOR="$(java -version 2>&1 | awk -F'[\".]' '/version/ {print $2; exit}')"
[[ "$JAVA_MAJOR" =~ ^[0-9]+$ ]] || fail "No pude detectar la versión de Java."
if (( JAVA_MAJOR < 17 )); then
  fail "Se requiere Java 17 o superior. Detectado: $JAVA_MAJOR"
fi
ok "Java $JAVA_MAJOR"

GRADLE_CMD=""
if command -v gradle >/dev/null 2>&1; then
  GRADLE_CMD="$(command -v gradle)"
  info "Usando Gradle del sistema: $GRADLE_CMD"
elif [[ -x "$LOCAL_GRADLE" ]]; then
  GRADLE_CMD="$LOCAL_GRADLE"
  info "Usando Gradle local ya preparado."
else
  command -v curl >/dev/null 2>&1 || fail "Falta curl para preparar Gradle."
  command -v unzip >/dev/null 2>&1 || fail "Falta unzip para preparar Gradle."
  CACHE_DIR="$PROJECT_DIR/.scala-gradle"
  ZIP="$CACHE_DIR/gradle-${GRADLE_VERSION}-bin.zip"
  mkdir -p "$CACHE_DIR"
  info "Gradle no está instalado. Preparando Gradle $GRADLE_VERSION una sola vez..."
  curl -fL --retry 20 --retry-delay 3 --retry-all-errors -C -     -o "$ZIP" "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
  unzip -q -o "$ZIP" -d "$CACHE_DIR"
  [[ -x "$LOCAL_GRADLE" ]] || fail "No se pudo preparar Gradle."
  GRADLE_CMD="$LOCAL_GRADLE"
  ok "Gradle $GRADLE_VERSION preparado"
fi

mkdir -p "$OUT_DIR"
info "Compilando APK..."
"$GRADLE_CMD" :app:assembleDebug --no-daemon --stacktrace

APK="$PROJECT_DIR/app/build/outputs/apk/debug/app-debug.apk"
[[ -s "$APK" ]] || fail "Gradle terminó pero no encuentro el APK."

FINAL_APK="$OUT_DIR/SCALA-CUT-PRO-Android.apk"
cp -f "$APK" "$FINAL_APK"
sha256sum "$FINAL_APK" > "$FINAL_APK.sha256"
{
  echo "ESTADO=VERIFICADO"
  echo "PROYECTO=$APP_NAME"
  echo "APK=$FINAL_APK"
  echo "FECHA=$(date -Is)"
  echo "JAVA=$JAVA_MAJOR"
  echo "GRADLE=$($GRADLE_CMD --version | awk '/Gradle /{print $2; exit}')"
} > "$OUT_DIR/ULTIMA_COMPILACION.txt"

printf '\n====================================================\n'
printf ' VERIFICADO - APK GENERADO\n'
printf ' %s\n' "$FINAL_APK"
printf '====================================================\n'
