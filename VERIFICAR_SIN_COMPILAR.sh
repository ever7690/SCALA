#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
required=(
  settings.gradle
  build.gradle
  gradle.properties
  app/build.gradle
  app/src/main/AndroidManifest.xml
  app/src/main/java/com/scala/cutpro/MainActivity.java
  app/src/main/res/values/strings.xml
  app/src/main/res/drawable/ic_scala_cut.xml
)
for f in "${required[@]}"; do
  [[ -s "$f" ]] || { echo "FALLÓ: falta $f"; exit 1; }
done
bash -n COMPILAR_EN_OBRERO_1.sh
echo "VERIFICADO: estructura y script correctos"
