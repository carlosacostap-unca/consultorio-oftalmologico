## MODIFIED Requirements

### Requirement: Listado de consultas
El sistema SHALL listar consultas con filtros por paciente, letra inicial y fecha, mostrando por defecto primero las atenciones clinicas mas recientes.

#### Scenario: Cargar consultas
- **WHEN** el usuario abre `/consultas`
- **THEN** el sistema consulta `consultas` paginadas de a 20
- **AND** ordena por fecha descendente y creacion descendente
- **AND** expande `paciente_id`
- **AND** no muestra fechas futuras en el listado general sin filtro de fecha

#### Scenario: Filtrar por paciente
- **WHEN** el usuario busca por nombre, apellido, documento o ficha
- **THEN** el sistema busca primero pacientes coincidentes
- **AND** filtra consultas por los IDs encontrados

#### Scenario: Filtrar por fecha
- **WHEN** el usuario selecciona una fecha
- **THEN** el sistema muestra consultas entre el inicio y fin de ese dia
