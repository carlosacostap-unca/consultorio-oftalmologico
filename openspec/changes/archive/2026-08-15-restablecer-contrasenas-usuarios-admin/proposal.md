## Why

Actualmente cada usuario puede cambiar su propia contraseña, pero un administrador no puede restablecer el acceso de otra cuenta cuando la persona olvidó la clave. Esto obliga a intervenir PocketBase manualmente y demora la recuperación operativa del consultorio.

## What Changes

- Agregar una acción `Restablecer contraseña` para cada usuario en `/usuarios`.
- Mostrar un modal donde el administrador ingrese y confirme la nueva contraseña.
- Exponer un endpoint protegido por rol activo `admin` que valide el usuario objetivo y la contraseña antes de actualizar PocketBase.
- No devolver ni registrar la contraseña establecida.
- Incorporar pruebas del permiso administrativo, la validación y el flujo visual.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `administration-and-settings`: la gestión de usuarios incorpora el restablecimiento administrativo de contraseñas.

## Impact

- Pantalla `app/usuarios/page.tsx` y ruta administrativa bajo `app/api/usuarios/`.
- Pruebas automatizadas del flujo de usuarios.
- No requiere migración de datos, cambios de esquema PocketBase ni nuevas dependencias.
