## Why

Las fechas de nacimiento de pacientes son datos de calendario, pero algunos registros quedaron guardados a medianoche UTC. Al visualizarlos o calcular edad desde Argentina pueden desplazarse al dia anterior, igual que ocurria con las fechas clinicas de consultas.

## What Changes

- Tratar `pacientes.fecha_nacimiento` como fecha calendario estable en las pantallas de alta, edicion, turnos y consultas.
- Guardar nuevas fechas de nacimiento normalizadas a mediodia UTC para evitar corrimientos por zona horaria.
- Calcular edad usando la clave de fecha calendario, sin convertir medianoche UTC a la zona local.
- Agregar un script administrativo seguro para detectar y normalizar fechas de nacimiento guardadas exactamente a `00:00:00.000Z`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `patient-management`: las fechas de nacimiento deben preservarse como dia calendario al crear, editar, ver y usar pacientes en flujos clinicos y administrativos.
- `data-import-and-migration`: los scripts administrativos deben poder normalizar fechas de nacimiento legacy a mediodia UTC con dry-run, respaldo y confirmacion explicita.

## Impact

- `lib/patient-birth-date.ts`
- `app/pacientes/nuevo/page.tsx`
- `app/pacientes/[id]/page.tsx`
- `app/consultas/nueva/page.tsx`
- `app/consultas/[id]/page.tsx`
- `app/turnos/nuevo/page.tsx`
- `app/turnos/sobreturno/nuevo/page.tsx`
- `scripts/normalizar_pacientes_fecha_nacimiento_medianoche.mjs`
- Reportes en `reports/` y backups en `data/backups/` durante ejecuciones administrativas.
