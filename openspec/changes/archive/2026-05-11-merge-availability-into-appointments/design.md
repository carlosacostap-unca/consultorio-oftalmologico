## Overview

La pantalla `/turnos` ya carga turnos y disponibilidades. Se agrega una vista `Disponibilidades` dentro de la misma pagina para crear, listar y eliminar bloques horarios disponibles.

## Decisions

- Se extiende `viewMode` con `availability` para mantener el patron existente de pestanas.
- La cabecera de `/turnos` conserva acciones de imprimir y crear turno; se elimina el boton que navegaba a `/turnos/disponibilidades`.
- La gestion de disponibilidades reutiliza la logica existente: formulario con fecha, hora inicio, hora fin y tipo; tabla con fecha, horario, tipo y accion eliminar.
- Despues de crear o eliminar una disponibilidad, la pantalla recarga las disponibilidades sin recargar turnos.
- `/turnos/disponibilidades` redirige a `/turnos` para evitar mantener dos experiencias.

## Risks

- La pagina de turnos ya es extensa; el cambio debe ser acotado para no alterar agenda semanal/diaria/lista.
- Si la coleccion `disponibilidades` no existe, el mensaje de error debe seguir siendo claro.

## Out of Scope

- Edicion de disponibilidades existentes.
- Cambios en la creacion de turnos regulares.
- Nueva API server-side para disponibilidades.
