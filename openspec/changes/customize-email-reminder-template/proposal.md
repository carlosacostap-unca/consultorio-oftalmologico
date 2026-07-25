## Why

Los recordatorios por email ya pueden enviarse con parametros SMTP configurables, pero el texto queda fijo y el administrador no puede validar el resultado antes de activar el flujo real. Configurar asunto, mensaje y enviar un email de prueba reduce errores operativos y permite adaptar el tono del consultorio.

## What Changes

- Permitir que un administrador configure el asunto del recordatorio.
- Permitir que un administrador configure la plantilla del mensaje del recordatorio.
- Soportar variables simples en la plantilla, por ejemplo paciente, fecha, hora, medico, tipo, motivo y nombre del consultorio.
- Mostrar una referencia de variables disponibles en la pantalla de configuracion.
- Agregar una accion para enviar un email de prueba a una direccion indicada por el administrador.
- Reutilizar la misma configuracion SMTP real para el email de prueba.
- Validar que la App Password SMTP este configurada antes de intentar enviar una prueba.
- No enviar emails de prueba a pacientes automaticamente ni modificar turnos.

## Capabilities

### New Capabilities

### Modified Capabilities

- `appointment-email-reminders`: los recordatorios usan asunto y mensaje configurables, y el sistema permite enviar una prueba controlada.
- `administration-and-settings`: la configuracion administrativa de recordatorios incluye plantilla y accion de prueba.

## Impact

- Configuracion: nuevas claves en `system_settings` para asunto y cuerpo de plantilla.
- Backend: helper de renderizado de plantillas y endpoint admin para enviar email de prueba.
- UI admin: nuevos campos de asunto, mensaje y destinatario de prueba en `/edicion-consultas`.
- Pruebas: cobertura de renderizado de plantilla, defaults y envio de prueba sin exponer secretos.
