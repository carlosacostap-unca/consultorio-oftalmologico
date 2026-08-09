## MODIFIED Requirements

### Requirement: Impresion de informe clinico de consulta
El sistema SHALL generar una hoja imprimible de la consulta clinica completa y resolver sus antecedentes de forma coherente con la revisión clínica de esa consulta.

#### Scenario: Imprimir informe clinico
- **WHEN** el usuario abre `/consultas/[id]/imprimir`
- **THEN** el sistema carga la consulta con paciente expandido
- **AND** muestra paciente, fecha, motivo, antecedentes, examen oftalmologico, refraccion, diagnostico y tratamiento
- **AND** muestra las recetas asociadas a la consulta cuando existan

#### Scenario: Imprimir una consulta legacy con enfermedad de base
- **WHEN** el usuario imprime una consulta que no tiene registrado un antecedente fijo y el paciente expandido sí lo tiene activo
- **THEN** el informe muestra el antecedente activo del paciente
- **AND** conserva también los antecedentes verdaderos registrados en la consulta
- **AND** no modifica la consulta ni la ficha del paciente
