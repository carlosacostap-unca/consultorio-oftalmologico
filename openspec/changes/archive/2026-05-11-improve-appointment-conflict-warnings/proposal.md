## Why

La secretaria puede otorgar turnos rapidamente, pero necesita mas contexto antes de confirmar para evitar duplicados, sobrecarga de agenda o sobreturnos mal identificados. El sistema debe advertir sin bloquear cuando existe una razon valida para continuar.

## What Changes

- Mostrar proximos turnos activos del paciente durante el otorgamiento.
- Destacar si el paciente ya tiene un turno pendiente con el mismo medico.
- Requerir confirmacion explicita para guardar cuando existan advertencias.
- Mantener los sobreturnos como excepcion visible y etiquetada.
- No modificar el esquema de PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `appointment-scheduling`: El otorgamiento de turnos debera mostrar advertencias operativas y requerir confirmacion cuando se guarde con conflictos informativos.

## Impact

- Afecta `app/turnos/page.tsx` y `app/turnos/nuevo/page.tsx`.
- Afecta pruebas Playwright de otorgamiento de turnos.
- No requiere migraciones ni cambios en colecciones PocketBase.
