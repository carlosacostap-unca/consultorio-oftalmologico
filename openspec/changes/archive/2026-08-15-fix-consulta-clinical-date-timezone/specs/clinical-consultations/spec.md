## ADDED Requirements

### Requirement: Fecha clinica estable de consulta
El sistema SHALL tratar la `fecha` de una consulta como dia clinico de atencion, sin desplazarla por zona horaria al guardar, editar, filtrar, validar editabilidad, listar, ver o imprimir.

#### Scenario: Crear consulta conserva el dia elegido
- **WHEN** el medico crea una consulta con fecha `2026-06-23`
- **THEN** el sistema guarda una representacion estable de esa fecha clinica
- **AND** cualquier vista de consulta muestra `23/06/2026` en Argentina

#### Scenario: Editar consulta conserva el dia elegido
- **WHEN** el usuario edita una consulta y selecciona una fecha desde el control de calendario
- **THEN** el sistema envia al API una fecha clinica estable
- **AND** al volver a abrir la consulta el control de calendario muestra el mismo dia seleccionado

#### Scenario: Evaluar limite de edicion por dia clinico
- **WHEN** el sistema decide si una consulta esta dentro del limite configurable de edicion
- **THEN** compara por dia clinico de consulta
- **AND** no adelanta ni atrasa el dia por convertir medianoche UTC a zona horaria local

#### Scenario: Filtrar consultas por fecha
- **WHEN** el usuario filtra el listado de consultas por una fecha
- **THEN** el sistema incluye las consultas cuyo dia clinico coincide con la fecha seleccionada
