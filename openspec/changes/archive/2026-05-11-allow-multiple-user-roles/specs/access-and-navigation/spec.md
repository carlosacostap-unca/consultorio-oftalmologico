## MODIFIED Requirements

### Requirement: Navegacion lateral autenticada
El sistema SHALL mostrar una barra lateral solo a usuarios autenticados.

#### Scenario: Menu operativo
- **WHEN** un usuario autenticado navega por la aplicacion
- **THEN** la barra lateral muestra enlaces a Pacientes, Mutuales, Turnos, Disponibilidades, Consultas y Recetas
- **AND** resalta el enlace de la ruta activa

#### Scenario: Menu de administracion
- **WHEN** el usuario autenticado incluye el rol `admin` entre sus roles
- **THEN** la barra lateral incluye el enlace a Permisos
- **AND** usuarios sin rol `admin` no ven ese enlace

#### Scenario: Sesion antigua con rol unico
- **WHEN** el usuario autenticado aun tiene una sesion o registro con `role` legacy igual a `admin`
- **THEN** la barra lateral lo trata como admin mientras se completa la migracion
