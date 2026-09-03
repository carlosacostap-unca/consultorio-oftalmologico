## Context

`pbAdmin` conserva un token de superusuario en memoria. Ese token puede provenir de `POCKETBASE_ADMIN_TOKEN` o de una autenticación con email y contraseña. Actualmente sólo se descarta cuando una operación devuelve `401` o `403`; PocketBase también puede tratar un JWT vencido como una solicitud sin privilegios y devolver `200` con cero registros. La ruta `/api/usuarios` interpreta esa respuesta como un padrón legítimamente vacío.

La autorización del usuario solicitante y la credencial técnica de PocketBase son controles separados: `requireAdmin` valida al usuario y su rol activo, mientras `pbAdmin` obtiene privilegios server-side. El cambio debe reforzar el segundo control sin relajar el primero.

## Goals / Non-Goals

**Goals:**

- Evitar que un token administrativo vencido llegue a una consulta de PocketBase.
- Renovar el token con anticipación usando las credenciales administrativas configuradas.
- Mantener el reintento único ante rechazos explícitos de PocketBase.
- Probar la política temporal sin depender de red, secretos ni relojes reales.

**Non-Goals:**

- No cambiar roles, permisos, reglas de colección ni contratos de APIs.
- No inferir que cualquier colección vacía representa un error.
- No consultar ni modificar datos productivos durante las pruebas automatizadas.
- No introducir una dependencia JWT adicional.

## Decisions

1. Se extraerá una función pura que inspeccione el `exp` del JWT y determine si puede reutilizarse. El token sólo será reutilizable si contiene una expiración numérica válida posterior al instante actual más un margen preventivo de 60 segundos. Se elige inspección local porque evita una solicitud adicional para cada operación administrativa; PocketBase seguirá validando firma y permisos al recibir el token.
2. `adminToken` descartará el valor cacheado cuando esté vencido, próximo a vencer o no pueda interpretarse, y obtendrá uno nuevo con `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD`. Esto también cubre un `POCKETBASE_ADMIN_TOKEN` estático vencido cuando existen credenciales renovables.
3. La autenticación conservará compatibilidad con PocketBase actual y legado: intentará primero `_superusers` y luego `/api/admins`.
4. El reintento de `fetchWithAdminAuth` ante `401` o `403` se mantiene como defensa para revocaciones y rechazos que ocurran antes de la expiración declarada.
5. No se usará una respuesta vacía como señal de renovación: una colección puede estar legítimamente vacía y repetir escrituras o consultas basándose en el contenido sería ambiguo.

## Risks / Trade-offs

- [Un token puede ser revocado antes de `exp`] → el reintento existente ante `401` y `403` permanece activo.
- [PocketBase puede devolver `200` vacío para un token revocado aún no vencido] → este cambio resuelve la recurrencia observada por vencimiento; la expiración corta y el margen preventivo reducen la ventana, sin convertir resultados de negocio vacíos en errores.
- [Un token legado sin `exp` deja de ser reutilizable] → se renueva con las credenciales configuradas; si no existen, se informa explícitamente la falta de credenciales.
- [Solicitudes concurrentes pueden renovar simultáneamente] → ambas autenticaciones son seguras y el último token válido queda cacheado; no se agrega coordinación global para mantener el cambio acotado.

## Migration Plan

Desplegar la aplicación sin cambios de esquema ni datos. El primer request administrativo posterior al despliegue validará el token cacheado y, si corresponde, obtendrá uno nuevo. Verificar que `/api/usuarios` devuelve el mismo total que PocketBase. El rollback restaura el helper anterior; reiniciar el contenedor recupera temporalmente la operación.

## Open Questions

Ninguna.
