#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Se necesita Node.js 22 o superior.' >&2
  exit 1
fi
scala_javac="${JAVA_HOME:+$JAVA_HOME/bin/javac}"
if [ -z "$scala_javac" ]; then
  scala_javac="$(command -v javac || true)"
fi
if [ -z "$scala_javac" ] || [ ! -x "$scala_javac" ]; then
  printf '%s\n' 'Se necesita JDK 21. Instala openjdk-21-jdk.' >&2
  exit 1
fi
scala_javac_version="$("$scala_javac" -version 2>&1)"
if ! [[ "$scala_javac_version" =~ javac[[:space:]]+([0-9]+) ]] || (( BASH_REMATCH[1] < 21 )); then
  printf '%s\n' "JDK incompatible: $scala_javac_version. Se necesita JDK 21 o superior; instala openjdk-21-jdk y configura JAVA_HOME." >&2
  exit 1
fi
JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$scala_javac")")")"
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
npm ci
npm run check
npm test
npm run build
npx cap sync android
chmod +x android/gradlew
(cd android && ./gradlew "-Dorg.gradle.java.home=$JAVA_HOME" --no-daemon --max-workers=2 :app:assembleDebug :app:assembleRelease :app:bundleRelease)
mkdir -p entregables
scala_version="$(node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version')"
cp android/app/build/outputs/apk/debug/app-debug.apk "entregables/SCALA_Pequenos_Valientes_${scala_version}_pruebas.apk"
cp android/app/build/outputs/apk/release/app-release-unsigned.apk "entregables/SCALA_Pequenos_Valientes_${scala_version}_sin_firmar.apk"
cp android/app/build/outputs/bundle/release/app-release.aab "entregables/SCALA_Pequenos_Valientes_${scala_version}_sin_firmar.aab"
sha256sum entregables/*.apk entregables/*.aab > entregables/SHA256SUMS.txt
printf '%s\n' 'APK de pruebas, APK release y AAB disponibles en entregables/. Usa scripts/sign_android.sh para firmar la versión comercial con tu clave privada.'
