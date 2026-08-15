## MODIFIED Requirements

### Requirement: Edicion protegida de consultas
El sistema SHALL limitar la edicion de consultas segun la configuracion `consulta_edit_limit_days`.

#### Scenario: Accion de edicion visible para medico
- **WHEN** un medico abre una consulta existente en modo lectura
- **AND** la fecha de consulta esta dentro del limite permitido
- **THEN** el sistema muestra una accion para editar la consulta
- **AND** la accion navega a `/consultas/<id>` sin `mode=view`

#### Scenario: Accion de edicion oculta fuera de limite
- **WHEN** un medico abre una consulta existente en modo lectura
- **AND** la fecha de consulta es anterior al limite configurado
- **THEN** el sistema no muestra la accion para editar la consulta
