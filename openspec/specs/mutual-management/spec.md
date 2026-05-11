# Mutual Management Specification

## Purpose
Define la gestion de mutuales y obras sociales usadas como cobertura de pacientes.

## Requirements

### Requirement: Listado de mutuales
El sistema SHALL listar mutuales ordenadas por nombre, con busqueda por nombre o codigo y conteo de pacientes relacionados.

#### Scenario: Cargar mutuales
- **WHEN** un usuario autenticado abre `/mutuales`
- **THEN** el sistema consulta `mutuales` ordenado por `nombre`
- **AND** muestra nombre, codigo, direccion, telefono y cantidad de pacientes

#### Scenario: Buscar mutual
- **WHEN** el usuario ingresa texto en el buscador
- **THEN** el sistema filtra mutuales por nombre o codigo sin distinguir mayusculas

#### Scenario: Actualizacion en tiempo real
- **WHEN** PocketBase emite eventos de creacion, actualizacion o eliminacion de mutuales
- **THEN** el listado actualiza los registros manteniendo el orden por nombre

### Requirement: Alta y edicion de mutual
El sistema SHALL permitir crear y editar mutuales con nombre obligatorio y datos administrativos opcionales.

#### Scenario: Crear mutual
- **WHEN** el usuario completa el nombre en `/mutuales/nueva`
- **THEN** el sistema crea un registro en `mutuales`
- **AND** guarda el nombre en mayusculas

#### Scenario: Editar mutual
- **WHEN** el usuario modifica una mutual existente
- **THEN** el sistema actualiza nombre, codigo, direccion y telefono
- **AND** vuelve al detalle en modo vista

### Requirement: Vista y eliminacion de mutual
El sistema SHALL mostrar el detalle de una mutual y advertir cuando tiene pacientes relacionados antes de eliminar.

#### Scenario: Ver mutual
- **WHEN** el usuario abre `/mutuales/[id]?mode=view`
- **THEN** el sistema muestra los datos de la mutual deshabilitados
- **AND** informa la cantidad de pacientes relacionados por `mutual_id`

#### Scenario: Eliminar mutual con pacientes
- **WHEN** el usuario intenta eliminar una mutual con pacientes relacionados
- **THEN** el sistema muestra una confirmacion que incluye la cantidad de pacientes
- **AND** si el usuario confirma, elimina la mutual y vuelve al listado
