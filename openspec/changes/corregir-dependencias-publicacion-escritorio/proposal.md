## Why

La publicación automática de escritorio 0.1.12 fue detenida por la auditoría de producción: Next.js 16.3.0, js-yaml y sharp contienen vulnerabilidades altas o críticas con correcciones compatibles disponibles. Corregirlas permite entregar el ajuste de tipografía desde la aplicación instalada, sin distribuir un runtime vulnerable.

## What Changes

- Alinear Next.js y eslint-config-next en 16.3.5 y resolver versiones corregidas de js-yaml y sharp en el lockfile.
- Repetir instalación limpia, auditorías, lint, TypeScript, pruebas y build antes de publicar.
- Publicar una versión nueva 0.1.13; conservar la etiqueta fallida 0.1.12 sin sobrescribirla.
- Mantener los controles de firma, integridad, respaldo y aprobación de canales existentes.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `production-dependency-security`: actualizar el baseline reproducible del framework y las transitivas corregidas para el release de septiembre.

## Impact

Cambian package.json, package-lock.json y los artefactos OpenSpec. No se modifican lógica clínica, permisos, API, esquemas PocketBase, datos, importaciones ni formato de impresión. El runtime corregido será compartido por web y escritorio.

Evidencia: auditoría del workflow 35509947189 y avisos GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4, GHSA-2883-xcg3-v3hh y GHSA-rgj7-g3m4-5g8c.
