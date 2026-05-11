## MODIFIED Requirements

### Requirement: Navegacion lateral autenticada
El sistema SHALL mostrar una barra lateral solo a usuarios autenticados con rol activo resuelto.

#### Scenario: Menu operativo
- **WHEN** un usuario autenticado navega por la aplicacion
- **THEN** la barra lateral muestra enlaces a Pacientes, Mutuales, Turnos, Consultas y Recetas
- **AND** no muestra Disponibilidades como pantalla independiente
- **AND** resalta el enlace de la ruta activa
