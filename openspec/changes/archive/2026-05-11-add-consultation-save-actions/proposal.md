## Why

Al guardar una consulta, el medico necesita cerrar la atencion con una decision clara: volver a su jornada, revisar la consulta creada, generar receta o imprimir anteojos. La redireccion automatica actual corta el contexto de trabajo.

## What Changes

- Mostrar una confirmacion de consulta guardada con acciones de cierre.
- Mantener el vinculo con turno y el cambio a `Atendido`.
- Permitir volver a la jornada medica en la fecha del turno cuando la consulta viene desde `turno_id`.
- Permitir abrir la consulta guardada, crear receta o imprimir anteojos desde la confirmacion.
- Agregar soporte en `/turnos` para abrir una pestaña y fecha por query string.
- Sin cambios de esquema PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: Agrega acciones posteriores al guardado de nueva consulta.
- `doctor-daily-care-workflow`: Conserva el contexto de jornada medica al finalizar una consulta desde turno.

## Impact

- UI de `app/consultas/nueva/page.tsx`.
- Inicializacion de vista/fecha en `app/turnos/page.tsx`.
- Pruebas Playwright de flujo medico.
- Especificaciones OpenSpec de consultas y jornada medica.
