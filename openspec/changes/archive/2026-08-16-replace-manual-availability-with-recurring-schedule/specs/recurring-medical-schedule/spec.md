## ADDED Requirements

### Requirement: Agenda semanal recurrente por medico
El sistema SHALL permitir configurar horarios semanales recurrentes para cada medico agendable.

#### Scenario: Crear regla semanal de consulta
- **WHEN** admin o secretaria crea una regla semanal para un medico con tipo `Consulta`
- **THEN** el sistema guarda medico, dia de semana, hora inicio, hora fin, tipo, duracion y estado activo
- **AND** usa 15 minutos como duracion por defecto si no se indica otra duracion

#### Scenario: Crear regla semanal de estudio o cirugia
- **WHEN** admin o secretaria crea una regla semanal con tipo `Estudio` o `Cirugia`
- **THEN** el sistema exige una duracion de turno valida
- **AND** la regla queda disponible para generar slots de ese tipo

#### Scenario: Activar o desactivar regla semanal
- **WHEN** admin o secretaria desactiva una regla semanal
- **THEN** el sistema deja de generar slots futuros desde esa regla
- **AND** conserva la regla para auditoria operativa y posible reactivacion

### Requirement: Bloqueos de agenda
El sistema SHALL permitir registrar bloqueos por medico y bloqueos generales del consultorio.

#### Scenario: Crear bloqueo por medico
- **WHEN** admin, secretaria o el medico propietario crea un bloqueo para un medico
- **THEN** el sistema guarda medico, fechas, rango horario o dia completo, motivo y usuario creador
- **AND** el bloqueo impide otorgar turnos regulares en la franja afectada

#### Scenario: Medico bloquea solo su agenda
- **WHEN** un usuario con rol activo `medico` crea un bloqueo
- **THEN** el sistema permite bloquear solo su propio medico
- **AND** rechaza bloqueos sobre agendas de otros medicos

#### Scenario: Crear bloqueo general
- **WHEN** admin o secretaria crea un bloqueo general del consultorio
- **THEN** el sistema aplica el bloqueo a todos los medicos
- **AND** aplica el bloqueo a `Consulta`, `Estudio` y `Cirugia`

### Requirement: Slots generados por reglas y bloqueos
El sistema SHALL generar horarios disponibles combinando agenda semanal, turnos otorgados y bloqueos.

#### Scenario: Generar slots desde regla activa
- **WHEN** se consulta una fecha con reglas semanales activas
- **THEN** el sistema genera slots entre hora inicio y hora fin
- **AND** usa la duracion configurada en la regla

#### Scenario: Omitir slots bloqueados
- **WHEN** un slot cae dentro de un bloqueo por medico o general
- **THEN** el sistema lo muestra como bloqueado o lo excluye de la seleccion regular
- **AND** no permite otorgar turno regular sobre ese slot

#### Scenario: Turno otorgado ocupa slot
- **WHEN** ya existe un turno regular para el mismo medico y horario
- **THEN** el sistema muestra el slot como ocupado
- **AND** no lo ofrece como turno regular libre

### Requirement: Conflictos por bloqueos posteriores
El sistema SHALL detectar turnos otorgados que quedan dentro de bloqueos creados posteriormente.

#### Scenario: Bloqueo pisa turnos otorgados
- **WHEN** un usuario crea un bloqueo que cubre turnos ya otorgados
- **THEN** el sistema permite crear el bloqueo
- **AND** informa que existen turnos afectados
- **AND** esos turnos quedan visibles como turnos en conflicto

#### Scenario: Conflicto dinamico
- **WHEN** se modifica o elimina un bloqueo
- **THEN** el sistema recalcula los conflictos visibles
- **AND** un turno deja de figurar en conflicto si ya no cae dentro de un bloqueo vigente
