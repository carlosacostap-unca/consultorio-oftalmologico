## Context

El cambio `add-appointment-email-reminders` agrego configuracion SMTP, App Password cifrada, procesamiento por cron y una pantalla admin dentro de `/edicion-consultas`. El contenido actual del email se arma en servidor con texto fijo. Esta mejora extiende esa configuracion sin cambiar el mecanismo de envio ni el modelo de deduplicacion.

## Goals / Non-Goals

**Goals:**
- Permitir editar asunto y cuerpo del recordatorio desde la pantalla administrativa.
- Mantener defaults seguros y claros si no existe plantilla configurada.
- Renderizar variables permitidas de forma controlada, sin ejecutar codigo ni HTML.
- Enviar un email de prueba a una direccion indicada manualmente por el admin.
- Usar la misma configuracion SMTP real para la prueba.
- Reportar errores SMTP de prueba de forma clara.

**Non-Goals:**
- No implementar editor HTML ni adjuntos.
- No agregar multiples plantillas por medico o tipo de turno.
- No modificar historicos ni reenviar turnos ya recordados.
- No guardar un historial completo de emails de prueba.

## Decisions

1. **Plantillas en `system_settings`**
   - Guardar `appointment_reminder_email_subject_template`.
   - Guardar `appointment_reminder_email_body_template`.
   - Cargar defaults cuando las claves no existan o esten vacias.

2. **Variables permitidas**
   - Soportar placeholders con doble llave: `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{medico}}`, `{{tipo}}`, `{{motivo}}`, `{{consultorio}}`.
   - Reemplazar variables desconocidas por texto vacio o conservarlas con advertencia de validacion. Para una primera version, conservarlas dificulta detectar errores; se prefiere reemplazarlas por vacio y cubrir con previsualizacion/prueba.
   - El renderizado sera texto plano, sin HTML.

3. **Uso en recordatorios reales**
   - El helper que compone emails de recordatorio debe usar las plantillas renderizadas.
   - Si el asunto renderizado queda vacio, usar el asunto default.
   - Si el cuerpo renderizado queda vacio, usar el cuerpo default.

4. **Email de prueba**
   - Crear `POST /api/configuracion/email-prueba`.
   - Requerir usuario autenticado con rol activo `admin`.
   - Recibir destinatario de prueba y valores opcionales de muestra.
   - Enviar usando la configuracion SMTP existente y las plantillas guardadas.
   - No crear ni actualizar `turnos`.

5. **Previsualizacion simple**
   - La UI puede mostrar texto de ayuda con variables disponibles.
   - La validacion real del resultado se confirma con el envio de prueba.

## Risks / Trade-offs

- [Plantillas mal escritas] -> Mitigacion: listar variables disponibles y permitir envio de prueba antes de activar.
- [Email de prueba usado como envio libre] -> Mitigacion: restringir a rol activo `admin` y enviar un solo destinatario por request.
- [Texto sensible accidental en plantilla] -> Mitigacion: mantener el alcance del recordatorio como cita administrativa y no agregar variables clinicas.
- [Configuracion SMTP incompleta] -> Mitigacion: devolver error operacional claro antes de intentar enviar.
