## ADDED Requirements

### Requirement: Inicio de sesión en aplicación de escritorio
El sistema SHALL permitir que una cuenta activada ingrese a la aplicación de escritorio con email y contraseña tanto online como offline, conservando su identidad y roles centrales.

#### Scenario: Ingreso online en escritorio
- **WHEN** el usuario ingresa email y contraseña con conexión
- **THEN** el sistema valida primero la cuenta central
- **AND** actualiza el perfil y el verificador de acceso local
- **AND** inicia una sesión local atribuida al mismo ID central

#### Scenario: Ingreso offline en escritorio
- **WHEN** el usuario activado ingresa email y contraseña sin conexión
- **THEN** el sistema valida la cuenta contra PocketBase local
- **AND** aplica los roles almacenados en la última validación central
- **AND** informa que la sesión está offline

### Requirement: Navegación con estado de sincronización
El sistema SHALL mostrar el estado de sincronización en la navegación de escritorio sin alterar la navegación web existente.

#### Scenario: Aplicación de escritorio autenticada
- **WHEN** un usuario autenticado ve la barra lateral en escritorio
- **THEN** el sistema muestra conectividad, pendientes y acceso a `/sincronizacion`
- **AND** conserva los enlaces permitidos por su rol activo

#### Scenario: Aplicación web autenticada
- **WHEN** un usuario usa la versión web
- **THEN** la navegación continúa utilizando el servidor central directamente
- **AND** no presenta controles que dependan de una base local inexistente

### Requirement: Restricción de módulos no disponibles offline
El sistema SHALL impedir cambios offline en módulos fuera de pacientes, consultas y recetas y SHALL explicar que requieren conexión.

#### Scenario: Abrir módulo no incluido durante un corte
- **WHEN** un usuario intenta administrar turnos, mutuales, usuarios, permisos o configuración sin conexión
- **THEN** el sistema no permite realizar cambios locales en ese módulo
- **AND** muestra que la función requiere Internet
