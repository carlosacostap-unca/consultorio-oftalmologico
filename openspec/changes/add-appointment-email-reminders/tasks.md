## 1. Schema

- [x] 1.1 Crear script idempotente para agregar campos de recordatorio a `turnos`.
- [x] 1.2 Integrar el script en `schema:test`.
- [x] 1.3 Asegurar configuraciones `appointment_reminders_enabled`, `appointment_reminder_hours_before` y parametros SMTP en `system_settings`.

## 2. Backend

- [x] 2.1 Leer la guia relevante de Next.js en `node_modules/next/dist/docs/` antes de editar route handlers.
- [x] 2.2 Agregar helper server-side para cargar configuracion de recordatorios.
- [x] 2.3 Agregar helper de seleccion de turnos candidatos.
- [x] 2.4 Agregar helper server-side para cifrar, guardar y leer la App Password SMTP con `EMAIL_SETTINGS_ENCRYPTION_KEY`.
- [x] 2.5 Instalar y configurar el envio SMTP con Gmail desde parametros administrados.
- [x] 2.6 Crear helper de composicion y envio de email de recordatorio.
- [x] 2.7 Crear `POST /api/turnos/recordatorios/procesar` protegido por secreto de cron.
- [x] 2.8 Marcar turnos enviados y guardar error resumido ante fallas por turno.

## 3. UI / Configuracion

- [x] 3.1 Extender `/api/configuracion` para leer y guardar configuracion de recordatorios y parametros SMTP.
- [x] 3.2 Agregar controles administrativos para activar/desactivar recordatorios y definir horas previas.
- [x] 3.3 Agregar controles administrativos para host, puerto, TLS, usuario SMTP, remitente y App Password.
- [x] 3.4 Mostrar la App Password como configurada/no configurada, sin revelar el valor guardado.

## 4. Validation

- [x] 4.1 Agregar pruebas del calculo de ventana de recordatorio y deduplicacion.
- [x] 4.2 Agregar pruebas de guardado seguro de configuracion SMTP sin devolver la App Password.
- [x] 4.3 Agregar prueba del endpoint con secreto valido/invalido.
- [x] 4.4 Ejecutar bootstrap de esquema de testing.
- [x] 4.5 Ejecutar `npm.cmd run build`.
- [x] 4.6 Ejecutar la prueba Playwright relevante o una prueba backend equivalente.
- [x] 4.7 Validar OpenSpec.
