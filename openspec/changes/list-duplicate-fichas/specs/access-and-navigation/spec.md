## MODIFIED Requirements

### Requirement: Navegacion lateral autenticada
El sistema SHALL mostrar una barra lateral acorde al rol activo del usuario autenticado.

#### Scenario: Menu operativo de secretaria
- **WHEN** un usuario con rol activo `secretaria` navega por la aplicacion
- **THEN** la barra lateral muestra acceso a Turnos como herramienta principal de agenda
- **AND** la pantalla de turnos permite gestionar agendas de todos los medicos

#### Scenario: Menu operativo de medico
- **WHEN** un usuario con rol activo `medico` navega por la aplicacion
- **THEN** la barra lateral mantiene acceso a Turnos
- **AND** la pantalla de turnos prioriza la agenda propia del medico autenticado

#### Scenario: Menu de calidad de datos para admin
- **WHEN** un usuario con rol activo `admin` navega por la aplicacion
- **THEN** la barra lateral muestra la seccion "Calidad de datos"
- **AND** la seccion incluye accesos a "Duplicados" y "Fichas duplicadas"
