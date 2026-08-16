## ADDED Requirements

### Requirement: Atribucion medica explicita
El sistema SHALL registrar el medico responsable en los registros clinicos que correspondan, usando una relacion a usuarios con rol medico.

#### Scenario: Registro con medico conocido
- **WHEN** se crea una consulta o receta con medico determinado por turno, consulta vinculada, usuario medico o seleccion manual
- **THEN** el sistema guarda ese medico en `medico_id`
- **AND** el registro conserva esa atribucion aunque luego cambie el contexto de navegacion

#### Scenario: Registro historico sin medico registrado
- **WHEN** un registro clinico existente no tiene medico registrado
- **THEN** el sistema conserva el registro sin bloquear su visualizacion
- **AND** muestra que el medico no esta registrado

### Requirement: Seleccion de medico responsable
El sistema SHALL permitir seleccionar medico responsable cuando el flujo clinico no lo determine automaticamente.

#### Scenario: Secretaria crea registro sin turno
- **WHEN** una secretaria o admin crea una consulta o receta libre
- **THEN** el sistema permite seleccionar el medico responsable
- **AND** exige la seleccion antes de guardar cuando no exista otro medico determinado por contexto

#### Scenario: Medico crea registro clinico
- **WHEN** un usuario con rol medico crea una consulta o receta
- **THEN** el sistema precarga su propio usuario como medico responsable
- **AND** no le permite asignar el registro a otro medico salvo que cambie a un rol operativo con permisos

#### Scenario: Completar historico por secretaria o admin
- **WHEN** una secretaria o admin edita un registro historico sin medico
- **THEN** el sistema permite asignar cualquier usuario con rol medico

#### Scenario: Completar historico por medico
- **WHEN** un medico edita un registro historico sin medico
- **THEN** el sistema solo permite asignar su propio usuario como medico responsable
