## ADDED Requirements

### Requirement: Configuracion de horarios medicos
El sistema SHALL permitir administrar horarios recurrentes de medicos desde configuracion.

#### Scenario: Acceso admin a horarios medicos
- **WHEN** un admin con rol activo `admin` abre configuracion
- **THEN** el sistema ofrece una opcion `Horarios medicos`
- **AND** permite crear, editar, activar y desactivar reglas semanales por medico

#### Scenario: Secretaria gestiona horarios medicos
- **WHEN** una secretaria con permiso de turnos abre la configuracion operativa de agenda
- **THEN** el sistema permite gestionar reglas semanales de los medicos
- **AND** no expone opciones administrativas ajenas a la agenda

### Requirement: Configuracion de bloqueos y feriados
El sistema SHALL permitir administrar bloqueos por medico y bloqueos generales del consultorio.

#### Scenario: Crear feriado o cierre general
- **WHEN** admin o secretaria crea un bloqueo general
- **THEN** el sistema lo trata como feriado o cierre del consultorio
- **AND** aplica el bloqueo a todos los medicos y tipos de atencion

#### Scenario: Ver bloqueos existentes
- **WHEN** admin o secretaria abre `Bloqueos y feriados`
- **THEN** el sistema lista bloqueos generales y bloqueos por medico
- **AND** permite identificar alcance, fechas, horario, motivo y creador
