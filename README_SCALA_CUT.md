# SCALA CUT PRO

Editor de video propio de SCALA para Linux. No usa Kdenlive ni OpenCut como aplicación final.

## Núcleo 0.1
- Importación múltiple de video, audio e imágenes.
- Biblioteca de medios con arrastrar/soltar.
- Timeline V1 / TXT / A1.
- Mover clips, recortar bordes, dividir y eliminar.
- Preview y scrubber.
- Texto configurable.
- Filtros de brillo, contraste y saturación.
- Velocidad 0.5x–2x y volumen.
- Formatos 16:9, 9:16, 1:1 y 4:5.
- Exportación MP4 H.264/AAC en 720p, 1080p, 4K y 8K.
- Guardar/abrir proyecto SCALA CUT.
- Atajos: Space, Delete, S, Ctrl+I, Ctrl+E, Ctrl+Z/Y.

## Validación CI
GitHub Actions ejecuta:
1. pruebas del modelo;
2. render real con video + audio + imagen + texto;
3. arranque gráfico Electron bajo Xvfb;
4. empaquetado AppImage + DEB;
5. SHA256 de artefactos.

El producto no copia código, recursos ni marca de CapCut; reproduce un flujo de edición no lineal similar con implementación propia.
