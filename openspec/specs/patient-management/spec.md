# Patient Management Specification

## Purpose
Define la gestion de pacientes, fichas clinicas, busqueda por padron y relacion con obras sociales/mutuales.
## Requirements
### Requirement: Listado y busqueda de pacientes
El sistema SHALL listar pacientes autenticados con paginacion, orden alfabetico y filtros por apellido, texto libre y numero de ficha.

#### Scenario: Listado inicial
- **WHEN** un usuario autenticado abre `/pacientes`
- **THEN** el sistema consulta `pacientes` ordenado por `apellido,nombre`
- **AND** muestra hasta 100 pacientes por pagina con datos de documento, ficha y obra social

#### Scenario: Busqueda por texto
- **WHEN** el usuario busca por nombre, apellido, documento o ficha
- **THEN** el sistema aplica una busqueda demorada
- **AND** filtra pacientes por todos los terminos ingresados

#### Scenario: Filtro alfabetico
- **WHEN** el usuario selecciona una letra
- **THEN** el sistema filtra pacientes cuyo apellido comienza con esa letra
- **AND** reinicia la paginacion a la primera pagina

### Requirement: Alta de paciente
El sistema SHALL permitir crear pacientes con datos personales, documento, ficha, contacto y cobertura.

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

### Requirement: Creacion rapida de mutual desde paciente
El sistema SHALL permitir crear una mutual durante el alta de paciente si no existe una coincidencia exacta.

#### Scenario: Registrar nueva obra social
- **WHEN** el usuario busca una mutual sin coincidencia exacta
- **THEN** el sistema ofrece registrar la obra social buscada
- **AND** crea la mutual con nombre en mayusculas y datos opcionales de codigo, direccion y telefono
- **AND** selecciona automaticamente la mutual creada para el paciente

### Requirement: Detalle, edicion y vista de paciente
El sistema SHALL permitir ver, editar y eliminar pacientes desde `/pacientes/[id]`.

#### Scenario: Ver paciente
- **WHEN** el usuario abre `/pacientes/[id]?mode=view`
- **THEN** el sistema muestra una ficha clinica de lectura con identificacion del paciente, documento, numero de ficha, contacto, cobertura y antecedentes activos
- **AND** muestra acciones directas para crear una nueva consulta y una nueva receta del paciente
- **AND** conserva los datos personales, documento, ficha, contacto y cobertura en modo lectura
- **AND** muestra el historial de consultas del paciente
- **AND** muestra las recetas recientes del paciente

#### Scenario: Editar paciente
- **WHEN** el usuario guarda cambios de un paciente
- **THEN** el sistema actualiza `pacientes`
- **AND** valida que el numero de ficha no pertenezca a otro paciente usando `exclude_id`

#### Scenario: Eliminar paciente
- **WHEN** el usuario confirma la eliminacion
- **THEN** el sistema elimina el registro de `pacientes`
- **AND** regresa al listado de pacientes

### Requirement: Historial clinico desde paciente
El sistema SHALL mostrar las consultas del paciente ordenadas por fecha descendente y sus recetas recientes asociadas.

#### Scenario: Paciente con consultas
- **WHEN** el paciente tiene consultas registradas
- **THEN** el sistema muestra su historial con fecha, motivo y diagnostico
- **AND** cada fila permite abrir la consulta en modo vista

#### Scenario: Paciente con recetas
- **WHEN** el paciente tiene recetas registradas
- **THEN** el sistema muestra las recetas mas recientes con fecha e indicacion resumida
- **AND** cada receta permite abrir su detalle en modo vista

#### Scenario: Nueva consulta desde ficha
- **WHEN** el usuario elige crear consulta desde el detalle del paciente
- **THEN** el sistema navega a `/consultas/nueva?paciente_id=<id>`

#### Scenario: Nueva receta desde ficha
- **WHEN** el usuario elige crear receta desde el detalle del paciente
- **THEN** el sistema navega a `/recetas/nueva?paciente_id=<id>`

### Requirement: Edicion contextual minima de paciente
El sistema SHALL permitir ediciones administrativas minimas de paciente desde contextos operativos sin reemplazar la ficha completa.

#### Scenario: Editar desde turnos
- **WHEN** un usuario autenticado edita datos administrativos minimos del paciente desde Gestion de Turnos
- **THEN** el sistema guarda los cambios en `pacientes`
- **AND** la ficha completa del paciente conserva esos datos actualizados

#### Scenario: Acceder a ficha completa
- **WHEN** el usuario necesita ver o editar datos fuera del alcance minimo
- **THEN** el sistema ofrece navegacion a `/pacientes/<id>?mode=view`

### Requirement: Advertencia de posibles pacientes duplicados
El sistema SHALL advertir posibles pacientes duplicados cuando un usuario crea o corrige datos administrativos de un paciente.

#### Scenario: Coincidencia exacta de documento, telefono o ficha
- **WHEN** el usuario ingresa un documento, telefono o numero de ficha que coincide con otro paciente
- **THEN** el sistema muestra una advertencia de posible duplicado
- **AND** muestra paciente, documento, telefono, ficha y obra social cuando existan

#### Scenario: Coincidencia por nombre parecido
- **WHEN** el usuario ingresa apellido y nombre similares a otro paciente
- **THEN** el sistema muestra la coincidencia como posible duplicado
- **AND** no bloquea el guardado solo por similitud

#### Scenario: Excluir paciente actual
- **WHEN** el usuario edita un paciente existente desde un contexto operativo
- **THEN** el sistema no muestra al propio paciente como duplicado

### Requirement: Advertencias no destructivas
El sistema SHALL tratar las advertencias de duplicados como informacion operativa y no como fusion automatica.

#### Scenario: Continuar luego de revisar
- **WHEN** el usuario revisa una advertencia de posible duplicado
- **THEN** el sistema permite continuar con el flujo actual
- **AND** no modifica ni fusiona otros pacientes

### Requirement: Pacientes fusionados en gestion de pacientes
El sistema SHALL identificar pacientes fusionados y evitar que aparezcan como pacientes activos en flujos normales.

#### Scenario: Listado omite fusionados por defecto
- **WHEN** un usuario abre el listado normal de pacientes
- **THEN** el sistema muestra pacientes activos
- **AND** omite registros marcados como fusionados salvo que se active una vista administrativa especifica

#### Scenario: Ficha de paciente fusionado
- **WHEN** un usuario abre la ficha de un paciente fusionado
- **THEN** el sistema informa que el registro fue fusionado
- **AND** muestra un enlace al paciente principal

#### Scenario: Crear o editar paciente activo
- **WHEN** un usuario crea o edita un paciente activo
- **THEN** el sistema conserva las validaciones actuales de documento y numero de ficha
- **AND** no considera disponibles los numeros de ficha de pacientes activos

