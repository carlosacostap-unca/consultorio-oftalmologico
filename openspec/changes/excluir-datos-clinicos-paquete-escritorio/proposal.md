## Why

El empaquetado de escritorio copia actualmente el directorio local ignorado `data/` desde `.next/standalone` hacia `resources/app/data`, por lo que un instalador puede incorporar una base DBF y respaldos con informacion clinica ajena al runtime. Un artefacto distribuible debe contener solamente codigo y recursos operativos, nunca fuentes de importacion ni respaldos locales del entorno que lo construyo.

## What Changes

- Excluir `data/`, sus descendientes y los manifiestos de trazado `*.nft.json` al copiar el standalone de Next.js al paquete de Windows.
- Agregar una verificacion bloqueante de contenido que rechace cualquier paquete con `resources/app/data`, trazas de construccion o una base activa `pb_data` dentro de los binarios distribuibles.
- Ejecutar la verificacion tanto para el paquete local como para el instalador NSIS antes de considerarlos aptos.
- Conservar los recursos requeridos por el runtime: servidor standalone, estaticos, archivos publicos, migraciones de PocketBase y ejecutable local.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `desktop-update-distribution`: exige que la generacion y publicacion del artefacto bloqueen cualquier inclusion de datos clinicos, fuentes de importacion o bases locales del equipo constructor.

## Impact

- Afecta los filtros y el hook `afterPack` de `electron-builder`, los scripts `desktop:pack` y `desktop:dist`, y agrega una politica verificable de contenido del paquete.
- No migra ni elimina el directorio local `data/`; solamente impide copiarlo al artefacto distribuible.
- El mantenimiento central que usa `data/DATOMED.DBF` conserva su archivo en el entorno de servidor y queda fuera del paquete de escritorio.
- No requiere cambios en PocketBase ni nuevas dependencias.
