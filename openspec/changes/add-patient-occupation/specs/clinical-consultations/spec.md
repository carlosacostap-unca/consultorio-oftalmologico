## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado con campos narrativos multilinea, contexto clinico previo del paciente disponible bajo demanda, auditoria de creacion, acciones de cierre asistidas al finalizar el guardado y una disposicion compacta de escritorio para monitores Full HD.

#### Scenario: Mostrar ocupacion en carga inicial
- **WHEN** el usuario selecciona o abre una nueva consulta con paciente
- **THEN** el sistema muestra la ocupacion del paciente en la misma fila que edad, obra social y domicilio cuando este disponible
- **AND** mantiene la fila legible en escritorio y apilada en pantallas angostas
