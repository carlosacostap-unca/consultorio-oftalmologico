## Overview

La vista diaria ya agrupa disponibilidades por medico. Este cambio reemplaza el boton unico por disponibilidad por una fila de chips calculados a partir del rango horario del bloque.

## Slot Calculation

- Para `Consulta`, usar intervalos de 15 minutos.
- Para `Estudio` y `Cirugia`, usar intervalos de 60 minutos como valor inicial simple.
- Un slot esta ocupado si se solapa con un turno del mismo medico usando `fecha_hora` y `duracion`.
- El slot libre abre el modal de alta rapida con esa `fechaHora`.

## UI

Cada disponibilidad muestra:

- Encabezado con rango horario y tipo.
- Chips libres con hora.
- Chips ocupados con hora y, cuando existe, apellido/nombre del paciente.

Los chips deben ser compactos y no romper la lectura de la agenda diaria.

## Non Goals

- No se implementa sobreturno desde slot ocupado.
- No se agregan configuraciones de duracion por tipo.
- No se cambia la pantalla de formulario completo.
