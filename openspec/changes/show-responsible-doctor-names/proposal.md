## Why

Los medicos necesitan ver el nombre del medico responsable de cada consulta, incluso cuando la consulta pertenece a otro medico. Actualmente algunas pantallas dependen de `expand=medico_id` desde el cliente, pero las reglas de PocketBase para `users` limitan la vista al propio usuario y pueden impedir mostrar otros nombres.

## What Changes

- Usar el endpoint interno `/api/medicos` como fuente de nombres de medicos en pantallas de consultas.
- Mantener el `medico_id` grabado en la consulta como fuente de responsabilidad.
- Mostrar siempre el medico responsable durante la carga de una nueva consulta usando el usuario medico autenticado y, si hace falta, la lista interna de medicos.
- Reforzar que la creacion de consultas desde el API sea realizada por el propio usuario con rol medico.

## Capabilities

### Modified Capabilities
- `clinical-consultations`: Las consultas deben mostrar el nombre del medico responsable aunque el medico logueado no sea el responsable de esa consulta.

## Impact

- Afecta `/consultas`, `/pacientes/[id]` y la visualizacion de nueva consulta.
- Afecta `POST /api/consultas` para no aceptar creaciones asignadas a otro medico desde roles no medicos.
- No modifica schema ni reglas de PocketBase.
- Reutiliza `/api/medicos`, que ya valida autenticacion y consulta usuarios con credenciales de servidor.
