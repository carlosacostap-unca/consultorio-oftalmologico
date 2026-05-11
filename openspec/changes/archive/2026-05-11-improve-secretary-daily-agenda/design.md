## Overview

La mejora se concentra en `/turnos`, especialmente en `viewMode === "daily"`. La vista diaria debe organizar la informacion por medico cuando la secretaria usa el filtro "Todos los medicos", y debe mantener una vista simple cuando hay un medico especifico seleccionado.

## UI Behavior

- El filtro de medico sigue siendo global.
- En vista diaria:
  - Si el usuario puede elegir medico y selecciona "Todos los medicos", se renderiza una seccion por medico con actividad o disponibilidad en el dia.
  - Si selecciona un medico especifico, se renderiza una sola agenda diaria para ese medico.
  - Si no hay turnos ni disponibilidades para un medico, esa seccion puede omitirse en modo "Todos" para evitar ruido.
- Cada seccion muestra:
  - Nombre del medico.
  - Cantidad de turnos del dia.
  - Bloques de disponibilidad del dia.
  - Turnos del dia ordenados por horario, con paciente, estado, tipo y acciones actuales.
- Cada bloque de disponibilidad incluye un acceso para crear un turno nuevo con `medico_id`, `fecha_hora`, `disponibilidad_id` y `tipo`.

## Data

Se reutilizan los datos ya cargados en `/turnos`:

- `medicos`
- `turnos` con `expand.paciente_id` y `expand.medico_id`
- `disponibilidades` con `expand.medico_id`
- `selectedMedicoId`
- `filterDate`

No se agregan endpoints ni campos.

## Edge Cases

- Medico sin disponibilidad pero con turnos: debe mostrarse.
- Medico con disponibilidad pero sin turnos: debe mostrarse con opcion de crear turno.
- Secretaria en "Todos": no debe mezclar turnos de distintos medicos en una unica lista ambigua.
- Rol medico: debe seguir bloqueado a su propio `medico_id`.
