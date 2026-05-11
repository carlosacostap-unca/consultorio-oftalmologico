## ADDED Requirements

### Requirement: Seleccion operativa excluye pacientes fusionados
El sistema SHALL evitar que secretaria seleccione pacientes fusionados durante el otorgamiento de turnos.

#### Scenario: Buscar paciente en turnos
- **WHEN** secretaria busca pacientes desde Gestion de Turnos
- **THEN** el sistema muestra solo pacientes activos
- **AND** excluye pacientes marcados como fusionados

#### Scenario: Ficha rapida de paciente fusionado
- **WHEN** secretaria abre una ficha rapida de un paciente que fue fusionado
- **THEN** el sistema informa que el paciente fue fusionado
- **AND** ofrece abrir la ficha del paciente principal
