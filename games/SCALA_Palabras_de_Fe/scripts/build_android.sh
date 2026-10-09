#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Se necesita Node.js 22 o superior.' >&2
  exit 1
fi
if ! command -v javac >/dev/null 2>&1; then
  printf '%s\n' 'Se necesita JDK 21. Instala openjdk-21-jdk.' >&2
  exit 1
fi
npm ci
npm run check
npm test
npm run build
npx cap sync android
chmod +x android/gradlew
(cd android && ./gradlew --no-daemon --max-workers=2 :app:assembleDebug :app:assembleRelease)
mkdir -p entregables
cp android/app/build/outputs/apk/debug/app-debug.apk entregables/SCALA_Palabras_de_Fe_1.0.0_pruebas.apk
cp android/app/build/outputs/apk/release/app-release-unsigned.apk entregables/SCALA_Palabras_de_Fe_1.0.0_sin_firmar.apk
sha256sum entregables/*.apk > entregables/SHA256SUMS.txt
printf '%s\n' 'APK de pruebas firmado y APK release sin firmar disponibles en entregables/.'
