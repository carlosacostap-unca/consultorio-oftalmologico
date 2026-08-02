## Why

La aplicación debe mantenerse en la última versión estable de Next.js para corregir las alertas directas del framework y recibir sus parches vigentes. Next.js `16.2.12` es la versión estable más reciente, pero todavía declara Sharp `^0.34.5`; por eso la actualización del framework puede avanzar mientras el instalador permanece bloqueado hasta contar con Sharp corregido y oficialmente compatible.

## What Changes

- Actualizar Next.js y `eslint-config-next` desde `16.2.6` hasta la última versión estable publicada, actualmente `16.2.12`.
- Mantener bloqueado el instalador hasta que una versión estable de Next.js admita oficialmente Sharp `0.35.x` o posterior corregida.
- Actualizar PostCSS a una versión corregida compatible y regenerar el lockfile sin forzar dependencias fuera de los rangos declarados por Next.js.
- Verificar que la auditoría de dependencias de producción no reporte vulnerabilidades altas o críticas con corrección disponible.
- Repetir pruebas, análisis estático, build de producción y empaquetado NSIS de Windows.
- Mantener sin cambios los flujos clínicos, las APIs públicas, el esquema de PocketBase y los datos existentes.

## Capabilities

### New Capabilities

- `production-dependency-security`: Define el umbral de seguridad y las verificaciones requeridas para las dependencias incluidas en builds e instaladores de producción.

### Modified Capabilities

Ninguna.

## Impact

- Archivos afectados: `package.json`, `package-lock.json`, artefactos OpenSpec y salida del instalador de escritorio.
- Dependencias afectadas: Next.js y `eslint-config-next` se actualizan a `16.2.12`; PostCSS y Sharp continúan bajo evaluación para habilitar el instalador.
- Sistemas afectados: build web standalone y empaquetado de escritorio para Windows x64.
- No requiere cambios de esquema, migración de PocketBase, importación de datos ni modificaciones de los flujos clínicos.
