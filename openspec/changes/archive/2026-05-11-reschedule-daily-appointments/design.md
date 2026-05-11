## Overview

La reprogramacion vive en el modal de gestion de turno. El usuario selecciona una fecha y medico; el sistema lista disponibilidades del dia con slots libres. Al elegir un slot, se actualiza el turno existente.

## UI

En el modal de gestion:

- Boton/seccion "Reprogramar".
- Fecha destino.
- Medico destino, editable solo cuando el rol permite elegir medicos.
- Lista de slots libres por disponibilidad.
- Boton "Reprogramar turno".

## Data

Se actualiza el registro `turnos` existente con:

- `fecha_hora`
- `medico_id`
- `disponibilidad_id`
- `tipo`
- `duracion`
- `observaciones`

La nota en observaciones registra la fecha/hora anterior y la nueva.

## Validation

- Requiere seleccionar un slot libre.
- No permite seleccionar slots ocupados.
- Para medico activo, mantiene la agenda del propio medico.

## Non Goals

- No se reprograman sobreturnos hacia slots ocupados.
- No se agrega historial estructurado separado.
- No se implementa reprogramacion drag-and-drop.
