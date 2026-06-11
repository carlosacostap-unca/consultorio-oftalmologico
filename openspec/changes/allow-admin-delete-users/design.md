# Diseno

## Enfoque
Extender la gestion existente de `/usuarios` y `app/api/usuarios/route.ts`, reutilizando `requireAdmin` y los headers de rol activo ya usados para listar, crear y editar roles.

## API
- Agregar `DELETE /api/usuarios` con body `{ userId }`.
- Rechazar requests sin rol activo `admin`.
- Rechazar `userId` vacio.
- Rechazar `userId === admin.id` para evitar auto-eliminacion.
- Ejecutar `DELETE /api/collections/users/records/:id` con `pbAdmin`.

## UI
- Agregar columna de acciones en la tabla de usuarios.
- Mostrar boton `Eliminar` por cada usuario que no sea el actual.
- Para el usuario actual, mostrar la accion deshabilitada con texto o tooltip de proteccion.
- Pedir confirmacion con nombre/email antes de llamar a la API.
- Quitar el usuario del listado local si el borrado fue exitoso.

## Fuera de alcance
- Borrado masivo de usuarios.
- Reasignacion automatica de datos clinicos o turnos asociados a usuarios eliminados.
- Auditoria historica de bajas.
