## 1. Configuracion

- [x] 1.1 Agregar claves y defaults de asunto/mensaje en `lib/system-settings.ts`.
- [x] 1.2 Extender carga y guardado en `lib/system-settings-server.ts`.
- [x] 1.3 Actualizar `scripts/ensure_appointment_email_reminders.mjs` para asegurar defaults de plantilla.

## 2. Backend

- [x] 2.1 Leer la guia local de Next.js para route handlers antes de crear el endpoint.
- [x] 2.2 Crear helper de renderizado de plantilla de recordatorio.
- [x] 2.3 Reusar el helper en el envio real de recordatorios.
- [x] 2.4 Crear `POST /api/configuracion/email-prueba` protegido por rol activo `admin`.
- [x] 2.5 Validar destinatario de prueba, SMTP completo y App Password configurada.

## 3. UI

- [x] 3.1 Agregar campos de asunto y mensaje en `/edicion-consultas`.
- [x] 3.2 Mostrar variables disponibles para la plantilla.
- [x] 3.3 Agregar campo de destinatario y accion de envio de prueba.
- [x] 3.4 Mostrar estados de guardado/envio y errores de prueba.

## 4. Validacion

- [x] 4.1 Agregar pruebas unitarias del renderizado de plantilla y defaults.
- [x] 4.2 Agregar prueba backend del endpoint de prueba con admin/no admin o helper equivalente.
- [x] 4.3 Actualizar prueba Playwright de configuracion admin para cubrir plantilla y accion de prueba visible.
- [x] 4.4 Ejecutar `npm.cmd run schema:test`.
- [x] 4.5 Ejecutar `npm.cmd run build`.
- [x] 4.6 Ejecutar prueba Playwright relevante o prueba backend equivalente.
- [x] 4.7 Validar OpenSpec.
