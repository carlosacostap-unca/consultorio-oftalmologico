## Why

El alta de pacientes queda bloqueada en producción porque la validación previa del DNI intenta leer el esquema de PocketBase con credenciales que solo necesitan consultar registros. El formulario oculta ese fallo bajo un mensaje incorrecto que afirma que la colección `pacientes` no existe.

## What Changes

- Validar duplicados de DNI usando el campo vigente `numero_documento` sin consultar el esquema administrativo de PocketBase.
- Mantener el filtro por tipo de documento y por pacientes activos.
- Informar un error específico cuando falle la validación previa, sin atribuirlo a una colección inexistente.
- Agregar cobertura automatizada para la validación de DNI y el alta.
- No se requieren migraciones de datos ni cambios de esquema en PocketBase.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `patient-management`: el alta debe validar el DNI con los permisos operativos disponibles y diferenciar una falla de validación de una falla al crear el registro.

## Impact

- `lib/patient-document-server.ts`
- `app/api/pacientes/documento/route.ts`
- `app/pacientes/nuevo/page.tsx`
- Pruebas del flujo de pacientes
- Sin dependencias nuevas, migraciones ni modificaciones de PocketBase.
