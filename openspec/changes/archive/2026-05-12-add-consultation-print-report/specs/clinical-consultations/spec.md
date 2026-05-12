## MODIFIED Requirements

### Requirement: Navegacion clinica entre consultas
El sistema SHALL permitir navegar dentro del historial de consultas del mismo paciente y revisar una consulta existente con contexto clinico resumido y continuidad de acciones.

#### Scenario: Consultas relacionadas del paciente
- **WHEN** se abre una consulta existente
- **THEN** el sistema carga las consultas del mismo paciente ordenadas por fecha y creacion
- **AND** identifica primera, anterior y posterior respecto de la consulta actual

#### Scenario: Resumen de consulta existente
- **WHEN** se abre una consulta existente
- **THEN** el sistema muestra una cabecera con paciente, fecha, edad, ficha y obra social cuando esten disponibles
- **AND** muestra un resumen clinico con motivo, diagnostico, tratamiento, PIO, AV, refraccion y antecedentes activos
- **AND** muestra un panel de continuidad clinica con estado de diagnostico, tratamiento, recetas emitidas y datos clave del paciente

#### Scenario: Acciones clinicas desde detalle
- **WHEN** se abre una consulta existente
- **THEN** el sistema permite crear receta vinculada a la consulta y al paciente
- **AND** permite imprimir anteojos desde la consulta
- **AND** permite imprimir un informe clinico de la consulta
- **AND** permite abrir el paciente y crear una nueva consulta para el mismo paciente
- **AND** mantiene esas acciones visibles en el panel de continuidad

## ADDED Requirements

### Requirement: Impresion de informe clinico de consulta
El sistema SHALL generar una hoja imprimible de la consulta clinica completa.

#### Scenario: Imprimir informe clinico
- **WHEN** el usuario abre `/consultas/[id]/imprimir`
- **THEN** el sistema carga la consulta con paciente expandido
- **AND** muestra paciente, fecha, motivo, antecedentes, examen oftalmologico, refraccion, diagnostico y tratamiento
- **AND** muestra las recetas asociadas a la consulta cuando existan
