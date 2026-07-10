## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado con campos narrativos multilÃ­nea, contexto clinico previo del paciente disponible bajo demanda, auditoria de creacion, acciones de cierre asistidas al finalizar el guardado y una disposicion compacta de escritorio para monitores Full HD.

#### Scenario: Mostrar contexto clinico previo
- **WHEN** el usuario selecciona o abre una nueva consulta con paciente
- **THEN** el sistema permite abrir el contexto clinico previo desde una accion visible al final del formulario
- **AND** el contexto incluye ultimas consultas con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** incluye recetas recientes con fecha, medicamentos e indicaciones cuando existan
- **AND** permite abrir consultas y recetas previas desde esa seccion
- **AND** en escritorio el contexto no ocupa ancho permanente ni aumenta la altura del documento cuando esta oculto

#### Scenario: Formulario clinico organizado
- **WHEN** el usuario abre una nueva consulta
- **THEN** el sistema muestra secciones distinguibles para paciente, antecedentes, motivo, examen oftalmologico, refraccion y cierre clinico
- **AND** mantiene disponibles todos los campos clinicos actuales
- **AND** permite cargar biomicroscopia, fondo de ojo, diagnostico y tratamiento como texto multilÃ­nea
- **AND** en un monitor Full HD prioriza que la carga clinica y los controles de guardado queden dentro del area visible de escritorio sin scroll vertical de pagina

#### Scenario: Retornar desde nueva consulta
- **WHEN** el usuario llega al final de la pantalla de nueva consulta
- **THEN** el sistema muestra una accion `Volver` junto con las acciones de cierre
- **AND** no muestra una cabecera superior dedicada a navegacion o contexto

### Requirement: Navegacion clinica entre consultas
El sistema SHALL permitir navegar dentro del historial de consultas del mismo paciente y revisar una consulta existente con contexto clinico resumido y continuidad de acciones.

#### Scenario: Consultas relacionadas del paciente
- **WHEN** se abre una consulta existente
- **THEN** el sistema carga las consultas del mismo paciente ordenadas por fecha y creacion
- **AND** identifica primera, anterior y posterior respecto de la consulta actual

#### Scenario: Resumen de consulta existente
- **WHEN** se abre una consulta existente
- **THEN** el sistema muestra una cabecera con paciente, fecha, edad, ficha y obra social cuando esten disponibles
- **AND** muestra un resumen clinico con motivo, diagnostico, tratamiento, PIO, AV, refraccion y antecedentes activos
- **AND** muestra un panel de continuidad clinica con estado de diagnostico, tratamiento, recetas emitidas y datos clave del paciente

#### Scenario: Acciones clinicas desde detalle
- **WHEN** se abre una consulta existente
- **THEN** el sistema permite crear receta vinculada a la consulta y al paciente
- **AND** permite imprimir anteojos desde la consulta
- **AND** permite imprimir un informe clinico de la consulta
- **AND** permite abrir el paciente y crear una nueva consulta para el mismo paciente
- **AND** mantiene esas acciones visibles en el panel de continuidad

#### Scenario: Acciones de navegacion al final de la consulta
- **WHEN** el usuario llega al final de una consulta existente
- **THEN** el sistema muestra `Volver` y `Ver contexto` en las acciones inferiores
- **AND** conserva sus comportamientos de retorno y acceso al contexto clinico
- **AND** no muestra una cabecera superior dedicada a esas acciones
