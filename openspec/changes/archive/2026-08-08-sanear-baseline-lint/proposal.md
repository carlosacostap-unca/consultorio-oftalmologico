## Why

El análisis estático completo falla actualmente con 40 hallazgos (11 errores y 29 advertencias), lo que impide usar lint como una barrera confiable contra regresiones. Parte de las advertencias afecta dependencias de hooks en pantallas clínicas y administrativas, por lo que deben revisarse con pruebas de comportamiento y no silenciarse de forma mecánica.

## What Changes

- Corregir los 11 errores actuales de ESLint mediante tipos explícitos y nombres de variables compatibles con las reglas vigentes.
- Revisar y corregir las advertencias de dependencias de hooks según la semántica real de cada efecto o memoización.
- Eliminar variables sin uso y resolver la advertencia de imagen sin desactivar reglas globales.
- Establecer `npm run lint` con cero errores y cero advertencias como criterio bloqueante para integrar cambios.
- Incorporar verificaciones focalizadas sobre los flujos afectados para conservar el comportamiento clínico y administrativo.
- Mantener sin cambios las APIs públicas, el esquema de PocketBase y los datos existentes.

## Capabilities

### New Capabilities

- `static-analysis-quality`: Define el baseline limpio y la barrera de calidad de ESLint requerida para integrar y publicar cambios.

### Modified Capabilities

Ninguna.

## Impact

- Código afectado: pantallas de consultas, recetas, turnos, agenda, pacientes, mutuales y seed; utilidades de sincronización, migraciones, scripts y pruebas señaladas por ESLint.
- Herramientas afectadas: ESLint 9 y `eslint-config-next`, sin relajación global de reglas.
- Pruebas afectadas: verificaciones focalizadas de consultas, recetas, turnos, recordatorios y escritorio según los archivos modificados.
- No requiere migraciones, cambios de esquema de PocketBase, modificaciones de datos clínicos ni cambios de permisos.
