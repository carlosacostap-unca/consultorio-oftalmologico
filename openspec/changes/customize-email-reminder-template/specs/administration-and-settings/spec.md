## MODIFIED Requirements

### Requirement: Configuracion de recordatorios de turnos
El sistema SHALL permitir administrar la activacion, anticipacion, parametros SMTP, plantilla y prueba de los recordatorios de turnos.

#### Scenario: Cargar plantilla de recordatorio
- **WHEN** un usuario autenticado llama `GET /api/configuracion`
- **THEN** el sistema devuelve asunto y mensaje configurados para el recordatorio
- **AND** si no existen devuelve los valores por defecto

#### Scenario: Guardar plantilla de recordatorio
- **WHEN** un admin llama `PATCH /api/configuracion` con asunto o mensaje de recordatorio
- **THEN** el sistema normaliza los textos
- **AND** crea o actualiza las claves correspondientes en `system_settings`

#### Scenario: Administrar plantilla desde la UI
- **WHEN** un admin con rol activo `admin` abre `/edicion-consultas`
- **THEN** la pantalla muestra campos para asunto y mensaje del recordatorio
- **AND** muestra las variables disponibles para usar en la plantilla
- **AND** permite guardar la plantilla junto con la configuracion de recordatorios

#### Scenario: Enviar prueba desde la UI
- **WHEN** un admin completa una direccion de prueba y solicita enviar
- **THEN** la pantalla llama el endpoint de prueba
- **AND** informa exito o error sin navegar fuera de la configuracion
