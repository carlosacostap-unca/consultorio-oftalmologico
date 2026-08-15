## MODIFIED Requirements

### Requirement: Alta de paciente
El sistema SHALL permitir crear pacientes con datos personales, ocupacion, documento, ficha, contacto y cobertura, SHALL preservar la fecha de nacimiento como dato calendario y SHALL ejecutar las validaciones previas sin requerir permisos administrativos de lectura del esquema de PocketBase.

#### Scenario: Crear paciente con ocupacion opcional
- **WHEN** el usuario completa los datos de alta de paciente
- **THEN** el sistema permite ingresar ocupacion como texto opcional
- **AND** guarda `ocupacion` en `pacientes` junto con el resto de datos administrativos

#### Scenario: Crear paciente con mutual existente
- **WHEN** el usuario completa apellido, nombre, numero de documento y selecciona una mutual
- **THEN** el sistema guarda el paciente en `pacientes`
- **AND** normaliza nombre, apellido y numero de ficha a mayusculas
- **AND** redirige a crear una nueva consulta para el paciente creado

#### Scenario: Calculo de siguiente ficha
- **WHEN** el usuario abre el alta de paciente
- **THEN** el sistema consulta `/api/pacientes/ficha`
- **AND** precarga el siguiente numero de ficha disponible cuando el campo esta vacio

#### Scenario: Ficha duplicada
- **WHEN** el usuario intenta guardar un numero de ficha ya asignado a otro paciente
- **THEN** el sistema informa el paciente duplicado
- **AND** no crea el registro

#### Scenario: Crear paciente con fecha de nacimiento
- **WHEN** el usuario completa una fecha de nacimiento valida al crear un paciente
- **THEN** el sistema guarda `pacientes.fecha_nacimiento` normalizada a mediodia UTC
- **AND** al volver a mostrarla conserva el mismo dia, mes y anio ingresados

#### Scenario: Crear paciente sin fecha de nacimiento
- **WHEN** el usuario crea un paciente sin fecha de nacimiento
- **THEN** el sistema conserva el campo vacio

#### Scenario: Validacion de DNI con permisos operativos
- **WHEN** el usuario intenta guardar un paciente y las credenciales del servidor pueden consultar registros pero no leer el esquema de PocketBase
- **THEN** el sistema valida el DNI mediante `numero_documento`
- **AND** no requiere acceso a `/api/collections/pacientes` para completar la validacion

#### Scenario: Falla tecnica al validar el DNI
- **WHEN** `/api/pacientes/documento` no puede completar la consulta
- **THEN** el sistema informa que no pudo validar el documento
- **AND** no afirma que la coleccion `pacientes` sea inexistente
- **AND** no intenta crear el registro sin validar el DNI

### Requirement: Detalle, edicion y vista de paciente
El sistema SHALL permitir ver, editar, eliminar e imprimir pacientes desde `/pacientes/[id]`, SHALL mostrar una ficha clinica optimizada para el medico en modo lectura y SHALL preservar la fecha de nacimiento como dato calendario.

#### Scenario: Ver paciente
- **WHEN** el usuario abre `/pacientes/[id]?mode=view`
- **THEN** el sistema muestra una ficha clinica de lectura con identificacion del paciente, documento, numero de ficha, contacto, cobertura y antecedentes activos
- **AND** muestra metricas de consultas, recetas y ultima atencion
- **AND** muestra acciones directas para crear una nueva consulta, crear una nueva receta, abrir la ficha imprimible y abrir la ultima consulta cuando exista
- **AND** conserva los datos personales, documento, ficha, contacto y cobertura en modo lectura
- **AND** muestra el historial de consultas del paciente
- **AND** muestra las recetas recientes del paciente con acciones para ver e imprimir

#### Scenario: Imprimir ficha clinica
- **WHEN** el usuario abre `/pacientes/[id]/imprimir`
- **THEN** el sistema carga el paciente, consultas y recetas recientes
- **AND** muestra datos del paciente, documento, ficha, contacto, cobertura y antecedentes activos
- **AND** muestra ultimas consultas con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** muestra recetas recientes con fecha, medicamentos, indicaciones y vinculacion a consulta cuando exista
- **AND** permite imprimir la hoja sin mostrar controles de navegacion en la impresion
- **AND** permite volver a la ficha clinica del paciente desde la vista imprimible

#### Scenario: Editar paciente
- **WHEN** el usuario guarda cambios de un paciente
- **THEN** el sistema actualiza `pacientes`
- **AND** valida que el numero de ficha no pertenezca a otro paciente usando `exclude_id`

#### Scenario: Editar ocupacion del paciente
- **WHEN** el usuario guarda cambios de un paciente con ocupacion cargada
- **THEN** el sistema actualiza `pacientes.ocupacion`
- **AND** conserva la ocupacion visible en los datos de la ficha del paciente

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
- **AND** no depende de interpretar la fecha como medianoche UTC

#### Scenario: Eliminar paciente
- **WHEN** el usuario confirma la eliminacion
- **THEN** el sistema elimina el registro de `pacientes`
- **AND** regresa al listado de pacientes

## ADDED Requirements

### Requirement: Importacion de ocupaciones de pacientes
El sistema SHALL permitir importar ocupaciones legacy desde `PACIENTE.DBF` cruzando por numero de ficha.

#### Scenario: Importar ocupaciones por ficha
- **WHEN** se ejecuta la importacion de ocupaciones desde DBF
- **THEN** el sistema lee `NUM_FICH` y `OCUPAC`
- **AND** actualiza `pacientes.ocupacion` cuando `NUM_FICH` coincide con `pacientes.numero_ficha`
- **AND** omite registros sin ocupacion o sin ficha
- **AND** omite fichas con ocupaciones contradictorias en el DBF
- **AND** informa totales de revisados, sin cambios, a actualizar, actualizados, sin match y ambiguos
