## MODIFIED Requirements

### Requirement: Linea de tiempo clinica del paciente
El sistema SHALL mostrar una historia clinica unificada en la ficha de lectura del paciente, combinando consultas y recetas recientes en orden cronologico descendente, y SHALL permitir filtrar, buscar, accionar, desplegar detalle y controlar la cantidad de eventos visibles. El sistema SHALL mostrar ademas un resumen accionable de continuidad clinica con ultima atencion, ultima receta y accion sugerida.

#### Scenario: Editar consulta desde ficha del paciente
- **WHEN** un medico abre la ficha de un paciente
- **AND** una consulta del historial esta dentro del limite de edicion configurado
- **THEN** el sistema muestra una accion para editar esa consulta
- **AND** la accion navega a `/consultas/<id>`

#### Scenario: Ocultar edicion no permitida desde ficha del paciente
- **WHEN** una consulta del historial excede el limite de edicion configurado
- **OR** el usuario no opera con rol medico
- **THEN** el sistema no muestra accion de edicion para esa consulta
