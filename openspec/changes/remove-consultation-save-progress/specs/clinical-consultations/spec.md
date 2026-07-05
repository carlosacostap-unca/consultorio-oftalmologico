## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado con campos narrativos multilinea, contexto clinico previo del paciente disponible bajo demanda, auditoria de creacion, acciones de cierre asistidas al finalizar el guardado y una disposicion compacta de escritorio para monitores Full HD.

#### Scenario: Finalizar consulta desde carga principal
- **WHEN** el usuario completa una nueva consulta desde `/consultas/nueva`
- **THEN** el sistema muestra `Finalizar consulta` como accion de guardado
- **AND** no muestra la accion `Guardar avance`
- **AND** crea la consulta con estado `finalizada`
- **AND** si la consulta proviene de un turno, marca el turno como `Atendido`
