## Overview

Se reutiliza el modal de alta rapida de turno para un segundo modo: sobreturno. El modo se determina al abrir el modal desde un slot ocupado. La UI debe ser muy clara para evitar que la secretaria confunda un turno regular con un sobreturno.

## UI

- Slot libre: mantiene alta rapida regular.
- Slot ocupado: pasa de chip informativo a boton de sobreturno.
- Modal en modo sobreturno:
  - Titulo "Alta rapida de sobreturno".
  - Badge o texto indicando que el horario ya esta ocupado.
  - Contexto del paciente/turno existente cuando esta disponible.
  - Selector de tipo de sobreturno.
  - Boton "Guardar sobreturno".

## Data

El sobreturno crea un registro en `turnos` con:

- `es_sobreturno: true`
- `sobreturno_tipo`
- `medico_id`
- `fecha_hora`
- `paciente_id`
- `motivo`
- `observaciones`
- `duracion`
- `tipo`

No debe ejecutar la validacion de solapamiento que bloquea turnos regulares.

## Non Goals

- No se implementa reprogramacion de turnos.
- No se cambia la pantalla completa de sobreturnos.
- No se agregan limites por cantidad de sobreturnos.
