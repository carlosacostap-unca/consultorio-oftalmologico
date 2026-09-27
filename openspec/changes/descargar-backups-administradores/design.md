## Context

PocketBase central tiene backups S3 activos y una tarea diaria con `cronMaxKeep=30`. Hay también respaldos manuales. Su API de settings oculta el secreto S3; el listado de backups devuelve `key`, `modified`, `size`. Los administradores de la aplicación son registros users, no superusuarios PocketBase.

## Goals / Non-Goals

**Goals:** Listado exacto, autorización central por solicitud, descarga directa de un archivo y misma experiencia en web/Windows con estados de carga, vacío, error y falta de conexión.

**Non-Goals:** Crear, eliminar, restaurar o programar backups; cambiar retención; entregar credenciales o tokens de superusuario; respaldos locales de Windows.

## Decisions

- Reutilizar `requireAdmin`: verificar sesión con PocketBase y rol activo `admin`. Denegar las APIs locales cuando `DESKTOP_RUNTIME=1`.
- Consultar `/api/settings` y `/api/backups` sólo tras autorización. Devolver metadatos públicos mínimos; ordenar por fecha descendente. Mostrar el límite configurado como cantidad de automáticos, no como garantía de días.
- Firmar `GetObject` durante 300 segundos usando endpoint/bucket/region de la configuración de backups y las variables servidor `BACKUP_S3_ACCESS_KEY_ID` y `BACKUP_S3_SECRET_ACCESS_KEY`. Nunca reutilizar credenciales o bucket de releases. Validar nombre y pertenencia al listado antes de firmar; forzar attachment con nombre seguro. No transmitir bytes de backups a través de Next.js.
- Credenciales de lectura limitadas al bucket de backups: provisión manual en Dokploy. La lista funciona sin ellas, pero la descarga informa configuración pendiente.
- Bridge dedicado de Windows con rutas fijas, URL central resuelta desde la activación y token central cifrado. Validar primero el token local mediante PocketBase local; enviar identidad local al servidor central y exigir coincidencia con el usuario autenticado centralmente. Evitar heredar una sesión admin anterior al cambiar de usuario. No aceptar URLs arbitrarias ni ampliar el proxy de sincronización.
- El cliente solicita la URL al pulsar Descargar e inicia una descarga nativa por enlace con `Content-Disposition: attachment`. No descarga a memoria ni expone el token central al renderer. La URL no se guarda ni se registra.
- La página limpia resultados ante cierre de sesión o cambio de rol e ignora respuestas de solicitudes anteriores. Las APIs no usan caché y devuelven errores genéricos.

## Risks / Trade-offs

- Una URL ya emitida permite descargar ese único objeto hasta su vencimiento de cinco minutos; el resto de las acciones exige autorización nueva.
- Los backups de staging apuntan actualmente al mismo bucket de producción: verificar integración con metadatos y pruebas sintéticas, sin descargar bases clínicas reales para testear.
- La descarga directa requiere credenciales S3 de lectura en el servidor. Falta de configuración no debe ocultarse como una lista vacía.
- Debe publicarse primero el backend web y luego una versión Windows con el nuevo bridge. No cambiar permisos administrativos de otros módulos offline.
