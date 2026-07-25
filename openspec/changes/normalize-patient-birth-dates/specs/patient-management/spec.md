## MODIFIED Requirements

### Requirement: Alta de paciente
El sistema SHALL permitir crear pacientes con datos personales, documento, ficha, contacto y cobertura, preservando la fecha de nacimiento como dato calendario.

#### Scenario: Crear paciente con fecha de nacimiento
- **WHEN** el usuario completa una fecha de nacimiento valida al crear un paciente
- **THEN** el sistema guarda `pacientes.fecha_nacimiento` normalizada a mediodia UTC
- **AND** al volver a mostrarla conserva el mismo dia, mes y anio ingresados

#### Scenario: Crear paciente sin fecha de nacimiento
- **WHEN** el usuario crea un paciente sin fecha de nacimiento
- **THEN** el sistema conserva el campo vacio

### Requirement: Detalle, edicion y vista de paciente
El sistema SHALL permitir ver, editar, eliminar e imprimir pacientes desde `/pacientes/[id]`, y SHALL mostrar una ficha clinica optimizada para el medico en modo lectura, preservando la fecha de nacimiento como dato calendario.

#### Scenario: Ver paciente con fecha guardada a medianoche UTC
- **WHEN** un paciente tiene `fecha_nacimiento` guardada a `00:00:00.000Z`
- **THEN** la ficha del paciente muestra el dia calendario almacenado
- **AND** no desplaza la fecha al dia anterior por zona horaria local

#### Scenario: Editar paciente con fecha de nacimiento
- **WHEN** el usuario guarda cambios de un paciente con fecha de nacimiento
- **THEN** el sistema actualiza `pacientes.fecha_nacimiento` normalizada a mediodia UTC
- **AND** conserva el mismo dia elegido en el formulario

#### Scenario: Calcular edad en flujos clinicos
- **WHEN** una consulta muestra la edad del paciente
- **THEN** el sistema calcula la edad desde el dia calendario de nacimiento
- **AND** no depende de interpretar la fecha como medianoche UTC.
