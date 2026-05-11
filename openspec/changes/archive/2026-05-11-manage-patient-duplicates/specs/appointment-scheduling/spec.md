## ADDED Requirements

### Requirement: Turnos reasignados por fusion de pacientes
El sistema SHALL conservar los turnos al fusionar pacientes duplicados.

#### Scenario: Fusion reasigna turnos
- **WHEN** un paciente duplicado se fusiona con un paciente principal
- **THEN** el sistema actualiza los turnos del duplicado para apuntar al paciente principal
- **AND** las agendas muestran esos turnos con el paciente principal

#### Scenario: Historial de turnos conservado
- **WHEN** la fusion finaliza correctamente
- **THEN** los turnos pasados y futuros del duplicado quedan en el historial del paciente principal
- **AND** no se eliminan turnos durante la fusion
