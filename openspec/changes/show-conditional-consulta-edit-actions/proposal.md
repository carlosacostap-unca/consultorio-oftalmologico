## Why

Los medicos pueden editar consultas dentro del plazo configurado, pero cuando ingresan por una vista de lectura o desde la ficha del paciente no siempre tienen una accion visible para pasar a edicion. Esto genera la percepcion de que la interfaz no permite editar aunque el permiso exista.

## What Changes

- Mostrar una accion "Editar consulta" en la vista de solo lectura de una consulta cuando el rol activo sea medico y la consulta este dentro del plazo de edicion.
- Mostrar una accion "Editar" en la ficha del paciente para eventos/listados de consultas editables por medico.
- Ocultar esas acciones cuando la consulta exceda el plazo configurado o el usuario no este operando como medico.

## Capabilities

### Modified Capabilities
- `clinical-consultations`: La revision de una consulta debe ofrecer una accion de edicion condicionada por rol medico y ventana de edicion.
- `patient-clinical-timeline`: La ficha clinica del paciente debe exponer edicion de consultas solo cuando el medico pueda realizarla.

## Impact

- Afecta `/consultas/[id]` y `/pacientes/[id]`.
- Reutiliza `consultaEditLimitDays` existente; no modifica reglas de PocketBase ni el API de guardado.
- Requiere validar que las acciones aparecen dentro del plazo y desaparecen fuera de el.
