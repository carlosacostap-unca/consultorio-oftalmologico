# Access And Navigation Specification

## Purpose
Define el acceso autenticado, la navegacion principal y el panel inicial del sistema de gestion del consultorio oftalmologico.
## Requirements
### Requirement: Inicio de sesion con Google
El sistema SHALL permitir que usuarios ingresen mediante OAuth2 de Google usando la coleccion `users` de PocketBase.

#### Scenario: Usuario no autenticado inicia sesion
- **WHEN** un usuario no autenticado abre la pantalla inicial
- **THEN** el sistema muestra la tarjeta de acceso con la accion "Continuar con Google"
- **AND** al ejecutar la accion inicia el flujo OAuth2 con proveedor `google`

#### Scenario: Error de autenticacion
- **WHEN** falla el inicio de sesion con Google
- **THEN** el sistema muestra una alerta de error
- **AND** conserva al usuario en la pantalla inicial

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

### Requirement: Proteccion de pantallas operativas
El sistema SHALL redirigir a la pantalla inicial cuando una pagina operativa detecta una sesion no valida.

#### Scenario: Acceso sin sesion
- **WHEN** un usuario sin sesion valida abre pacientes, turnos, consultas, mutuales, recetas, permisos, usuarios, edicion de consultas o seed
- **THEN** la pagina redirige a `/`

### Requirement: Navegacion lateral autenticada
El sistema SHALL mostrar una barra lateral acorde al rol activo del usuario autenticado.

#### Scenario: Menu operativo de secretaria
- **WHEN** un usuario con rol activo `secretaria` navega por la aplicacion
- **THEN** la barra lateral muestra acceso a Turnos como herramienta principal de agenda
- **AND** la pantalla de turnos permite gestionar agendas de todos los medicos

#### Scenario: Menu operativo de medico
- **WHEN** un usuario con rol activo `medico` navega por la aplicacion
- **THEN** la barra lateral mantiene acceso a Turnos
- **AND** la pantalla de turnos prioriza la agenda propia del medico autenticado

### Requirement: Cambio de rol durante turnos
El sistema SHALL aplicar inmediatamente el rol activo cuando el usuario lo cambia desde la navegacion lateral mientras esta en el modulo de turnos.

#### Scenario: Multi rol cambia de medico a secretaria en turnos
- **WHEN** un usuario con roles `medico` y `secretaria` cambia el rol activo a `secretaria` estando en `/turnos`
- **THEN** el sistema habilita la seleccion de medico
- **AND** selecciona `Todos los medicos` por defecto

#### Scenario: Multi rol cambia de secretaria a medico en turnos
- **WHEN** un usuario con roles `medico` y `secretaria` cambia el rol activo a `medico` estando en `/turnos`
- **THEN** el sistema preselecciona su propio usuario medico
- **AND** deshabilita la seleccion de otros medicos

### Requirement: Pruebas de acceso por rol
El sistema SHALL contar con pruebas automatizadas que verifiquen login y rol activo para usuarios demo.

#### Scenario: Usuario secretaria demo
- **WHEN** la prueba inicia sesion con `secretaria.demo@consultorio.local`
- **THEN** el sistema muestra rol activo `Secretaria`
- **AND** permite gestionar turnos de todos los medicos

#### Scenario: Usuario multi rol demo
- **WHEN** la prueba inicia sesion con `multi.demo@consultorio.local`
- **THEN** el sistema ingresa inicialmente con rol activo `Medico`
- **AND** permite cambiar a `Secretaria` desde el menu lateral

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
