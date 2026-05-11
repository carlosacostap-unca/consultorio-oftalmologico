## Why

El rol medico necesita una experiencia diaria mas directa que la agenda operativa general: al iniciar la jornada debe ver sus pacientes del dia, reconocer quien esta esperando y comenzar la consulta sin buscar manualmente entre modulos.

Ahora que el circuito de secretaria ya prepara turnos y estados, conviene cerrar el tramo siguiente del proceso: la atencion medica desde la llegada del paciente hasta la consulta clinica.

## What Changes

- Agregar una vista operativa para medico centrada en sus turnos del dia.
- Priorizar estados clinicos accionables: proximos, en espera, en consulta y atendidos.
- Permitir iniciar o continuar una consulta desde un turno del dia.
- Mantener acceso rapido a ficha del paciente e historial reciente sin abandonar el contexto de atencion.
- Conservar la agenda multi-medico para secretaria y limitar la experiencia medica al medico autenticado.
- No requiere cambios de esquema PocketBase en este primer bloque.

## Capabilities

### New Capabilities
- `doctor-daily-care-workflow`: Define la experiencia diaria del medico para revisar pacientes, iniciar consultas y continuar atenciones desde sus turnos.

### Modified Capabilities
- `appointment-scheduling`: La agenda de turnos incorpora una entrada especifica para el medico sobre sus turnos del dia y acciones de atencion.
- `clinical-consultations`: La creacion/continuacion de consulta desde turno queda definida como accion principal del flujo medico diario.

## Impact

- UI de `/turnos` para rol activo `medico`.
- Navegacion hacia `/consultas/nueva?paciente_id=<id>&turno_id=<id>` y `/consultas/<id>`.
- Pruebas Playwright de rol medico usando PocketBase de testing.
- Especificaciones OpenSpec de turnos y consultas.
