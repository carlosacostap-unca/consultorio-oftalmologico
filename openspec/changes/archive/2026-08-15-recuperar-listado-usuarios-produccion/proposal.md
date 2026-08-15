## Why

En producción, un administrador puede ingresar a `/usuarios` pero no ver el padrón existente cuando el token administrativo server-side de PocketBase expiró. La aplicación reutiliza ese token indefinidamente y no intenta renovarlo con las credenciales administrativas ya configuradas.

## What Changes

- Reintentar una única vez las operaciones administrativas que reciban `401` de PocketBase.
- Invalidar el token administrativo rechazado y obtener uno nuevo mediante las credenciales server-side configuradas antes del reintento.
- Mantener sin cambios la validación del usuario autenticado y de su rol activo `admin`.
- Incorporar una prueba automatizada que cubra la recuperación ante un token expirado.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `administration-and-settings`: el acceso administrativo a PocketBase debe recuperarse automáticamente de un token vencido cuando existen credenciales válidas, permitiendo cargar el listado de usuarios.

## Impact

- Helper server-side `lib/pocketbase-admin.ts` y sus consumidores administrativos.
- Endpoint `GET /api/usuarios` y pantalla `/usuarios`, sin cambios en su contrato público.
- No requiere migración de datos, cambios de esquema PocketBase ni nuevas dependencias.
