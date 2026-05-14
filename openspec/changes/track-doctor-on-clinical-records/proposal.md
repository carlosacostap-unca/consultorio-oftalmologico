## Why

La historia clinica debe dejar claro que medico atendio cada consulta y que medico emitio cada receta. Esto mejora la trazabilidad clinica cuando el consultorio trabaja con mas de un medico y evita depender solamente del usuario logueado o del turno de origen.

## What Changes

- Agregar relacion `medico_id` en consultas para registrar el medico responsable de la atencion.
- Agregar relacion `medico_id` en recetas para registrar el medico emisor.
- Precargar el medico desde el turno asociado cuando la consulta nace desde agenda, o desde el usuario con rol medico cuando corresponde.
- Permitir que secretaria/admin seleccionen el medico responsable al crear consultas o recetas cuando no venga determinado por el contexto.
- Permitir completar manualmente el medico en registros historicos sin atribucion: admin/secretaria pueden elegir cualquier medico y el medico solo puede asignarse a si mismo.
- Mostrar el medico responsable en listados, detalles, impresiones y contexto clinico del paciente.
- No inferir ni modificar automaticamente datos historicos existentes.

## Capabilities

### New Capabilities

- `clinical-doctor-attribution`: Define la atribucion explicita de medico responsable en registros clinicos.

### Modified Capabilities

- `clinical-consultations`: Las consultas deben guardar, mostrar e imprimir el medico responsable.
- `prescriptions`: Las recetas deben guardar, mostrar e imprimir el medico emisor.
- `patient-clinical-timeline`: La historia clinica del paciente debe mostrar el medico asociado a consultas y recetas.
- `data-import-and-migration`: Los scripts administrativos deben asegurar schema sin modificar historicos automaticamente.

## Impact

- PocketBase: nuevos campos relation opcionales/obligatorios segun flujo en `consultas` y `recetas`.
- UI: formularios de nueva consulta, detalle/impresion de consulta, recetas, listados y ficha de paciente.
- API: rutas de consultas y recetas deben aceptar, validar y expandir `medico_id`.
- Scripts: migracion idempotente de schema sin backfill automatico.
- Tests: Playwright debe cubrir consulta y receta con medico responsable visible.
