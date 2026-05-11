## Overview

Se introduce una pantalla administrativa dedicada en `/usuarios`. La pagina reutiliza la logica actual de roles multiples, la validacion de rol activo y los endpoints administrativos existentes para crear usuarios y actualizar roles.

## Decisions

- `GET /api/usuarios` sera el origen de datos de la pantalla de usuarios. Devuelve una lista ordenada por email con `id`, `email`, `name`, `role` legacy y `roles` normalizados.
- `POST /api/usuarios` conserva el comportamiento actual de crear usuarios verificados con contrasena aleatoria para OAuth.
- `PATCH /api/usuarios/role` conserva la actualizacion de roles y la proteccion contra quitarse el rol admin propio.
- `/permisos` deja de renderizar el listado/formulario de usuarios y queda para configuracion de consultas y permisos por rol.
- El menu lateral admin navega a `/usuarios` para Usuarios y a `/permisos` para Permisos.

## Risks

- Si una sesion tiene rol activo distinto de `admin`, la nueva pagina debe redirigir igual que `/permisos`.
- Si el usuario actual pierde el rol admin en otra pestana, la UI debe bloquear o redirigir antes de permitir operaciones administrativas.

## Out of Scope

- Edicion de nombre/email de usuarios existentes.
- Eliminacion de usuarios.
- Cambios de esquema de PocketBase.
