## MODIFIED Requirements

### Requirement: Configuracion de recordatorios de turnos
El sistema SHALL permitir administrar la activacion, anticipacion, parametros SMTP, plantilla y prueba de los recordatorios de turnos.

#### Scenario: Cargar configuracion de recordatorios
- **WHEN** un usuario autenticado llama `GET /api/configuracion`
- **THEN** el sistema devuelve si los recordatorios de turnos estan activos
- **AND** devuelve la cantidad de horas de anticipacion configurada
- **AND** devuelve host, puerto, seguridad TLS, usuario y remitente SMTP
- **AND** devuelve si la App Password SMTP esta configurada sin incluir su valor
- **AND** si no existe configuracion usa recordatorios desactivados y 24 horas como valor por defecto

#### Scenario: Guardar configuracion de recordatorios
- **WHEN** un admin llama `PATCH /api/configuracion` con la configuracion de recordatorios
- **THEN** el sistema normaliza la activacion a booleano
- **AND** normaliza las horas de anticipacion a entero positivo
- **AND** crea o actualiza las claves correspondientes en `system_settings`

#### Scenario: Guardar parametros SMTP
- **WHEN** un admin guarda host, puerto, TLS, usuario, remitente y App Password SMTP
- **THEN** el sistema persiste los parametros no sensibles en `system_settings`
- **AND** guarda la App Password como secreto cifrado de solo escritura
- **AND** no devuelve la App Password en la respuesta

#### Scenario: Mantener App Password existente
- **WHEN** un admin guarda la configuracion SMTP sin completar una nueva App Password
- **THEN** el sistema conserva el secreto SMTP existente
- **AND** mantiene el indicador de App Password configurada

#### Scenario: Bloquear secreto sin clave de cifrado
- **WHEN** un admin intenta guardar una App Password SMTP y el servidor no tiene `EMAIL_SETTINGS_ENCRYPTION_KEY`
- **THEN** el endpoint responde error de configuracion
- **AND** no persiste la App Password en texto plano

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
