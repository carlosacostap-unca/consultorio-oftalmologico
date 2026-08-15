## MODIFIED Requirements

### Requirement: Alta y edicion de mutual
El sistema SHALL permitir crear y editar mutuales con nombre obligatorio y datos administrativos opcionales, y SHALL evitar que una nueva mutual se cree con un codigo ya ocupado por otra mutual.

#### Scenario: Crear mutual
- **WHEN** el usuario completa el nombre en `/mutuales/nueva`
- **THEN** el sistema crea un registro en `mutuales`
- **AND** guarda el nombre en mayusculas

#### Scenario: Informar codigos ocupados al crear mutual
- **WHEN** un usuario autenticado abre `/mutuales/nueva`
- **THEN** el sistema muestra los codigos ocupados de mutuales existentes junto con su nombre

#### Scenario: Bloquear codigo duplicado al crear mutual
- **WHEN** el usuario ingresa un codigo que ya pertenece a una mutual existente
- **THEN** el sistema informa que el codigo ya esta ocupado
- **AND** no permite guardar la nueva mutual con ese codigo

#### Scenario: Editar mutual
- **WHEN** el usuario modifica una mutual existente
- **THEN** el sistema actualiza nombre, codigo, direccion y telefono
- **AND** vuelve al detalle en modo vista
