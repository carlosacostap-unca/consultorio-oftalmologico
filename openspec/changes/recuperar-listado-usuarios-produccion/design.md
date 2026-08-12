## Context

Las rutas administrativas validan primero el token del usuario y su rol activo mediante `requireAdmin`. Luego usan `pbAdmin` para consultar PocketBase con privilegios server-side. Actualmente `pbAdmin` inicializa un token desde `POCKETBASE_ADMIN_TOKEN` o lo obtiene con email y password, pero lo conserva durante toda la vida del proceso. PocketBase responde `401` cuando ese token expira y el helper propaga el error sin intentar renovarlo.

## Goals / Non-Goals

**Goals:**

- Recuperar automáticamente una operación administrativa cuando PocketBase rechaza el token por expiración.
- Limitar la recuperación a un solo reintento para evitar bucles.
- Conservar el control de acceso basado en el token del usuario y el rol activo `admin`.
- Cubrir el comportamiento con una prueba aislada del helper.

**Non-Goals:**

- No cambiar roles, permisos ni reglas de colección PocketBase.
- No exponer credenciales administrativas al navegador.
- No modificar el contrato de `/api/usuarios` ni migrar datos.

## Decisions

1. `pbAdmin` ejecutará la solicitud mediante una función interna reutilizable. Si la primera respuesta es `401`, descartará el token cacheado, solicitará uno nuevo con las credenciales server-side y repetirá exactamente una vez la solicitud original.
2. La renovación exigirá `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD`. Si no están configurados, el segundo intento de autenticación fallará de forma explícita; no se debilitarán las reglas de acceso de PocketBase.
3. La autenticación probará primero `_superusers`, endpoint vigente en PocketBase actual, y conservará `/api/admins` como compatibilidad con instalaciones anteriores.
4. El reintento se implementará en el helper compartido porque también protege permisos, médicos y otras rutas administrativas del mismo fallo, sin duplicar lógica por endpoint.

## Risks / Trade-offs

- [Un `401` puede tener una causa distinta de expiración] → se realiza un único intento de renovación y luego se devuelve el error real.
- [Varias solicitudes concurrentes pueden renovar a la vez] → la operación es segura y acotada; no se introduce coordinación global para mantener el cambio mínimo.
- [Solo existe un token fijo y no hay credenciales] → la aplicación seguirá fallando de forma explícita, ya que no existe un mecanismo seguro para renovar ese token.

## Migration Plan

Desplegar el cambio de aplicación sin modificar PocketBase. Producción debe conservar `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD` válidos. El rollback consiste en restaurar la versión anterior del helper; no hay datos que revertir.

## Open Questions

Ninguna.
