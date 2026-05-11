## 1. Spec And API

- [x] 1.1 Documentar la separacion de Usuarios y Permisos en OpenSpec.
- [x] 1.2 Agregar `GET /api/usuarios` protegido por rol activo `admin`.

## 2. Users UI

- [x] 2.1 Crear la pagina `/usuarios` con listado de usuarios y roles multiples.
- [x] 2.2 Permitir crear nuevos usuarios con email, nombre opcional y uno o mas roles.
- [x] 2.3 Permitir cambiar roles de usuarios existentes sin que un admin se quite su propio rol admin.

## 3. Navigation And Permissions UI

- [x] 3.1 Actualizar el menu lateral admin para que Usuarios navegue a `/usuarios`.
- [x] 3.2 Quitar la gestion de usuarios de `/permisos`.

## 4. Verification

- [x] 4.1 Ejecutar `npm.cmd run openspec:validate`.
- [x] 4.2 Ejecutar `npm.cmd run build`.
- [x] 4.3 Ejecutar `npm.cmd run lint` y revisar que no haya problemas nuevos de este cambio.
