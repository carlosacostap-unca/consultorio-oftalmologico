## ADDED Requirements

### Requirement: Recordatorios por email de turnos
El sistema SHALL enviar recordatorios por email a pacientes antes de sus turnos segun la configuracion vigente.

#### Scenario: Enviar recordatorio dentro de la ventana configurada
- **WHEN** los recordatorios estan activos
- **AND** un turno futuro tiene email de paciente
- **AND** su fecha y hora caen dentro de la ventana configurada de anticipacion
- **THEN** el proceso de recordatorios envia un email al paciente
- **AND** marca el turno con `recordatorio_email_enviado_at`

#### Scenario: Evitar recordatorios duplicados
- **WHEN** un turno ya tiene `recordatorio_email_enviado_at`
- **THEN** el proceso de recordatorios no vuelve a enviar email para ese turno

#### Scenario: Omitir turno sin email
- **WHEN** un turno candidato no tiene email de paciente
- **THEN** el proceso lo omite sin fallar la ejecucion completa
- **AND** lo contabiliza como no enviable

#### Scenario: Omitir estados terminales
- **WHEN** un turno esta cancelado, atendido o ausente
- **THEN** el proceso no envia recordatorio aunque el horario caiga dentro de la ventana

#### Scenario: Registrar error de envio
- **WHEN** falla el envio SMTP para un turno candidato
- **THEN** el proceso registra un error resumido en el turno
- **AND** continua procesando los demas candidatos

### Requirement: Procesamiento protegido de recordatorios
El sistema SHALL exponer un proceso server-side protegido para ejecutar recordatorios desde un cron externo.

#### Scenario: Ejecutar con secreto valido
- **WHEN** un cron llama `POST /api/turnos/recordatorios/procesar` con el secreto configurado
- **THEN** el sistema procesa los turnos candidatos
- **AND** responde con conteos de candidatos, enviados, omitidos y errores

#### Scenario: Rechazar secreto invalido
- **WHEN** un request llama el endpoint sin secreto valido
- **THEN** el sistema responde `401`
- **AND** no procesa recordatorios
