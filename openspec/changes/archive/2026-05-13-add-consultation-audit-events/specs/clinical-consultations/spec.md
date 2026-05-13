## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado con campos narrativos multilínea, contexto clinico previo del paciente, auditoria de creacion y acciones de cierre asistidas al finalizar el guardado.

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

#### Scenario: Mostrar contexto clinico previo
- **WHEN** el usuario selecciona o abre una nueva consulta con paciente
- **THEN** el sistema muestra una seccion de contexto clinico del paciente
- **AND** incluye ultimas consultas con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** incluye recetas recientes con fecha, medicamentos e indicaciones cuando existan
- **AND** permite abrir consultas y recetas previas desde esa seccion

#### Scenario: Paciente sin historia previa
- **WHEN** el paciente seleccionado no tiene consultas ni recetas registradas
- **THEN** el sistema muestra estados vacios claros
- **AND** permite continuar la carga y guardado de la nueva consulta

#### Scenario: Formulario clinico organizado
- **WHEN** el usuario abre una nueva consulta
- **THEN** el sistema muestra secciones distinguibles para paciente, antecedentes, motivo, examen oftalmologico, refraccion y cierre clinico
- **AND** mantiene disponibles todos los campos clinicos actuales
- **AND** permite cargar biomicroscopia, fondo de ojo, diagnostico y tratamiento como texto multilínea

#### Scenario: Guardar consulta
- **WHEN** el usuario guarda la consulta con paciente seleccionado
- **THEN** el sistema crea un registro en `consultas`
- **AND** guarda la fecha en formato ISO
- **AND** registra un evento de auditoria de creacion de consulta
- **AND** muestra una confirmacion de consulta guardada sin redirigir automaticamente

#### Scenario: Acciones posteriores al guardado
- **WHEN** la consulta se guarda correctamente
- **THEN** el sistema muestra una accion recomendada para continuar la atencion
- **AND** recomienda crear receta cuando la consulta tiene tratamiento cargado
- **AND** recomienda imprimir anteojos cuando no hay tratamiento y hay refraccion cargada
- **AND** recomienda volver al contexto anterior cuando no hay tratamiento ni refraccion
- **AND** mantiene acciones secundarias para abrir consulta, abrir ficha del paciente, crear receta, imprimir anteojos y volver al contexto anterior

#### Scenario: Vincular consulta con turno
- **WHEN** la consulta se creo desde un turno
- **THEN** el sistema actualiza el turno con `consulta_id`
- **AND** cambia su estado a `Atendido`
- **AND** informa que el turno fue marcado como atendido

## ADDED Requirements

### Requirement: Auditoria de consultas
El sistema SHALL registrar y mostrar eventos de auditoria asociados a cada consulta clinica.

#### Scenario: Crear evento de consulta
- **WHEN** se crea una consulta
- **THEN** el sistema registra un evento asociado a la consulta
- **AND** guarda actor, tipo, titulo, detalle y fecha de creacion

#### Scenario: Editar consulta
- **WHEN** se actualiza una consulta existente
- **THEN** el sistema registra un evento de edicion asociado a la consulta
- **AND** conserva la consulta actualizada aunque el registro de auditoria falle

#### Scenario: Ver historial de auditoria
- **WHEN** el usuario abre el detalle de una consulta
- **THEN** el sistema carga los eventos de auditoria de esa consulta
- **AND** los muestra ordenados por fecha descendente

#### Scenario: Consulta sin eventos
- **WHEN** una consulta no tiene eventos registrados
- **THEN** el sistema informa que aun no hay historial de auditoria para esa consulta
