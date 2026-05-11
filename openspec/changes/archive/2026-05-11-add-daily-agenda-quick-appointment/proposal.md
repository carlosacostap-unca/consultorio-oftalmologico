## Why

La secretaria debe poder otorgar turnos durante la jornada sin abandonar la agenda diaria. Navegar a una pantalla completa para cada alta funciona, pero corta el ritmo operativo cuando se trabaja con varias agendas medicas.

## What Changes

- Agregar un modal de alta rapida de turno desde la agenda diaria.
- Precargar medico, fecha, hora, disponibilidad y tipo desde el bloque seleccionado.
- Permitir buscar y seleccionar paciente dentro del modal.
- Permitir cargar motivo y observaciones minimas.
- Guardar el turno sin salir de `/turnos` y refrescar la agenda visible.
- Mantener el enlace al formulario completo como fallback para casos mas complejos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `appointment-scheduling`: agrega alta rapida de turno desde la vista diaria.

## Impact

- Pantalla `app/turnos/page.tsx`.
- Pruebas Playwright del flujo de secretaria.
- No requiere cambios de schema PocketBase ni migraciones.
