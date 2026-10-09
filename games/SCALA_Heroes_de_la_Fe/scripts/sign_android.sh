#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -ne 2 ]; then
  printf '%s\n' 'Uso: bash scripts/sign_android.sh /ruta/scala-palabras-de-fe.p12 /ruta/scala-password.txt' >&2
  exit 1
fi
scala_keystore="$(readlink -f "$1")"
scala_password_file="$(readlink -f "$2")"
if [ ! -r "$scala_keystore" ] || [ ! -r "$scala_password_file" ]; then
  printf '%s\n' 'No se puede leer la clave privada o el archivo de contraseña.' >&2
  exit 1
fi
scala_tools="${SCALA_ANDROID_BUILD_TOOLS:-${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}/build-tools/36.0.0}"
if [ ! -f "$scala_tools/lib/apksigner.jar" ] || [ ! -x "$scala_tools/zipalign" ]; then
  printf '%s\n' 'Se necesitan Android SDK Build-Tools 36.0.0; configura ANDROID_HOME o SCALA_ANDROID_BUILD_TOOLS.' >&2
  exit 1
fi
scala_version="$(node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version')"
scala_base="entregables/SCALA_Heroes_de_la_Fe_${scala_version}"
if [ ! -f "${scala_base}_sin_firmar.apk" ] || [ ! -f "${scala_base}_sin_firmar.aab" ]; then
  printf '%s\n' 'Primero compila con bash scripts/build_android.sh.' >&2
  exit 1
fi
scala_aligned="${scala_base}_alineado_temporal.apk"
trap 'rm -f "$scala_aligned"' EXIT
"$scala_tools/zipalign" -f -P 16 4 "${scala_base}_sin_firmar.apk" "$scala_aligned"
java -jar "$scala_tools/lib/apksigner.jar" sign --ks "$scala_keystore" --ks-key-alias scala-palabrasdefe --ks-pass "file:$scala_password_file" --v4-signing-enabled false --out "${scala_base}_comercial.apk" "$scala_aligned"
java -jar "$scala_tools/lib/apksigner.jar" verify --verbose --print-certs "${scala_base}_comercial.apk" > entregables/FIRMA_APK.txt
"$scala_tools/zipalign" -c -P 16 4 "${scala_base}_comercial.apk"
cp "${scala_base}_sin_firmar.aab" "${scala_base}_Google_Play.aab"
java --module jdk.jartool/sun.security.tools.jarsigner.Main -keystore "$scala_keystore" -storetype PKCS12 -storepass:file "$scala_password_file" -sigalg SHA256withRSA -digestalg SHA-256 "${scala_base}_Google_Play.aab" scala-palabrasdefe
java --module jdk.jartool/sun.security.tools.jarsigner.Main -verify -verbose -certs "${scala_base}_Google_Play.aab" > entregables/FIRMA_AAB.txt
sha256sum "${scala_base}_comercial.apk" "${scala_base}_Google_Play.aab" > entregables/SHA256_COMERCIAL.txt
printf '%s\n' 'APK comercial y AAB firmados y verificados en entregables/. Guarda la clave privada y la contraseña fuera del repositorio.'
