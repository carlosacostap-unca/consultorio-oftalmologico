## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado con campos narrativos multilinea, contexto clinico previo del paciente disponible bajo demanda, auditoria de creacion, acciones de cierre asistidas al finalizar el guardado y una disposicion compacta de escritorio para monitores Full HD.

#### Scenario: Mostrar fecha clinica en formato local fijo
- **WHEN** el usuario abre o edita la fecha de una nueva consulta
- **THEN** el sistema muestra la fecha como `dd/mm/aaaa`
- **AND** no depende del idioma o configuracion regional del navegador
- **AND** conserva internamente la fecha clinica normalizada para guardar la consulta

### Requirement: Navegacion clinica entre consultas
El sistema SHALL permitir navegar dentro del historial de consultas del mismo paciente y revisar una consulta existente con contexto clinico resumido y continuidad de acciones.

#### Scenario: Mostrar fecha y medico responsable de consulta existente
- **WHEN** un usuario con rol medico, secretaria o admin abre una consulta existente
- **THEN** el sistema muestra la fecha de la consulta como `dd/mm/aaaa`
- **AND** muestra el medico responsable cuando la consulta tiene `medico_id`
- **AND** resuelve el nombre del medico desde la lista de medicos o desde el medico expandido de la consulta
