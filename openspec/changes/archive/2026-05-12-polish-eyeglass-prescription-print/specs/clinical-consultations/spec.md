## MODIFIED Requirements

### Requirement: Impresion de receta de anteojos
El sistema SHALL generar una hoja imprimible de refraccion de lejos y cerca desde una consulta con datos completos del paciente y contexto clinico.

#### Scenario: Imprimir anteojos
- **WHEN** el usuario abre `/consultas/[id]/imprimir-anteojos`
- **THEN** el sistema carga la consulta con paciente expandido
- **AND** muestra datos del paciente, documento, ficha, cobertura y fecha cuando existan
- **AND** muestra tablas de LEJOS y CERCA para OD y OI con esferico, cilindrico y eje
- **AND** muestra ADD, diagnostico u observaciones clinicas cuando existan
- **AND** permite volver a la consulta desde la vista imprimible
