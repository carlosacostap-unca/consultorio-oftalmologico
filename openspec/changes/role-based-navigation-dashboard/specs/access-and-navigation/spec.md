## MODIFIED Requirements

### Requirement: Sesion autenticada
El sistema SHALL mantener el estado de sesion con `pb.authStore`, reaccionar a cambios de autenticacion y resolver un rol activo valido.

#### Scenario: Usuario autenticado ve panel inicial
- **WHEN** `pb.authStore` contiene un usuario valido y hay un rol activo valido
- **THEN** el sistema muestra bienvenida, avatar o inicial, email, rol activo y panel inicial especifico para ese rol
- **AND** el panel enlaza a las acciones principales del rol activo

#### Scenario: Usuario cierra sesion
- **WHEN** un usuario autenticado ejecuta "Cerrar sesion"
- **THEN** el sistema limpia `pb.authStore`
- **AND** limpia el rol activo local de la sesion actual
- **AND** deja de mostrar las areas autenticadas

### Requirement: Navegacion lateral autenticada
El sistema SHALL mostrar una barra lateral acorde al rol activo del usuario autenticado.

#### Scenario: Menu operativo de secretaria
- **WHEN** un usuario con rol activo `secretaria` navega por la aplicacion
- **THEN** la barra lateral agrupa accesos de agenda, pacientes y clinica
- **AND** muestra Turnos, Bloqueos y feriados, Pacientes, Mutuales, Consultas y Recetas
- **AND** la pantalla de turnos permite gestionar agendas de todos los medicos

#### Scenario: Menu operativo de medico
- **WHEN** un usuario con rol activo `medico` navega por la aplicacion
- **THEN** la barra lateral agrupa accesos de atencion, pacientes y agenda
- **AND** muestra Mi jornada, Consultas, Recetas, Pacientes y Mis bloqueos
- **AND** no muestra Mutuales ni opciones administrativas como accesos principales
- **AND** la pantalla de turnos prioriza la agenda propia del medico autenticado

#### Scenario: Menu administrativo
- **WHEN** un usuario con rol activo `admin` navega por la aplicacion
- **THEN** la barra lateral agrupa accesos en Configuracion, Datos y Calidad de datos
- **AND** Configuracion muestra Usuarios, Permisos, Edicion de consultas, Horarios medicos y Bloqueos y feriados
- **AND** Datos muestra Pacientes, Mutuales, Turnos, Consultas y Recetas
- **AND** Calidad de datos muestra Duplicados

### Requirement: Cambio de rol activo
El sistema SHALL permitir cambiar el rol activo desde el perfil del menu lateral cuando el usuario tenga mas de un rol asignado.

#### Scenario: Cambiar rol desde la interfaz
- **WHEN** un usuario con roles `medico` y `secretaria` cambia el rol activo
- **THEN** el sistema actualiza la interfaz para mostrar el nuevo rol activo
- **AND** actualiza inmediatamente el menu lateral y el panel inicial
- **AND** conserva los roles asignados sin modificarlos

#### Scenario: Perfil en menu lateral
- **WHEN** un usuario autenticado ve el menu lateral
- **THEN** el sistema muestra en la parte inferior su avatar o inicial, nombre, email y rol activo
- **AND** si tiene multiples roles, permite cambiar el rol activo desde ese perfil

#### Scenario: Rol admin activo
- **WHEN** un usuario con rol `admin` asignado cambia su rol activo a `admin`
- **THEN** la barra lateral muestra secciones administrativas, datos y calidad de datos

#### Scenario: Rol operativo activo
- **WHEN** un usuario con roles `admin` y `medico` cambia su rol activo a `medico`
- **THEN** la barra lateral oculta opciones administrativas como Permisos y Usuarios

## ADDED Requirements

### Requirement: Panel inicial por rol activo
El sistema SHALL mostrar una pantalla de bienvenida adaptada al rol activo del usuario autenticado.

#### Scenario: Bienvenida de secretaria
- **WHEN** una secretaria autenticada abre `/`
- **THEN** el sistema muestra una bienvenida orientada a agenda y gestion administrativa
- **AND** ofrece accesos principales a Turnos, Nuevo turno, Pacientes y Mutuales

#### Scenario: Bienvenida de medico
- **WHEN** un medico autenticado abre `/`
- **THEN** el sistema muestra una bienvenida orientada a la jornada de atencion
- **AND** ofrece accesos principales a Mi jornada, Consultas, Pacientes y Recetas

#### Scenario: Bienvenida de admin
- **WHEN** un admin autenticado abre `/`
- **THEN** el sistema muestra una bienvenida orientada a configuracion y supervision
- **AND** ofrece accesos principales a Usuarios, Permisos, Horarios medicos y Duplicados
