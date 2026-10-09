# Ícono de inicio · Palabras de Fe 1.1.3

Ilustración original creada con la herramienta integrada imagegen: Biblia abierta, cruz dorada y título «Palabras de Fe», sin logotipo ni texto SCALA. La marca SCALA de la portada, cabecera y créditos permanece intacta.

Imagen maestra: `public/brand/palabras-de-fe-icon-v2.png`, PNG RGB 1254 × 1254, conservado sin cambios. SHA-256: `fc0df7782a60d54732bdbcf8f837bb40a65834ef677d24f60ed1203aa3fcfc78`.

`node scripts/prepare_store.mjs --brand --brand-only` prepara el PNG 512 para web/tienda y los mapas de bits Android, con remuestreo de alta calidad. El azul llega a todos los bordes; no hay tarjeta cuadrada dentro del círculo ni margen exterior. La variante redonda para Android 7 lleva transparencia únicamente fuera del círculo.

El ícono adaptable coloca el arte con márgenes de 16,6667 % en su capa de 108 unidades, equivalente al área visible central de 72 unidades. El sistema recorta el cuadrado a su máscara circular, cuadrada o redondeada sin cortar el título. El fondo azul cubre el resto de la capa. La etiqueta del launcher es «Palabras de Fe» en las variantes de pruebas y comercial.

La vista de máscaras se exporta a `entregables/preview-iconos.png`. El prompt exacto de esta revisión está en `prompt-icono-v2.txt`; `prompt-icono.txt` documenta la variante anterior. La apariencia final del launcher de Realme se revisa al instalar la actualización.
