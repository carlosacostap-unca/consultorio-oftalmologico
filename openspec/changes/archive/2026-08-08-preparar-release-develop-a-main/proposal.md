## Why

Las ramas remotas `main` y `develop` divergieron: `main` conserva correcciones exclusivas usadas en producción, mientras `develop` acumula la actualización a Next.js 16.3, el lint estricto y cambios de escritorio todavía no cerrados. Publicar `develop` sin una reconciliación controlada podría perder correcciones, exponer capacidades incompletas o introducir una regresión clínica.

## What Changes

- Preparar una rama de release que contenga la historia de `main` y `develop`, resuelva explícitamente sus conflictos y preserve las correcciones exclusivas de ambas ramas.
- Auditar qué componentes, rutas y APIs de la versión de escritorio quedarían presentes en el runtime web y bloquear el release si una capacidad incompleta queda expuesta sin autorización o guarda suficiente.
- Exigir una barrera reproducible de auditoría, lint, TypeScript, pruebas focalizadas, circuitos E2E y build antes de integrar en `main`.
- Verificar como regresiones críticas los antecedentes clínicos persistentes, la validación de DNI, el médico responsable en impresiones y los flujos principales de autenticación, turnos, consultas y recetas.
- Identificar el proveedor y commit efectivo del despliegue, realizar smoke tests posteriores y conservar una referencia de rollback.
- No ejecutar migraciones de datos ni cambios de esquema de PocketBase como efecto implícito de la reconciliación de ramas.

## Capabilities

### New Capabilities

- `production-release-alignment`: reconciliación controlada entre ramas, barreras de release, control de capacidades incompletas y verificación del despliegue efectivo.

### Modified Capabilities

Ninguna. El cambio preserva los contratos funcionales vigentes y agrega controles para publicarlos sin regresiones.

## Impact

- Afecta la estrategia Git entre `origin/develop`, la rama de release y `origin/main`.
- Requiere revisar los archivos modificados en ambas ramas, especialmente consultas, impresiones, autenticación, sincronización de escritorio, dependencias y configuración de build.
- Involucra el proveedor de despliegue web, el runtime Next.js y las APIs de PocketBase consumidas por web y escritorio.
- No agrega dependencias ni modifica datos por sí mismo; cualquier preparación de esquema o instalador de escritorio permanece fuera del despliegue web salvo aprobación y verificación explícitas.
