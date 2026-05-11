## Overview

La tabla integrada de disponibilidades en `/turnos` se convierte en una lista navegable. Cada fila abre una ruta dinamica con los datos de la disponibilidad y los turnos vinculados por `disponibilidad_id`.

## Decisions

- La ruta de detalle sera `/turnos/disponibilidades/[id]`.
- La fila se hace clickeable con `onClick` y soporte de teclado para mantener la estructura de tabla.
- La pantalla de detalle carga la disponibilidad por id y los turnos filtrados por `disponibilidad_id`.
- La edicion actualiza el registro `disponibilidades` con `fecha_hora_inicio`, `fecha_hora_fin` y `tipo`.
- La eliminacion confirma la accion y vuelve a `/turnos`.

## Risks

- Si existen turnos vinculados, eliminar una disponibilidad puede dejar esos turnos sin bloque asociado; por eso se conserva una confirmacion explicita.
- Si un turno antiguo no tiene `disponibilidad_id`, no aparecera en el detalle.

## Out of Scope

- Reasignar turnos a otra disponibilidad.
- Validar capacidad maxima o solapamientos.
