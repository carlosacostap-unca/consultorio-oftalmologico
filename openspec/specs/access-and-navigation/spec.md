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

#### Scenario: Menu de calidad de datos para admin
- **WHEN** un usuario con rol activo `admin` navega por la aplicacion
- **THEN** la barra lateral muestra la seccion "Calidad de datos"
- **AND** la seccion incluye accesos a "Duplicados" y "Fichas duplicadas"

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

### Requirement: Cambio de contrasena desde perfil lateral
El sistema SHALL permitir que un usuario autenticado cambie su propia contrasena desde el perfil del menu lateral.

#### Scenario: Usuario abre opcion de cambio de contrasena
- **WHEN** un usuario autenticado hace click en el bloque de perfil del menu lateral donde ve su usuario y email
- **THEN** el sistema muestra la opcion "Cambiar contrasena"

#### Scenario: Usuario abre modal de cambio de contrasena
- **WHEN** el usuario ejecuta "Cambiar contrasena"
- **THEN** el sistema muestra un modal con campos para nueva contrasena y repeticion
- **AND** el modal permite cancelar sin modificar la contrasena

#### Scenario: Repeticion incorrecta en cambio de contrasena
- **WHEN** el usuario ingresa una nueva contrasena y una repeticion distinta
- **THEN** el sistema rechaza el envio
- **AND** muestra un mensaje indicando que las contrasenas no coinciden
- **AND** no actualiza la contrasena del usuario

#### Scenario: Cambio de contrasena exitoso
- **WHEN** el usuario ingresa una contrasena valida y la repite correctamente
- **THEN** el sistema actualiza la contrasena del usuario autenticado
- **AND** mantiene la sesion activa
- **AND** cierra el modal mostrando confirmacion de exito

### Requirement: Configuracion de contrasena despues de Google
El sistema SHALL exigir que un usuario autenticado por Google configure una contrasena propia antes de acceder al panel principal cuando su registro no indique una contrasena configurada por el usuario.

#### Scenario: Usuario Google sin contrasena configurada
- **WHEN** un usuario inicia sesion correctamente con Google y su registro tiene `password_configured` distinto de `true`
- **THEN** el sistema muestra una pantalla intermedia para ingresar una nueva contrasena
- **AND** no muestra el panel principal hasta que la contrasena sea guardada correctamente

#### Scenario: Repeticion de contrasena incorrecta
- **WHEN** el usuario ingresa una contrasena y una repeticion distinta en la pantalla intermedia
- **THEN** el sistema rechaza el envio
- **AND** muestra un mensaje indicando que las contrasenas no coinciden
- **AND** mantiene al usuario en la pantalla intermedia

#### Scenario: Contrasena guardada correctamente
- **WHEN** el usuario ingresa una contrasena valida y la repite correctamente
- **THEN** el sistema guarda la contrasena para el usuario autenticado
- **AND** marca el registro con `password_configured` en `true`
- **AND** muestra el panel principal con el rol activo resuelto

#### Scenario: Usuario con contrasena configurada
- **WHEN** un usuario inicia sesion y su registro tiene `password_configured` en `true`
- **THEN** el sistema muestra el panel principal sin pedir configuracion de contrasena

#### Scenario: Cerrar sesion desde configuracion de contrasena
- **WHEN** un usuario esta en la pantalla intermedia de configuracion de contrasena y ejecuta "Cerrar sesion"
- **THEN** el sistema limpia `pb.authStore`
- **AND** vuelve a mostrar la pantalla inicial de login

### Requirement: Login con email y contrasena conserva acceso
El sistema SHALL permitir que usuarios con contrasena configurada ingresen mediante email y contrasena desde la pantalla inicial.

#### Scenario: Login exitoso con email y contrasena
- **WHEN** un usuario ingresa email y contrasena validos
- **THEN** el sistema autentica contra PocketBase
- **AND** marca el registro con `password_configured` en `true` si aun no lo estaba
- **AND** muestra el panel principal con el rol activo resuelto

#### Scenario: Login fallido con email y contrasena
- **WHEN** un usuario ingresa email o contrasena invalidos
- **THEN** el sistema conserva al usuario en la pantalla inicial
- **AND** muestra un mensaje de error sin modificar `password_configured`
