# SCALA CUT PRO Android — paquete para OBRERO 1

Este proyecto se compila **por terminal**, sin Android Studio.

## Objetivo
OBRERO 1 actúa como fábrica APK. El proyecto ya contiene el código Android de SCALA CUT PRO y un script de compilación de un solo paso.

## Compilar
Dentro de esta carpeta ejecutar:

```bash
./COMPILAR_EN_OBRERO_1.sh
```

El script detecta Android SDK y Java, usa Gradle existente o prepara Gradle 8.9, compila el APK, verifica que exista y copia el resultado a:

`~/SCALA-APPS/SALIDAS/SCALA_CUT/SCALA-CUT-PRO-Android.apk`

No requiere Android Studio.
