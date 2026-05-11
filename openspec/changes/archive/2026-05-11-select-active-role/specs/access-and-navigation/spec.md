## ADDED Requirements

### Requirement: Seleccion de rol activo
El sistema SHALL resolver automaticamente un rol activo valido al iniciar sesion.

#### Scenario: Usuario con un solo rol
- **WHEN** un usuario inicia sesion y tiene un solo rol asignado
- **THEN** el sistema selecciona automaticamente ese rol como rol activo
- **AND** muestra el panel autenticado sin pedir seleccion

#### Scenario: Usuario con multiples roles y rol medico
- **WHEN** un usuario inicia sesion y tiene `medico` entre sus roles asignados
- **THEN** el sistema selecciona automaticamente `medico` como rol activo inicial
- **AND** muestra el panel autenticado sin pedir seleccion previa

#### Scenario: Usuario con multiples roles sin rol medico
- **WHEN** un usuario inicia sesion y tiene mas de un rol asignado pero no tiene `medico`
- **THEN** el sistema selecciona automaticamente el primer rol asignado disponible
- **AND** muestra el panel autenticado sin pedir seleccion previa

#### Scenario: Rol activo obsoleto
- **WHEN** existe un rol activo guardado que ya no esta entre los roles asignados
- **THEN** el sistema descarta ese rol activo
- **AND** resuelve automaticamente un nuevo rol activo valido

### Requirement: Cambio de rol activo
El sistema SHALL permitir cambiar el rol activo desde el perfil del menu lateral cuando el usuario tenga mas de un rol asignado.

#### Scenario: Cambiar rol desde la interfaz
- **WHEN** un usuario con roles `medico` y `secretaria` cambia el rol activo
- **THEN** el sistema actualiza la interfaz para mostrar el nuevo rol activo
- **AND** conserva los roles asignados sin modificarlos

#### Scenario: Perfil en menu lateral
- **WHEN** un usuario autenticado ve el menu lateral
- **THEN** el sistema muestra en la parte inferior su avatar o inicial, nombre, email y rol activo
- **AND** si tiene multiples roles, permite cambiar el rol activo desde ese perfil

#### Scenario: Rol admin activo
- **WHEN** un usuario con rol `admin` asignado cambia su rol activo a `admin`
- **THEN** la barra lateral muestra el enlace a Permisos

#### Scenario: Rol operativo activo
- **WHEN** un usuario con roles `admin` y `medico` cambia su rol activo a `medico`
- **THEN** la barra lateral oculta el enlace a Permisos

## MODIFIED Requirements

### Requirement: Sesion autenticada
El sistema SHALL mantener el estado de sesion con `pb.authStore`, reaccionar a cambios de autenticacion y resolver un rol activo valido.

#### Scenario: Usuario autenticado ve panel inicial
- **WHEN** `pb.authStore` contiene un usuario valido y hay un rol activo valido
- **THEN** el sistema muestra bienvenida, avatar o inicial, email, rol activo y panel de control
- **AND** el panel enlaza a pacientes, turnos, consultas y recetas

#### Scenario: Usuario cierra sesion
- **WHEN** un usuario autenticado ejecuta "Cerrar sesion"
- **THEN** el sistema limpia `pb.authStore`
- **AND** limpia el rol activo local de la sesion actual
- **AND** deja de mostrar las areas autenticadas

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
- **AND** Usuarios y Permisos navegan a sus secciones correspondientes dentro de la pantalla de permisos
- **AND** usuarios con otro rol activo no ven ese enlace aunque tengan `admin` asignado

#### Scenario: Menu operativo no admin
- **WHEN** el usuario autenticado tiene un rol activo distinto de `admin`
- **THEN** la barra lateral muestra los enlaces operativos de Datos sin la seccion Configuracion
