## ADDED Requirements

### Requirement: Bandeja de consultas en curso
El sistema SHALL permitir identificar y retomar consultas con `estado = en_curso` desde una superficie operativa medica.

#### Scenario: Listar consultas en curso
- **WHEN** el medico abre una pantalla operativa que incluye la bandeja de consultas en curso
- **THEN** el sistema consulta registros de `consultas` con `estado = en_curso`
- **AND** muestra paciente, fecha, motivo y estado cuando esten disponibles

#### Scenario: Retomar consulta en curso
- **WHEN** el medico selecciona una consulta en curso desde la bandeja
- **THEN** el sistema navega a `/consultas/<id>`
- **AND** permite continuar la edicion si la consulta esta dentro del limite permitido
