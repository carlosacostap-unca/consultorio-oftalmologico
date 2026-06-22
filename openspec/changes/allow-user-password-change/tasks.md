## 1. API

- [x] 1.1 Agregar `PATCH /api/usuarios/password` para cambio voluntario de contrasena del usuario autenticado.
- [x] 1.2 Reutilizar validaciones server-side de longitud minima, confirmacion coincidente y body invalido.
- [x] 1.3 Actualizar solo el registro del usuario autenticado y conservar `password_configured: true`.

## 2. Menu lateral

- [x] 2.1 Hacer clickeable el bloque de perfil del menu lateral y mostrar la opcion "Cambiar contrasena".
- [x] 2.2 Agregar modal con campos de nueva contrasena y repetir contrasena.
- [x] 2.3 Validar en cliente longitud minima y coincidencia.
- [x] 2.4 Guardar mediante el endpoint, cerrar el modal y mostrar confirmacion.
- [x] 2.5 Limpiar estado de menu/modal al cancelar, cerrar sesion o completar el cambio.

## 3. Pruebas y validacion

- [x] 3.1 Agregar prueba Playwright para abrir el modal desde el perfil lateral.
- [x] 3.2 Agregar prueba de validacion por repeticion incorrecta.
- [x] 3.3 Agregar prueba de guardado exitoso manteniendo sesion activa.
- [x] 3.4 Ejecutar `npm.cmd run build`.
- [x] 3.5 Ejecutar prueba Playwright enfocada del cambio de contrasena.
