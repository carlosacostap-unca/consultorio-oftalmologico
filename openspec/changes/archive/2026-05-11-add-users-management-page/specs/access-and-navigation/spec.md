## MODIFIED Requirements

### Requirement: Proteccion de pantallas operativas
El sistema SHALL redirigir a la pantalla inicial cuando una pagina operativa detecta una sesion no valida.

#### Scenario: Acceso sin sesion
- **WHEN** un usuario sin sesion valida abre pacientes, turnos, consultas, mutuales, recetas, permisos, usuarios o seed
- **THEN** la pagina redirige a `/`

#### Scenario: Render autenticado
- **WHEN** la sesion es valida y la pagina termino de montar
- **THEN** la pagina operativa renderiza su contenido

### Requirement: Navegacion lateral autenticada
El sistema SHALL mostrar una barra lateral solo a usuarios autenticados con rol activo resuelto.

#### Scenario: Menu operativo
- **WHEN** un usuario autenticado navega por la aplicacion
- **THEN** la barra lateral muestra enlaces a Pacientes, Mutuales, Turnos, Disponibilidades, Consultas y Recetas
- **AND** resalta el enlace de la ruta activa
- **AND** muestra el perfil del usuario y el rol activo en la parte inferior del menu

#### Scenario: Menu de administracion
- **WHEN** el usuario autenticado tiene rol activo `admin`
- **THEN** la barra lateral muestra la seccion Configuracion con enlaces a Usuarios y Permisos
- **AND** muestra la seccion Datos con enlaces a Pacientes, Mutuales, Turnos, Disponibilidades, Consultas y Recetas
- **AND** Usuarios navega a `/usuarios`
- **AND** Permisos navega a `/permisos`
- **AND** usuarios con otro rol activo no ven la seccion Configuracion aunque tengan `admin` asignado

#### Scenario: Menu operativo no admin
- **WHEN** el usuario autenticado tiene un rol activo distinto de `admin`
- **THEN** la barra lateral muestra los enlaces operativos de Datos sin la seccion Configuracion
