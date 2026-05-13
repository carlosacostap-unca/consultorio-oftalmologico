## Modified Requirements

### Requirement: Impresion de receta medica
El sistema SHALL permitir imprimir una receta medica guardada con datos completos del paciente, contenido indicado y contexto clinico cuando la receta este vinculada a una consulta.

#### Scenario: Abrir receta imprimible
- **WHEN** el usuario abre `/recetas/[id]/imprimir`
- **THEN** el sistema carga la receta con paciente y consulta expandidos
- **AND** muestra paciente, fecha, documento, ficha, obra social y afiliado cuando existan
- **AND** muestra medicamentos e indicaciones en formato imprimible
- **AND** muestra motivo, diagnostico y tratamiento de la consulta vinculada cuando existan
- **AND** permite volver a la receta guardada
- **AND** permite volver a la consulta vinculada cuando exista

#### Scenario: Imprimir desde receta
- **WHEN** el usuario esta viendo una receta guardada
- **THEN** el sistema muestra una accion para abrir `/recetas/[id]/imprimir`
