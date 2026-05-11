## Why

La secretaria ya cuenta con una sala de espera inicial, pero todavia necesita una vista mas operativa para manejar el dia real sin saltar entre pantallas. Esta mejora convierte la sala de espera en un tablero de recepcion por medico y fecha, con acciones rapidas completas y datos suficientes para decidir.

## What Changes

- Mejorar la vista `Sala de espera` dentro de Gestion de Turnos para mostrar mejor contexto del dia, medico, paciente y demora.
- Agregar acciones rapidas completas para recepcion: llegada, pasar a consulta, atendido, ausente y cancelar.
- Exigir motivo para ausencia y cancelacion cuando se ejecutan desde la sala de espera, reutilizando el historial operativo existente.
- Mostrar telefono, obra social, tipo, motivo, observaciones breves y tiempo de espera/demora cuando aplique.
- Permitir filtrar la sala por medico, fecha y busqueda de paciente manteniendo los controles actuales de Gestion de Turnos.
- Agregar cobertura Playwright del flujo de sala de espera por medico y estados.

## Capabilities

### New Capabilities

### Modified Capabilities

- `secretary-appointment-assignment`: la sala de espera pasa a ser una vista operativa completa para secretaria, con acciones de recepcion, cancelacion y contexto escaneable por medico.

## Impact

- UI principal: `app/turnos/page.tsx`.
- Historial existente: se reutiliza `turno_eventos` para registrar los cambios de estado y cancelaciones.
- Pruebas: `tests/playwright/consultorio.spec.ts`.
- No requiere cambios de esquema PocketBase ni migracion de datos.
