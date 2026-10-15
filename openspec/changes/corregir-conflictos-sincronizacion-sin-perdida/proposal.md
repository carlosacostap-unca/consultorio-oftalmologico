## Why

El equipo equipo afectado acumula operaciones en error porque el servidor envía conflictos con campos actuales y PocketBase todavía exige `entidad`, `tipo` y `estado`. Los logs de producción registran 115 rechazos de validación entre el 7 y el 9 de octubre de 2026. La recuperación debe conservar íntegramente las bases local y central, sus colas y las versiones en conflicto.

## What Changes

- Escribir los conflictos y su resolución con campos actuales y heredados, sin eliminar campos ni registros ni migrar contenido clínico.
- Reutilizar el conflicto de la misma operación cuando una respuesta o su confirmación durable se interrumpe.
- Evitar que las confirmaciones históricas y el pull sustituyan registros locales con otras operaciones sin confirmar; detener el avance del cursor cuando no se puede aplicar una página con seguridad.
- Preparar una comprobación de compatibilidad de esquema de solo lectura y un procedimiento de recuperación con respaldos local y central verificados antes de habilitar reintentos.
- Validar con datos sintéticos, reintentos, fallas parciales y comparación de contenido antes/después.
- Preparar un instalador piloto local desde la versión publicada, aplicar los parches compatibles necesarios para superar la auditoría de dependencias y comprobar los handlers empaquetados y el arranque en un perfil nuevo aislado antes de distribuirlo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `offline-data-synchronization`: compatibilidad de conflictos heredados, recuperación idempotente y protección de cambios locales sin confirmar.

## Impact

Helpers y rutas de conflictos, motor de sincronización, pruebas y procedimiento operativo. La solución principal es de código: no requiere borrar campos heredados ni cambiar el esquema de producción. El cliente necesita una versión que incluya la protección de escrituras antes de recuperar su cola. La publicación y recuperación requieren acceso al equipo o confirmación verificable de su respaldo, además de un respaldo central; hasta entonces producción permanece sin cambios.
