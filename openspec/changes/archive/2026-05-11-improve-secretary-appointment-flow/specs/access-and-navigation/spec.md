## ADDED Requirements

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
