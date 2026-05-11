## Overview

La pantalla `/turnos` ya carga turnos y disponibilidades en memoria. La nueva columna usa esos datos para contar relaciones por `disponibilidad_id` sin realizar consultas adicionales.

## Decisions

- El conteo se calcula en render por fila con `turnos.filter(...)`, suficiente para el volumen esperado de agenda.
- El campo `disponibilidad_id` se agrega al tipo local `Turno` como opcional.
- La columna se ubica entre `Tipo` y `Acciones`.

## Risks

- Turnos antiguos sin `disponibilidad_id` no se cuentan dentro de ninguna disponibilidad.
- Si a futuro crece mucho el volumen de turnos, el conteo podria memoizarse.

## Out of Scope

- Mostrar capacidad maxima o cupos restantes.
- Contar sobreturnos no vinculados a una disponibilidad.
