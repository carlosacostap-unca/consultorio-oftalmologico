## Context

La aplicacion usa Next.js 16 con PocketBase como fuente de datos. La configuracion existente se guarda en `system_settings` y se expone mediante `/api/configuracion`. Los turnos viven en `turnos` y expanden `paciente_id`; los datos de contacto del paciente son necesarios para enviar el recordatorio.

El envio no debe depender de una pantalla abierta. Debe ejecutarse del lado servidor mediante una ruta protegida que pueda llamar un cron externo. Gmail se usara por SMTP con App Password porque Google no permite usar la contrasena normal de la cuenta para este tipo de integraciones. El administrador podra configurar los parametros SMTP desde la aplicacion, pero el secreto no debe volver al navegador despues de guardarse.

## Goals / Non-Goals

**Goals:**
- Enviar un unico email de recordatorio por turno dentro de una ventana configurable.
- Permitir configurar horas de anticipacion y activar/desactivar la funcionalidad.
- Permitir configurar parametros SMTP desde UI administrativa.
- Mantener la App Password fuera del bundle cliente y devolverla solo como indicador de configuracion, nunca como valor plano.
- Registrar resultado de envio en el turno para evitar duplicados y facilitar auditoria basica.
- Proveer un proceso invocable por cron y seguro frente a ejecuciones repetidas.

**Non-Goals:**
- No implementar SMS ni WhatsApp en esta etapa.
- No crear una cola distribuida completa ni reintentos avanzados.
- No enviar correos desde el cliente.
- No implementar OAuth de Gmail en esta etapa.

## Decisions

1. **Proveedor Gmail por SMTP server-side configurable**
   - Guardar `email_smtp_host`, `email_smtp_port`, `email_smtp_secure`, `email_smtp_user`, `email_smtp_from_name` y `email_smtp_from_address` en `system_settings`.
   - Usar defaults compatibles con Gmail: `smtp.gmail.com`, puerto `465`, TLS activo.
   - La clave debe ser una App Password de Gmail, no la contrasena principal.

2. **Secreto SMTP de solo escritura**
   - Guardar `email_smtp_password_encrypted` cifrado con una clave de servidor `EMAIL_SETTINGS_ENCRYPTION_KEY`.
   - `GET /api/configuracion` no devuelve la App Password; solo devuelve `emailSmtpPasswordConfigured: true/false`.
   - `PATCH /api/configuracion` actualiza la App Password solo si el admin envia un valor nuevo no vacio.
   - Si no existe `EMAIL_SETTINGS_ENCRYPTION_KEY`, el backend no permite guardar una App Password desde UI y devuelve un error claro de configuracion.

3. **Configuracion funcional en `system_settings`**
   - Guardar `appointment_reminders_enabled` como booleano normalizado.
   - Guardar `appointment_reminder_hours_before` como entero positivo.
   - Usar un default conservador de 24 horas si no existe configuracion.

4. **Campos de control en `turnos`**
   - Agregar `recordatorio_email_enviado_at` para marcar envio exitoso.
   - Agregar `recordatorio_email_error` opcional para el ultimo error resumido.
   - No reescribir historicos salvo crear campos vacios.

5. **Ventana de procesamiento tolerante a cron**
   - En cada ejecucion, seleccionar turnos futuros cuyo horario caiga entre `now + hoursBefore` y `now + hoursBefore + lookahead`.
   - Usar un margen configurable o fijo segun frecuencia esperada del cron, por ejemplo 15 minutos.
   - Excluir turnos con estados terminales o con `recordatorio_email_enviado_at` ya definido.

6. **Endpoint protegido para cron**
   - Crear `POST /api/turnos/recordatorios/procesar`.
   - Validar un secreto `APPOINTMENT_REMINDER_CRON_SECRET` enviado por header para evitar ejecuciones publicas.
   - Devolver conteos de candidatos, enviados, omitidos y errores sin exponer datos sensibles.

7. **Contenido del email**
   - Asunto: recordatorio de turno del consultorio.
   - Cuerpo: paciente, fecha, hora, medico si esta disponible y tipo/motivo cuando corresponda.
   - Mantener texto sobrio y sin informacion clinica sensible mas alla de la cita.

## Risks / Trade-offs

- [Gmail limita volumen y puede bloquear credenciales mal configuradas] -> Usar App Password y reportar error operacional claro si falla SMTP.
- [Guardar secretos en configuracion aumenta el impacto de una filtracion de base] -> Cifrar la App Password con clave de servidor, no devolverla por API y permitir rotarla desde UI.
- [El admin puede borrar accidentalmente la App Password] -> Tratar campo vacio como "mantener secreto actual" y ofrecer una accion explicita para reemplazarla.
- [Cron puede ejecutarse mas de una vez] -> La marca `recordatorio_email_enviado_at` evita duplicados despues de envio exitoso.
- [Un turno puede reprogramarse despues de un recordatorio] -> En la primera etapa no se reenvia automaticamente; al reprogramar podria limpiarse la marca si el nuevo horario vuelve a requerir recordatorio.
- [Pacientes sin email] -> Se omiten y se reportan como no enviables, sin bloquear el proceso.
- [Diferencias de zona horaria] -> Comparar fechas en ISO/UTC y formatear el email en horario local del consultorio.
