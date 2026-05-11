## ADDED Requirements

### Requirement: Listado diario imprimible por medico
El sistema SHALL permitir que secretaria genere un listado imprimible de turnos por fecha y medico.

#### Scenario: Imprimir agenda de un medico
- **WHEN** secretaria abre el modal de impresion desde Gestion de Turnos y selecciona una fecha y un medico
- **THEN** el sistema abre un listado imprimible con solo los turnos de ese medico para esa fecha
- **AND** muestra hora, paciente, DNI, telefono, obra social, tipo, motivo, estado y observaciones segun los campos elegidos

#### Scenario: Imprimir todas las agendas
- **WHEN** secretaria selecciona `Todos los medicos` en el modal de impresion
- **THEN** el sistema abre un listado imprimible agrupado por medico
- **AND** cada grupo muestra sus turnos ordenados por hora

#### Scenario: Imprimir desde contexto actual
- **WHEN** secretaria esta filtrando Gestion de Turnos por medico y abre el modal de impresion
- **THEN** el medico del modal queda preseleccionado con el medico actual
- **AND** la fecha queda preseleccionada con la fecha activa o la fecha actual si no habia fecha
