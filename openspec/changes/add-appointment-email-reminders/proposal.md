## Why

El consultorio necesita reducir ausencias y llamados manuales recordando al paciente su turno con anticipacion. Como ya existe una agenda centralizada, el sistema puede detectar turnos proximos y enviar un correo automatico antes del horario asignado.

La cuenta disponible para el envio sera Gmail. El administrador necesita poder configurar los parametros SMTP desde la aplicacion, cuidando que la App Password no se exponga al cliente una vez guardada.

## What Changes

- Agregar envio automatico de recordatorios por email para turnos proximos.
- Hacer configurable la cantidad de horas de anticipacion del recordatorio.
- Permitir activar o desactivar los recordatorios desde configuracion administrativa.
- Permitir que un administrador configure host, puerto, seguridad TLS, usuario, remitente y App Password SMTP.
- Usar Gmail SMTP mediante App Password guardada como secreto de solo escritura.
- Registrar en cada turno si el recordatorio fue enviado para evitar duplicados.
- Omitir turnos sin email de paciente, cancelados, atendidos, ausentes o ya recordados.
- Agregar un endpoint/worker server-side invocable por cron para procesar recordatorios pendientes.
- Agregar cobertura de esquema y pruebas del calculo de ventana de envio.

## Capabilities

### New Capabilities

- `appointment-email-reminders`: el sistema envia recordatorios por email antes del turno y controla duplicados.

### Modified Capabilities

- `appointment-scheduling`: los turnos futuros pueden quedar marcados con el estado del recordatorio enviado.
- `administration-and-settings`: la configuracion administrativa incluye recordatorios de turnos.

## Impact

- Esquema PocketBase: agregar campos de control en `turnos` y configuraciones en `system_settings`.
- Configuracion segura: parametros SMTP en `system_settings`, App Password de solo escritura y variable `EMAIL_SETTINGS_ENCRYPTION_KEY` para cifrar secretos persistidos.
- Backend: nuevo helper de email y endpoint de procesamiento de recordatorios.
- UI admin: extender la pantalla de configuracion correspondiente para activar recordatorios, definir horas previas y administrar parametros SMTP.
- Operacion: requiere programar un cron externo que invoque el endpoint periodicamente.
- Pruebas: agregar tests unitarios/funcionales para ventana de envio, deduplicacion y configuracion.
