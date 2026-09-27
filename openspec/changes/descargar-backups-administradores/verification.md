# Verificación de descarga de backups

## Código y permisos

- Suite `test:sync-core`: 181 pruebas aprobadas; incluye 7 nuevas de backups y ampliación de alcance de rutas Windows.
- Pruebas con el autorizador real `requireAdmin` y respuestas PocketBase controladas: médico/secretaria con cabecera admin, admin con rol médico activo, token vencido y usuario central distinto reciben 403 sin listar ni firmar.
- Descargas: rechazo de nombres manipulados, rutas externas y backups eliminados; respuesta 503 por falta de credenciales; ausencia de secretos en errores.
- Firma S3 con credenciales sintéticas: objeto exacto, vencimiento de 300 segundos, HTTPS y `Content-Disposition: attachment`. No realiza llamadas de red ni descarga contenido.
- Bridge: valida token local y rol, usa origen/rutas fijos y transmite la identidad local para cotejarla con la sesión central. No entrega el token central al renderer.
- Lint del código del proyecto, TypeScript y build Next.js 16.3.5 aprobados. Se excluyeron del lint los directorios de artefactos no versionados `.tmp`, `output`, `.codex-remote-attachments` y `entregables`.
- OpenSpec validado en modo estricto.

## Integración y pantalla

- Backend local compilado conectado a PocketBase staging, con usuarios de pruebas existentes: admin activo obtiene 200; sin sesión, médico y admin con rol médico obtienen 403. Nombres manipulados reciben 400. Descarga real sin credenciales configuradas recibe 503.
- Listado real: 34 archivos, 30 automáticos y 4 manuales; límite de automáticos configurado en 30. Sólo se consultaron metadatos.
- Navegador Chromium contra el build: pantalla web y desktop con datos sintéticos; tabla, enlace de menú, descarga de archivo sintético, estado offline, vacío/error y ocultamiento al cambiar a médico aprobados, sin errores JavaScript.
- Electron 43.1.0 real: perfil temporal, preload real, módulo `backup-client.mjs` real y servicios simulados. La descarga nativa emitió `will-download`, terminó en estado `completed` y los bytes guardados coincidieron con el archivo sintético.
- Capturas de web y escritorio inspeccionadas, sin superposición de tabla, menú o botones.
- Evidencia local: `output/playwright/backups-verification.json`, `backups-electron-verification.json`, `backups-web.png`, `backups-windows.png`.

## Alcance pendiente de operación

El 27/09/2026 el usuario confirmó que configuró las credenciales de lectura en el servidor y lo volvió a desplegar. Se inicia la publicación de los cambios web y Windows 0.1.15; la versión 0.1.14 anterior no contiene este módulo.

El endpoint `/api/backups` todavía devolvía 404 en producción y staging antes de integrar el cambio. Las credenciales fueron configuradas por el usuario en el servidor, no se dispone de ellas en el entorno local ni se han copiado. La descarga firmada real deberá comprobarse después del despliegue con una sesión administrativa. No se descargaron bases clínicas reales. Staging usa actualmente el mismo bucket de backups que producción.

Instrucciones: `docs/admin-backup-downloads.md`.
