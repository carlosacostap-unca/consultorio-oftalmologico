## Why

El formulario clinico muestra la fecha con el control nativo del navegador. En equipos con configuracion regional distinta, el mismo dato puede verse como `mm/dd/aaaa`, lo que genera confusion operativa. Ademas, el medico responsable puede mostrarse como no registrado cuando la consulta conserva `medico_id` pero la pantalla no resuelve todavia el nombre desde la lista o desde el registro expandido.

## What Changes

- Mostrar las fechas de consulta con formato fijo `dd/mm/aaaa` en la carga y visualizacion de consultas, sin depender de la configuracion regional del navegador.
- Mantener internamente el valor normalizado de fecha clinica para guardar y validar como hasta ahora.
- Resolver el medico responsable desde la lista de medicos y, en consultas existentes, tambien desde el medico expandido de la consulta.
- Mantener visible el medico responsable para usuarios con rol medico, secretaria o admin cuando la consulta tenga medico asignado.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `clinical-consultations`: fija la visualizacion de fecha y mejora la resolucion del medico responsable.

## Impact

- Afecta `/consultas/nueva` y `/consultas/[id]`.
- Agrega un control reutilizable de fecha clinica en formato `dd/mm/aaaa`.
- No cambia el formato persistido en PocketBase ni las reglas actuales de asignacion medica.
