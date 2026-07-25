## MODIFIED Requirements

### Requirement: Auditoria de consultas
El sistema SHALL registrar y mostrar eventos de auditoria asociados a cada consulta clinica.

#### Scenario: Reparar consulta sin auditoria
- **WHEN** una consulta creada por la app no tiene registros en `consulta_eventos`
- **THEN** el sistema operativo de mantenimiento puede generar un evento retroactivo minimo
- **AND** el evento conserva la referencia a consulta, paciente, medico asignado, fecha original y motivo cuando existan
- **AND** el proceso debe ofrecer dry-run antes de crear registros
