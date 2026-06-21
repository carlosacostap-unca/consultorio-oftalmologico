## ADDED Requirements

### Requirement: Revision administrativa de fichas duplicadas
El sistema SHALL permitir que un usuario con rol activo `admin` revise fichas clinicas que tienen mas de un paciente activo asignado.

#### Scenario: Listar fichas con multiples pacientes
- **WHEN** un admin abre la pantalla "Fichas duplicadas"
- **THEN** el sistema muestra las fichas cuyo `numero_ficha` esta asignado a mas de un paciente activo
- **AND** muestra la cantidad de pacientes asociados a cada ficha
- **AND** muestra datos administrativos basicos de cada paciente asociado
- **AND** muestra la cantidad de consultas registradas para cada paciente asociado

#### Scenario: Omitir fichas vacias
- **WHEN** existen pacientes sin `numero_ficha` o con una ficha vacia
- **THEN** el sistema no los muestra como un grupo de ficha duplicada

#### Scenario: Sin fichas duplicadas
- **WHEN** no existen fichas con mas de un paciente activo asignado
- **THEN** la pantalla informa que no hay fichas duplicadas para revisar

#### Scenario: Paginar fichas duplicadas
- **WHEN** el listado contiene mas de 5 fichas duplicadas
- **THEN** la pantalla muestra solo 5 fichas por pagina
- **AND** permite navegar a la pagina anterior o siguiente sin perder el total general de fichas y pacientes

#### Scenario: Abrir detalle de ficha
- **WHEN** un admin hace click en una ficha duplicada
- **THEN** el sistema navega a una pantalla de detalle de esa ficha
- **AND** muestra los pacientes activos asociados a la ficha
- **AND** muestra el total de pacientes y consultas de la ficha
- **AND** muestra la misma tabla y acciones disponibles que el listado de fichas duplicadas

### Requirement: Seguridad de revision de fichas duplicadas
El sistema SHALL restringir la revision de fichas duplicadas a usuarios con rol activo `admin`.

#### Scenario: Admin consulta fichas duplicadas
- **WHEN** un usuario con rol activo `admin` solicita el listado de fichas duplicadas
- **THEN** el sistema autoriza la consulta
- **AND** no modifica pacientes ni numeros de ficha

#### Scenario: Usuario no autorizado
- **WHEN** un usuario sin rol activo `admin` intenta consultar fichas duplicadas
- **THEN** el sistema rechaza la solicitud
- **AND** no devuelve el listado de pacientes agrupados

### Requirement: Reemplazo manual de consultas por ficha legacy
El sistema SHALL permitir que un usuario con rol activo `admin` reemplace las consultas de un paciente seleccionado por las consultas encontradas en `DATOMED.DBF` para su ficha actual.

#### Scenario: Confirmar paciente que queda
- **WHEN** un admin presiona "Queda" en un paciente de una ficha duplicada
- **THEN** la pantalla solicita confirmacion explicita antes de ejecutar la accion
- **AND** informa que se eliminaran las consultas actuales del paciente y se importaran las consultas de su ficha desde `DATOMED.DBF`

#### Scenario: Importar consultas desde DATOMED
- **WHEN** un admin confirma que un paciente queda para su ficha actual
- **THEN** el sistema crea nuevas consultas asociadas a ese paciente usando las filas de `DATOMED.DBF` cuyo `NUM_FICH` coincide con la ficha actual normalizada del paciente
- **AND** asigna un medico responsable valido a las consultas importadas
- **AND** elimina las consultas anteriores asociadas a ese paciente despues de crear las nuevas
- **AND** actualiza el conteo mostrado para ese paciente al finalizar

#### Scenario: Paciente sin ficha
- **WHEN** el admin intenta ejecutar "Queda" para un paciente sin `numero_ficha`
- **THEN** el sistema rechaza la accion
- **AND** no elimina consultas actuales

#### Scenario: Ficha sin consultas en DATOMED
- **WHEN** el admin confirma "Queda" para una ficha que no tiene consultas en `DATOMED.DBF`
- **THEN** el sistema rechaza la accion
- **AND** no elimina consultas actuales

#### Scenario: Respaldo previo
- **WHEN** el sistema ejecuta "Queda" sobre un paciente
- **THEN** guarda un respaldo operativo de las consultas actuales y eventos asociados antes de eliminarlos cuando el entorno lo permite

### Requirement: Separacion manual de paciente por nueva ficha
El sistema SHALL permitir que un usuario con rol activo `admin` separe un paciente de una ficha duplicada asignandole una nueva ficha disponible e importando copias de las consultas legacy de su ficha anterior.

#### Scenario: Confirmar separacion de paciente
- **WHEN** un admin presiona "Separar" en un paciente de una ficha duplicada
- **THEN** la pantalla solicita confirmacion explicita antes de ejecutar la accion
- **AND** informa que se eliminaran las consultas actuales, se generara una nueva ficha y se importaran copias de las consultas de `DATOMED.DBF`

#### Scenario: Separar e importar consultas
- **WHEN** un admin confirma separar un paciente
- **THEN** el sistema obtiene el siguiente numero de ficha disponible usando la misma politica del alta de paciente
- **AND** si la ficha sugerida ya esta ocupada, continua buscando una ficha numerica posterior disponible
- **AND** importa copias de las filas de `DATOMED.DBF` cuyo `NUM_FICH` coincide con la ficha anterior
- **AND** asigna un medico responsable valido a las consultas importadas
- **AND** actualiza `pacientes.numero_ficha` del paciente con la nueva ficha despues de crear las copias
- **AND** elimina las consultas anteriores del paciente despues de crear las copias
- **AND** las consultas importadas quedan asociadas al paciente y a la nueva ficha

#### Scenario: Separar sin consultas en DATOMED
- **WHEN** el admin confirma "Separar" para una ficha sin consultas en `DATOMED.DBF`
- **THEN** el sistema rechaza la accion
- **AND** no elimina consultas actuales ni cambia la ficha del paciente

#### Scenario: Respaldo previo a separacion
- **WHEN** el sistema ejecuta "Separar" sobre un paciente
- **THEN** guarda un respaldo operativo de las consultas actuales, eventos asociados, ficha anterior y ficha destino antes de modificar datos cuando el entorno lo permite
