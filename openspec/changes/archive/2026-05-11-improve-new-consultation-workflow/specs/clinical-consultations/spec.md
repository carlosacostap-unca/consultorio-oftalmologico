## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado.

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

#### Scenario: Vincular consulta con turno
- **WHEN** la consulta se creo desde un turno
- **THEN** el sistema actualiza el turno con `consulta_id`
- **AND** cambia su estado a `Atendido`

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
El sistema SHALL registrar motivo, agudeza visual, presion ocular, refraccion, biomicroscopia, fondo de ojo, diagnostico y tratamiento.

#### Scenario: Completar datos clinicos
- **WHEN** el usuario completa el formulario medico
- **THEN** el sistema conserva los campos de agudeza visual, PIO, refraccion de lejos y cerca, ADD, biomicroscopia, fondo de ojo, diagnostico y tratamiento
- **AND** agrupa esos campos por tipo de dato clinico para facilitar la carga

#### Scenario: Calcular refraccion de cerca con ADD
- **WHEN** el usuario cambia el valor ADD
- **THEN** el sistema copia cilindro y eje de lejos a cerca
- **AND** suma ADD a la esfera de lejos para calcular esfera de cerca
