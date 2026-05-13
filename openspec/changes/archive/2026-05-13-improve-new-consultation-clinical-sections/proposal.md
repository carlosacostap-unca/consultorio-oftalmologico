## Why

La pantalla de nueva consulta ya permite cargar los datos clinicos principales, pero algunos campos narrativos quedan comprimidos como inputs de una sola linea. Para el medico, la carga diaria mejora si motivo, examen oftalmologico y cierre clinico se distinguen visualmente y permiten escribir texto clinico con comodidad.

## What Changes

- Separar visualmente el motivo de consulta, el examen oftalmologico y el cierre clinico.
- Convertir biomicroscopia, fondo de ojo, diagnostico y tratamiento en campos multilínea.
- Mantener todos los campos actuales y el mismo guardado en `consultas`.
- Mantener las acciones posteriores al guardado existentes.

## Capabilities

### New Capabilities

### Modified Capabilities

- `clinical-consultations`: El formulario de nueva consulta presenta secciones clinicas mas claras y campos narrativos multilínea.

## Impact

- `app/consultas/nueva/page.tsx`: cambios de layout y controles del formulario.
- `tests/playwright/consultorio.spec.ts`: cobertura de los nuevos campos multilínea en el flujo medico.
- Sin cambios de esquema PocketBase, migraciones ni scripts.
