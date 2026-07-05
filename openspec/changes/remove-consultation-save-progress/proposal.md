## Why

El boton `Guardar avance` permite dejar consultas en estado `en_curso`. Operativamente se decidio eliminar esa opcion de la pantalla de nueva consulta para evitar atenciones abiertas por error.

## What Changes

- Eliminar el boton `Guardar avance` de `/consultas/nueva`.
- Hacer que la creacion de una consulta desde esa pantalla finalice siempre la consulta.
- Mantener el boton `Finalizar consulta` como accion principal de guardado.
- Mantener el estado `en_curso` en el sistema para datos historicos o futuras pantallas, pero no ofrecerlo como accion en la carga normal.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `clinical-consultations`: la nueva consulta ya no ofrece guardar avance desde el formulario clinico principal.

## Impact

- Afecta `/consultas/nueva`.
- No cambia el esquema de PocketBase.
- No borra consultas historicas ni modifica estados existentes.
