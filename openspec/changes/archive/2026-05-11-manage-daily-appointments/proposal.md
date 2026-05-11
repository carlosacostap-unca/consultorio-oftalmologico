## Why

Despues de otorgar turnos, la secretaria necesita gestionar cambios cotidianos sin perder trazabilidad. La primera necesidad critica es cancelar un turno conservando historial, en vez de eliminarlo de la agenda.

## What Changes

- Agregar estado operativo `Cancelado` para turnos.
- Permitir cancelar un turno desde el modal de gestion en `/turnos`.
- Solicitar motivo de cancelacion y guardarlo en observaciones.
- Mantener el turno visible en la agenda con marca visual de cancelacion.
- Conservar las acciones actuales de edicion, cambio de estado y eliminacion como operaciones separadas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `appointment-scheduling`: agrega cancelacion con historial mediante estado `Cancelado`.

## Impact

- Pantalla `app/turnos/page.tsx`.
- Coleccion PocketBase `turnos`, campo `estado`, para admitir `Cancelado`.
- Pruebas Playwright de agenda diaria.
