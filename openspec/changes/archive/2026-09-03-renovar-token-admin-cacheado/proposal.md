## Why

En producción, el token de superusuario que la aplicación obtiene de PocketBase queda cacheado durante toda la vida del proceso. Cuando vence, PocketBase puede responder `200` con un listado vacío en vez de `401` o `403`, por lo que un administrador deja de ver los usuarios existentes hasta que se reinicia el despliegue.

## What Changes

- Validar la vigencia del token administrativo cacheado antes de reutilizarlo.
- Renovar automáticamente la sesión administrativa mediante las credenciales server-side cuando el token venció o está próximo a vencer.
- Mantener el reintento único existente ante respuestas `401` y `403`.
- Incorporar pruebas que cubran tokens vigentes, vencidos y sin metadatos de expiración confiables.
- Mantener sin cambios el contrato de `/api/usuarios`, la autorización por rol activo y los datos de PocketBase.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `administration-and-settings`: el acceso administrativo a PocketBase debe renovar preventivamente una credencial cacheada vencida o no verificable para evitar respuestas exitosas con datos vacíos.

## Impact

- Helpers server-side `lib/pocketbase-admin.ts` y `lib/pocketbase-admin-request.ts`.
- Pruebas unitarias de autenticación administrativa.
- Rutas administrativas que usan `pbAdmin`, incluida `GET /api/usuarios`.
- No requiere migración de datos, cambios de esquema PocketBase, nuevas dependencias ni modificaciones en scripts de importación.
