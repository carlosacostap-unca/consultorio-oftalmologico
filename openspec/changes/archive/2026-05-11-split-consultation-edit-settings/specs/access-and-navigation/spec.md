## MODIFIED Requirements

### Requirement: Proteccion de pantallas operativas
El sistema SHALL redirigir a la pantalla inicial cuando una pagina operativa detecta una sesion no valida.

#### Scenario: Acceso sin sesion
- **WHEN** un usuario sin sesion valida abre pacientes, turnos, consultas, mutuales, recetas, permisos, usuarios, edicion de consultas o seed
- **THEN** la pagina redirige a `/`

### Requirement: Navegacion lateral autenticada
El sistema SHALL mostrar una barra lateral solo a usuarios autenticados con rol activo resuelto.

#### Scenario: Menu de administracion
- **WHEN** el usuario autenticado tiene rol activo `admin`
- **THEN** la barra lateral muestra la seccion Configuracion con enlaces a Usuarios, Permisos y Edicion de consultas
- **AND** Usuarios navega a `/usuarios`
- **AND** Permisos navega a `/permisos`
- **AND** Edicion de consultas navega a `/edicion-consultas`
- **AND** usuarios con otro rol activo no ven la seccion Configuracion aunque tengan `admin` asignado
