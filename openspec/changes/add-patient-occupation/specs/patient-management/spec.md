## MODIFIED Requirements

### Requirement: Alta de paciente
El sistema SHALL permitir crear pacientes con datos personales, ocupacion, documento, ficha, contacto y cobertura.

#### Scenario: Crear paciente con ocupacion opcional
- **WHEN** el usuario completa los datos de alta de paciente
- **THEN** el sistema permite ingresar ocupacion como texto opcional
- **AND** guarda `ocupacion` en `pacientes` junto con el resto de datos administrativos

### Requirement: Detalle, edicion y vista de paciente
El sistema SHALL permitir ver, editar, eliminar e imprimir pacientes desde `/pacientes/[id]`, y SHALL mostrar una ficha clinica optimizada para el medico en modo lectura.

#### Scenario: Editar ocupacion del paciente
- **WHEN** el usuario guarda cambios de un paciente con ocupacion cargada
- **THEN** el sistema actualiza `pacientes.ocupacion`
- **AND** conserva la ocupacion visible en los datos de la ficha del paciente
