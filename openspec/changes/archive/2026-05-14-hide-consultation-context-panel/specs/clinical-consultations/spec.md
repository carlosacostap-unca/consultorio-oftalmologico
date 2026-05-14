## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado con campos narrativos multilínea, contexto clinico previo del paciente disponible bajo demanda, auditoria de creacion, acciones de cierre asistidas al finalizar el guardado y una disposicion compacta de escritorio para monitores Full HD.

#### Scenario: Mostrar contexto clinico previo
- **WHEN** el usuario selecciona o abre una nueva consulta con paciente
- **THEN** el sistema permite abrir el contexto clinico previo desde una accion visible
- **AND** el contexto incluye ultimas consultas con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** incluye recetas recientes con fecha, medicamentos e indicaciones cuando existan
- **AND** permite abrir consultas y recetas previas desde esa seccion
- **AND** en escritorio el contexto no ocupa ancho permanente ni aumenta la altura del documento cuando esta oculto

#### Scenario: Formulario clinico organizado
- **WHEN** el usuario abre una nueva consulta
- **THEN** el sistema muestra secciones distinguibles para paciente, antecedentes, motivo, examen oftalmologico, refraccion y cierre clinico
- **AND** mantiene disponibles todos los campos clinicos actuales
- **AND** permite cargar biomicroscopia, fondo de ojo, diagnostico y tratamiento como texto multilínea
- **AND** en un monitor Full HD prioriza que la carga clinica y los controles de guardado queden dentro del area visible de escritorio sin scroll vertical de pagina
