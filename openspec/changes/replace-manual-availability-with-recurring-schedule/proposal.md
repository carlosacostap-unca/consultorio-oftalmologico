## Why

La carga manual de disponibilidades semana a semana agrega friccion operativa y obliga a secretaria y medicos a mantener bloques repetitivos que, en la practica, suelen ser horarios estables. El modelo deseado invierte la logica: cada medico tiene una agenda semanal recurrente y el sistema solo registra excepciones mediante bloqueos.

## What Changes

- Agregar agenda semanal recurrente por medico.
- Permitir reglas por tipo de atencion: `Consulta`, `Estudio` y `Cirugia`.
- Usar duracion configurable por regla, con `Consulta` en 15 minutos por defecto.
- Agregar bloqueos por medico y bloqueos generales del consultorio.
- Permitir que admin y secretaria gestionen horarios y bloqueos de cualquier medico.
- Permitir que un medico bloquee solo su propia agenda.
- Generar slots disponibles desde la agenda semanal, restando turnos otorgados y bloqueos.
- Permitir crear bloqueos aunque afecten turnos ya otorgados.
- Detectar turnos en conflicto cuando caen dentro de un bloqueo posterior.
- Mostrar una bandeja especial de `Turnos a resolver`.
- Mantener disponibilidades actuales durante una etapa de transicion, sin eliminarlas de inmediato.

## Capabilities

### New Capabilities
- `recurring-medical-schedule`: Reglas semanales, bloqueos, feriados y deteccion de conflictos de agenda.

### Modified Capabilities
- `appointment-scheduling`: La agenda de turnos debe usar slots generados desde reglas recurrentes y mostrar conflictos.
- `secretary-appointment-assignment`: El otorgamiento de turnos debe operar sobre horarios generados automaticamente.
- `doctor-daily-care-workflow`: El medico debe poder bloquear su propia agenda y ver conflictos relevantes.
- `administration-and-settings`: La configuracion administrativa debe incluir horarios medicos, bloqueos y feriados.

## Impact

- Requiere nuevas colecciones PocketBase para horarios semanales y bloqueos.
- Afecta `/turnos`, `/turnos/nuevo`, agenda diaria, reprogramacion y alta rapida.
- Afecta permisos por rol y navegacion administrativa.
- Afecta pruebas Playwright de otorgamiento, agenda diaria y roles.
- No elimina de inmediato la coleccion `disponibilidades`; queda como compatibilidad transitoria.
