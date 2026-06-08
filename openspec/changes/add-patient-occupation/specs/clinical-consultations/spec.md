## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado con campos narrativos multilinea, contexto clinico previo del paciente disponible bajo demanda, auditoria de creacion, acciones de cierre asistidas al finalizar el guardado y una disposicion compacta de escritorio para monitores Full HD.

#### Scenario: Mostrar ocupacion en carga inicial
- **WHEN** el usuario selecciona o abre una nueva consulta con paciente
- **THEN** el sistema muestra la ocupacion del paciente en la misma fila que edad, obra social y domicilio cuando este disponible
- **AND** mantiene la fila legible en escritorio y apilada en pantallas angostas

### Requirement: Navegacion clinica entre consultas
El sistema SHALL permitir navegar dentro del historial de consultas del mismo paciente y revisar una consulta existente con contexto clinico resumido y continuidad de acciones.

#### Scenario: Mostrar ocupacion en consulta existente
- **WHEN** se abre una consulta existente asociada a un paciente con ocupacion cargada
- **THEN** el sistema muestra la ocupacion junto con los datos resumidos del paciente
- **AND** la muestra tambien en la fila de datos iniciales del paciente de la consulta
