## Why

Los datos clinicos no cargados no deben mostrarse como `0`, porque eso puede interpretarse como un valor medido. En agudeza visual, refraccion, ADD y presion ocular, los campos vacios deben permanecer visual y operativamente vacios.

## What Changes

- Normalizar valores cero en campos clinicos opcionales para que se muestren como vacios.
- Evitar guardar ceros de relleno en nuevas consultas o ediciones.
- Quitar placeholders con cero o unidad de medida que parezcan valores cargados.

## Impact

- Afecta formularios de nueva consulta y detalle de consulta.
- Afecta rutas API de creacion y edicion de consultas.
- Afecta impresiones de consulta y receta de anteojos cuando existen ceros de relleno historicos.
