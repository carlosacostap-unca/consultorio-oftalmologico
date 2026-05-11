## Overview

La implementacion se concentra en `/turnos`. Cada bloque de disponibilidad de la vista diaria ofrecera un boton de alta rapida que abre un modal local. El modal crea un registro en `turnos` usando PocketBase y actualiza el estado local al terminar.

## UI

El modal debe mostrar contexto de agenda:

- Medico.
- Fecha y hora inicial.
- Tipo y disponibilidad.

Campos editables:

- Paciente mediante busqueda local por apellido, nombre o DNI.
- Motivo.
- Observaciones.
- Duracion con valor inicial `15` para consulta.

Acciones:

- Guardar turno.
- Cancelar.
- Abrir formulario completo cuando el flujo rapido no alcance.

## Data

Se reutilizan `medicos`, `pacientes`, `turnos` y `disponibilidades`. Si la lista local de pacientes no contiene coincidencias suficientes, el modal puede consultar PocketBase con `getList`.

Al guardar se crea `turnos` con:

- `paciente_id`
- `medico_id`
- `fecha_hora`
- `disponibilidad_id`
- `tipo`
- `duracion`
- `estado`
- `motivo`
- `observaciones`

## Validation

- Requiere paciente y motivo.
- Requiere medico y disponibilidad.
- Bloquea solapamiento simple con turnos existentes del mismo medico para el mismo dia.

## Non Goals

- No reemplaza todavia el formulario completo de `/turnos/nuevo`.
- No implementa grilla completa de huecos libres por intervalos; queda para una mejora posterior.
