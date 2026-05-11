## Why

La secretaria ya puede otorgar turnos, mover pacientes por sala de espera, cancelar y reprogramar, pero hoy el sistema conserva muy poco contexto de esas decisiones. Registrar un historial operativo por turno permite saber que paso, cuando paso y quien lo hizo, dejando una base confiable para seguimiento, auditoria, reportes y coordinacion con el medico.

## What Changes

- Agregar historial de eventos para cada turno.
- Registrar automaticamente eventos relevantes: creacion, cambio de estado, cancelacion, reprogramacion y edicion de datos operativos.
- Mostrar el historial dentro del modal/detalle de gestion del turno.
- Solicitar motivo obligatorio para marcar un turno como `Cancelado` o `Ausente`.
- Mantener la experiencia de secretaria dentro de Gestion de Turnos, Agenda Diaria y Sala de espera.
- Incorporar la nueva coleccion necesaria al bootstrap de esquema de testing.
- Agregar pruebas Playwright para verificar registro y visualizacion del historial.

## Capabilities

### New Capabilities

- `appointment-event-history`: registra y muestra eventos operativos vinculados a turnos.

### Modified Capabilities

- `appointment-scheduling`: los cambios de estado, cancelaciones, reprogramaciones y ediciones deben crear eventos de historial.
- `secretary-appointment-assignment`: las acciones rapidas de secretaria deben pedir motivo cuando corresponde y dejar trazabilidad.

## Impact

- PocketBase: nueva coleccion para eventos de turno, relacionada con `turnos` y `users`.
- UI principal: `app/turnos/page.tsx` y, si corresponde, `app/turnos/[id]/page.tsx`.
- Formularios de alta/edicion de turnos: registrar creacion y cambios relevantes.
- Scripts: actualizar bootstrap de esquema de testing y seed/test helpers cuando sea necesario.
- Pruebas: ampliar Playwright sobre flujo de secretaria y validar OpenSpec/build.
