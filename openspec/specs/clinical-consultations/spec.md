# Clinical Consultations Specification

## Purpose
Define la carga, consulta, edicion, navegacion e impresion de datos clinicos oftalmologicos.
## Requirements
### Requirement: Listado de consultas
El sistema SHALL listar consultas con filtros por paciente, letra inicial y fecha.

#### Scenario: Cargar consultas
- **WHEN** el usuario abre `/consultas`
- **THEN** el sistema consulta `consultas` paginadas de a 20
- **AND** ordena por fecha descendente y expande `paciente_id`

#### Scenario: Filtrar por paciente
- **WHEN** el usuario busca por nombre, apellido, documento o ficha
- **THEN** el sistema busca primero pacientes coincidentes
- **AND** filtra consultas por los IDs encontrados

#### Scenario: Filtrar por fecha
- **WHEN** el usuario selecciona una fecha
- **THEN** el sistema muestra consultas entre el inicio y fin de ese dia

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado y ofreciendo acciones de cierre al finalizar el guardado.

#### Scenario: Crear consulta desde paciente
- **WHEN** la URL incluye `paciente_id`
- **THEN** el sistema carga el paciente con mutual expandida
- **AND** precarga paciente, numero de ficha y antecedentes fijos disponibles
- **AND** muestra un resumen visible del paciente seleccionado

#### Scenario: Crear consulta desde turno
- **WHEN** la URL incluye `turno_id`
- **THEN** el sistema carga el turno
- **AND** usa su motivo y paciente como datos iniciales
- **AND** muestra el contexto de atencion desde turno

#### Scenario: Formulario clinico organizado
- **WHEN** el usuario abre una nueva consulta
- **THEN** el sistema muestra secciones distinguibles para paciente, antecedentes, motivo, examen oftalmologico, refraccion y cierre clinico
- **AND** mantiene disponibles todos los campos clinicos actuales

#### Scenario: Guardar consulta
- **WHEN** el usuario guarda la consulta con paciente seleccionado
- **THEN** el sistema crea un registro en `consultas`
- **AND** guarda la fecha en formato ISO
- **AND** muestra una confirmacion de consulta guardada sin redirigir automaticamente

#### Scenario: Acciones posteriores al guardado
- **WHEN** la consulta se guarda correctamente
- **THEN** el sistema permite abrir la consulta creada
- **AND** permite crear receta vinculada a la consulta y al paciente
- **AND** permite imprimir la receta de anteojos desde la consulta

#### Scenario: Vincular consulta con turno
- **WHEN** la consulta se creo desde un turno
- **THEN** el sistema actualiza el turno con `consulta_id`
- **AND** cambia su estado a `Atendido`
- **AND** informa que el turno fue marcado como atendido

### Requirement: Antecedentes clinicos
El sistema SHALL registrar antecedentes fijos y copiarlos desde el paciente o la consulta anterior cuando corresponda.

#### Scenario: Antecedentes del paciente
- **WHEN** el paciente seleccionado tiene antecedentes fijos
- **THEN** el formulario de consulta los precarga desde `pacientes`
- **AND** muestra un resumen de antecedentes activos

#### Scenario: Respaldo desde ultima consulta
- **WHEN** el paciente no tiene antecedentes fijos cargados
- **THEN** el sistema intenta cargar antecedentes desde la ultima consulta del paciente

### Requirement: Datos oftalmologicos de consulta
El sistema SHALL registrar motivo, agudeza visual, presion ocular, refraccion, biomicroscopia, fondo de ojo, diagnostico y tratamiento con controles organizados para carga oftalmologica.

#### Scenario: Completar datos clinicos
- **WHEN** el usuario completa el formulario medico
- **THEN** el sistema conserva los campos de agudeza visual, PIO, refraccion de lejos y cerca, ADD, biomicroscopia, fondo de ojo, diagnostico y tratamiento
- **AND** agrupa esos campos por tipo de dato clinico para facilitar la carga

#### Scenario: Cargar AV y PIO por ojo
- **WHEN** el usuario carga agudeza visual o presion ocular
- **THEN** el sistema muestra controles equivalentes para OD y OI
- **AND** diferencia AV sin correccion, AV con correccion y PIO

#### Scenario: Cargar refraccion en grilla
- **WHEN** el usuario carga refraccion
- **THEN** el sistema muestra grillas separadas para lejos y cerca
- **AND** cada grilla organiza OD y OI con columnas ESF, CIL y EJE

#### Scenario: Calcular refraccion de cerca con ADD
- **WHEN** el usuario cambia el valor ADD
- **THEN** el sistema copia cilindro y eje de lejos a cerca
- **AND** suma ADD a la esfera de lejos para calcular esfera de cerca

### Requirement: Edicion protegida de consultas
El sistema SHALL limitar la edicion de consultas segun la configuracion `consulta_edit_limit_days`.

#### Scenario: Consulta editable
- **WHEN** la fecha de consulta esta dentro del limite permitido
- **THEN** el formulario permite editar y guardar mediante `PATCH /api/consultas/[id]`

#### Scenario: Consulta fuera de limite
- **WHEN** la fecha de consulta es anterior al limite configurado
- **THEN** el formulario queda en modo lectura
- **AND** el API rechaza el PATCH con estado 403

### Requirement: Navegacion clinica entre consultas
El sistema SHALL permitir navegar dentro del historial de consultas del mismo paciente y revisar una consulta existente con contexto clinico resumido.

#### Scenario: Consultas relacionadas del paciente
- **WHEN** se abre una consulta existente
- **THEN** el sistema carga las consultas del mismo paciente ordenadas por fecha y creacion
- **AND** identifica primera, anterior y posterior respecto de la consulta actual

#### Scenario: Resumen de consulta existente
- **WHEN** se abre una consulta existente
- **THEN** el sistema muestra una cabecera con paciente, fecha, edad, ficha y obra social cuando esten disponibles
- **AND** muestra un resumen clinico con motivo, diagnostico, tratamiento, PIO, AV, refraccion y antecedentes activos

#### Scenario: Acciones clinicas desde detalle
- **WHEN** se abre una consulta existente
- **THEN** el sistema permite crear receta vinculada a la consulta y al paciente
- **AND** permite imprimir anteojos desde la consulta
- **AND** permite abrir el paciente y crear una nueva consulta para el mismo paciente

### Requirement: Recetas asociadas a consulta
El sistema SHALL mostrar recetas emitidas para una consulta y permitir crear nuevas recetas vinculadas.

#### Scenario: Consulta con recetas
- **WHEN** una consulta tiene recetas con `consulta_id`
- **THEN** el sistema las muestra con fecha y acceso a su vista

#### Scenario: Crear receta desde consulta
- **WHEN** el usuario elige crear receta desde una consulta
- **THEN** el sistema navega a `/recetas/nueva?consulta_id=<consulta>&paciente_id=<paciente>`

### Requirement: Impresion de receta de anteojos
El sistema SHALL generar una hoja imprimible de refraccion de lejos y cerca desde una consulta.

#### Scenario: Imprimir anteojos
- **WHEN** el usuario abre `/consultas/[id]/imprimir-anteojos`
- **THEN** el sistema carga la consulta con paciente expandido
- **AND** muestra tablas de LEJOS y CERCA para OD y OI con esferico, cilindrico y eje

### Requirement: Consultas reasignadas por fusion de pacientes
El sistema SHALL conservar las consultas clinicas al fusionar pacientes duplicados.

#### Scenario: Fusion reasigna consultas
- **WHEN** un paciente duplicado se fusiona con un paciente principal
- **THEN** el sistema actualiza las consultas del duplicado para apuntar al paciente principal
- **AND** el historial clinico del paciente principal incluye esas consultas

#### Scenario: Consultas dejan de apuntar al duplicado
- **WHEN** la fusion finaliza correctamente
- **THEN** no quedan consultas activas asociadas al paciente duplicado
- **AND** el paciente duplicado conserva trazabilidad hacia el paciente principal

### Requirement: Consulta iniciada desde jornada medica
El sistema SHALL conservar el contexto del turno cuando una consulta clinica se inicia desde la jornada diaria del medico y ofrecer retorno directo a la misma jornada al finalizar.

#### Scenario: Precargar consulta desde turno
- **WHEN** el medico abre `/consultas/nueva` con `turno_id`
- **THEN** el sistema carga el turno con paciente asociado
- **AND** precarga paciente, numero de ficha, motivo y antecedentes disponibles

#### Scenario: Finalizar atencion del turno
- **WHEN** el medico guarda una consulta creada desde un turno
- **THEN** el sistema vincula la consulta al turno
- **AND** cambia el turno a `Atendido`
- **AND** muestra una accion para volver a la jornada medica del dia del turno

#### Scenario: Evitar consulta duplicada
- **WHEN** un turno ya tiene una consulta asociada
- **THEN** el sistema dirige al medico a la consulta existente
- **AND** no ofrece crear otra consulta para el mismo turno como accion principal

