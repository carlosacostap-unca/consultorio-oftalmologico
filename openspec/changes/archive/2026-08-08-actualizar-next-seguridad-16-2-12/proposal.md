## Why

La aplicación web y de escritorio empaqueta Next.js standalone dentro de Electron. Sobre `develop`, `npm audit --omit=dev` reporta 4 vulnerabilidades altas heredadas de NanoID, PostCSS y Sharp; Next.js `16.3.0` ya es estable y declara versiones corregidas de PostCSS y Sharp, por lo que permite levantar el bloqueo de seguridad si supera todas las verificaciones.

## What Changes

- Actualizar `next` y `eslint-config-next` desde `16.2.12` hasta `16.3.0`.
- Eliminar el override obsoleto de PostCSS `8.5.14` y regenerar el lockfile dentro de los rangos oficiales de Next.js.
- Resolver NanoID, PostCSS y Sharp en versiones corregidas y compatibles, sin versiones canary ni `audit fix --force`.
- Actualizar únicamente las dependencias de desarrollo directas o transitivas necesarias para corregir hallazgos mediante versiones compatibles.
- Exigir cero vulnerabilidades altas o críticas en dependencias de producción y resolver los hallazgos altos o críticos de desarrollo cuando exista una actualización compatible.
- Repetir pruebas, análisis estático, build standalone y empaquetado NSIS de Windows antes de publicar.
- Mantener sin cambios los flujos clínicos, las APIs públicas, el esquema de PocketBase y los datos existentes.

## Capabilities

### New Capabilities

- `production-dependency-security`: Define los umbrales de seguridad y las verificaciones requeridas para dependencias de runtime y herramientas de desarrollo.

### Modified Capabilities

Ninguna.

## Impact

- Archivos afectados: `package.json`, `package-lock.json`, artefactos OpenSpec y salida del instalador de escritorio.
- Dependencias principales: Next.js y `eslint-config-next` se actualizan a `16.3.0`; el lockfile debe resolver PostCSS `8.5.23` o posterior, Sharp `0.35.3` o posterior y NanoID posterior a `3.3.16`.
- Herramientas: podrán actualizarse parches compatibles de Tailwind/PostCSS, Electron, Concurrently u otras dependencias implicadas por la auditoría; no se incluyen saltos mayores de ESLint, TypeScript, tipos de Node o PocketBase.
- Sistemas afectados: build web standalone y empaquetado de escritorio para Windows x64.
- No requiere cambios de esquema, migración de PocketBase, importación de datos ni modificaciones de flujos clínicos.

El identificador histórico del cambio se conserva aunque el objetivo haya avanzado de `16.2.12` a `16.3.0`.
