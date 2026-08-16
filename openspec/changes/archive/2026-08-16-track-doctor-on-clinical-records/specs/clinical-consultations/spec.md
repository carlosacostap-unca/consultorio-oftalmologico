## ADDED Requirements

### Requirement: Medico responsable de consulta
El sistema SHALL guardar, expandir, mostrar e imprimir el medico responsable de cada consulta clinica.

#### Scenario: Consulta iniciada desde turno
- **WHEN** se crea una consulta desde un turno con `medico_id`
- **THEN** la consulta guarda ese medico como responsable
- **AND** el detalle de la consulta muestra el nombre del medico

#### Scenario: Consulta libre con seleccion de medico
- **WHEN** se crea una consulta sin turno asociado
- **THEN** el formulario determina el medico desde el usuario medico activo o permite seleccionarlo
- **AND** el sistema no guarda la consulta sin medico responsable cuando el usuario debe seleccionarlo manualmente

#### Scenario: Listado e impresion de consulta
- **WHEN** el usuario ve el listado, detalle o impresion de una consulta
- **THEN** el sistema muestra el medico responsable cuando exista
- **AND** muestra "Medico no registrado" cuando no exista atribucion historica

#### Scenario: Editar medico de consulta
- **WHEN** un usuario con permisos administrativos edita una consulta
- **THEN** puede corregir el medico responsable
- **AND** el cambio queda guardado en `consultas.medico_id`
