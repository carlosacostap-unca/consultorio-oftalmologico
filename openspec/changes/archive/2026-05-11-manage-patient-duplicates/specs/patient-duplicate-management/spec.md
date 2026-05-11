## ADDED Requirements

### Requirement: Revision administrativa de duplicados
El sistema SHALL permitir que un usuario admin revise posibles pacientes duplicados antes de ejecutar cualquier fusion.

#### Scenario: Listar candidatos de duplicado
- **WHEN** un admin abre la pantalla de gestion de duplicados
- **THEN** el sistema muestra candidatos agrupados por coincidencias de documento, telefono, ficha o nombre parecido
- **AND** muestra datos administrativos suficientes para identificar cada paciente

#### Scenario: Buscar duplicados manualmente
- **WHEN** un admin busca por nombre, apellido, documento, telefono o ficha
- **THEN** el sistema muestra pacientes coincidentes
- **AND** permite seleccionar dos pacientes para compararlos

### Requirement: Comparacion previa a fusion
El sistema SHALL comparar dos pacientes lado a lado antes de permitir fusionarlos.

#### Scenario: Comparar pacientes
- **WHEN** un admin selecciona dos pacientes para revisar
- **THEN** el sistema muestra datos personales, documento, telefono, obra social, numero de ficha y estado del registro de cada paciente
- **AND** muestra conteos de turnos, consultas y recetas asociadas a cada paciente

#### Scenario: Elegir paciente principal
- **WHEN** el admin revisa dos pacientes comparados
- **THEN** el sistema permite elegir cual sera el paciente principal
- **AND** identifica al otro como paciente duplicado a archivar

### Requirement: Fusion controlada de pacientes
El sistema SHALL fusionar pacientes duplicados solo mediante una confirmacion explicita del usuario autorizado.

#### Scenario: Confirmar fusion
- **WHEN** un admin confirma fusionar un paciente duplicado en un paciente principal
- **THEN** el sistema exige confirmacion explicita antes de ejecutar la operacion
- **AND** informa que turnos, consultas y recetas se reasignaran al paciente principal

#### Scenario: Reasignar referencias
- **WHEN** se ejecuta la fusion
- **THEN** el sistema actualiza `paciente_id` en turnos, consultas y recetas que pertenecian al paciente duplicado
- **AND** esas referencias quedan asociadas al paciente principal

#### Scenario: Marcar duplicado fusionado
- **WHEN** la fusion termina correctamente
- **THEN** el sistema marca el paciente duplicado como fusionado o archivado
- **AND** guarda referencia al paciente principal, fecha de fusion, usuario ejecutor y motivo cuando exista

#### Scenario: Resultado de fusion
- **WHEN** la fusion finaliza
- **THEN** el sistema muestra un resumen con conteos de turnos, consultas y recetas reasignadas
- **AND** ofrece abrir la ficha del paciente principal

### Requirement: Seguridad de fusion
El sistema SHALL restringir la fusion de pacientes a usuarios con rol activo `admin`.

#### Scenario: Admin fusiona pacientes
- **WHEN** un usuario con rol activo `admin` solicita fusionar pacientes
- **THEN** el sistema autoriza la operacion si ambos pacientes existen y son distintos

#### Scenario: Usuario no autorizado
- **WHEN** un usuario sin rol activo `admin` intenta fusionar pacientes
- **THEN** el sistema rechaza la operacion
- **AND** no modifica pacientes ni referencias relacionadas

#### Scenario: Paciente ya fusionado
- **WHEN** el usuario intenta usar como duplicado un paciente ya fusionado
- **THEN** el sistema bloquea la operacion
- **AND** muestra el paciente principal al que ya fue asociado

### Requirement: Trazabilidad de paciente fusionado
El sistema SHALL conservar acceso administrativo a pacientes fusionados y mostrar su relacion con el paciente principal.

#### Scenario: Ver paciente fusionado
- **WHEN** un usuario autorizado abre la ficha de un paciente fusionado
- **THEN** el sistema muestra que el registro fue fusionado
- **AND** ofrece un enlace a la ficha del paciente principal

#### Scenario: No borrar duplicado
- **WHEN** un paciente se fusiona con otro
- **THEN** el sistema conserva el registro duplicado
- **AND** no lo elimina fisicamente de PocketBase
