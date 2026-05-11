## Overview

La cancelacion debe ser una operacion reversible desde la perspectiva historica: el turno permanece registrado, pero queda marcado con estado `Cancelado` y se guarda un motivo textual en observaciones.

## Data

Se usa el campo existente `estado` con un nuevo valor `Cancelado`. El motivo se agrega a `observaciones` con una linea fechada de cancelacion.

No se crea una nueva coleccion ni un nuevo campo en esta primera version.

## UI

El modal de gestion de turno incorpora:

- Un campo breve "Motivo de cancelacion".
- Boton "Cancelar turno".
- El boton queda deshabilitado sin motivo.

La agenda diaria debe seguir mostrando el turno cancelado con una marca visual roja/gris y sin eliminarlo de la lista.

## Non Goals

- No se implementa reprogramacion todavia.
- No se elimina automaticamente la relacion con disponibilidad.
- No se ocultan turnos cancelados por defecto.
