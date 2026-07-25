## MODIFIED Requirements

### Requirement: Recordatorios por email de turnos
El sistema SHALL enviar recordatorios por email a pacientes antes de sus turnos segun la configuracion vigente, usando la plantilla administrativa configurada.

#### Scenario: Enviar recordatorio con plantilla configurada
- **WHEN** los recordatorios estan activos
- **AND** existe asunto y mensaje configurados
- **AND** un turno futuro cumple las condiciones de envio
- **THEN** el sistema renderiza el asunto y mensaje con los datos del turno
- **AND** envia el email usando ese contenido
- **AND** marca el turno con `recordatorio_email_enviado_at`

#### Scenario: Usar defaults cuando falta plantilla
- **WHEN** los recordatorios estan activos
- **AND** no existe asunto o mensaje configurado
- **THEN** el sistema usa el asunto y mensaje por defecto
- **AND** mantiene el envio del recordatorio

#### Scenario: Reemplazar variables permitidas
- **WHEN** la plantilla incluye `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{medico}}`, `{{tipo}}`, `{{motivo}}` o `{{consultorio}}`
- **THEN** el sistema reemplaza cada variable por el dato correspondiente del turno o por texto vacio si el dato no existe
- **AND** no interpreta HTML ni ejecuta codigo dentro de la plantilla

### Requirement: Email de prueba de recordatorios
El sistema SHALL permitir a administradores enviar un email de prueba de recordatorio sin modificar turnos.

#### Scenario: Enviar email de prueba
- **WHEN** un admin con rol activo `admin` indica un destinatario de prueba
- **AND** la configuracion SMTP esta completa
- **THEN** el sistema renderiza la plantilla con datos de muestra
- **AND** envia un email al destinatario indicado
- **AND** responde que la prueba fue enviada

#### Scenario: Bloquear prueba sin SMTP completo
- **WHEN** un admin intenta enviar una prueba sin App Password SMTP o remitente configurado
- **THEN** el sistema responde un error claro
- **AND** no intenta enviar el email

#### Scenario: Rechazar usuario no admin
- **WHEN** un usuario sin rol activo `admin` llama el endpoint de prueba
- **THEN** el sistema responde `403`
- **AND** no envia emails
