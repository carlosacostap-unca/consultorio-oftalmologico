## Why

La vista diaria de turnos debe funcionar como tablero de trabajo para secretaria, no solo como listado. La secretaria necesita entender rapidamente el estado del dia por medico y actuar sobre los turnos sin abrir pantallas adicionales.

## What Changes

- Agregar resumen operativo por medico y resumen general del dia.
- Mostrar filtros rapidos por estado operativo: en espera, en consulta, atendidos, ausentes, sobreturnos y atrasados.
- Señalar turnos atrasados cuando la hora ya paso y siguen en espera.
- Agregar acciones rapidas para cambiar estado desde la lista diaria.
- Mostrar telefono, obra social y motivo del paciente en la lista diaria cuando existan.
- No modificar el esquema de PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `appointment-scheduling`: La vista diaria debera operar como tablero de secretaria con resumen, filtros, señales de atraso y acciones rapidas de estado.

## Impact

- Afecta `app/turnos/page.tsx`.
- Afecta pruebas Playwright de vista diaria y cambios de estado.
- No requiere migraciones, cambios de colecciones PocketBase ni scripts de importacion.
