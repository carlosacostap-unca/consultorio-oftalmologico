## Context

El `Sidebar` es un Client Component y ya concentra perfil, rol activo y cierre de sesion. Existe el endpoint `POST /api/usuarios/password` para configuracion inicial cuando `password_configured` aun no es `true`; para cambio posterior conviene reutilizar la misma ruta con otro metodo y mantener la actualizacion en server-side.

## Goals / Non-Goals

**Goals:**

- Permitir que cada usuario autenticado cambie su propia contrasena desde el menu lateral.
- Pedir nueva contrasena y repeticion en un modal.
- Validar en cliente y servidor que ambas coincidan y tengan longitud minima.
- Mantener roles, sesion activa y navegacion actual sin cambios.

**Non-Goals:**

- Agregar recuperacion de contrasena por email.
- Pedir contrasena anterior.
- Permitir a un usuario cambiar contrasenas de otros usuarios.
- Crear una pagina nueva de perfil.

## Decisions

- Usar `PATCH /api/usuarios/password` para cambio voluntario.
  - Rationale: mantiene separado el flujo de configuracion inicial (`POST`) del cambio posterior (`PATCH`) sin crear rutas redundantes.
  - Alternative considered: relajar `POST`. Se descarta porque el `POST` tiene una regla especifica para usuarios sin contrasena configurada.

- Renderizar el modal dentro de `Sidebar`.
  - Rationale: el disparador esta en el perfil del menu lateral y el componente ya tiene estado de usuario y token.
  - Alternative considered: ruta `/perfil`. Se descarta por ser mas grande que el flujo pedido.

- No pedir contrasena anterior.
  - Rationale: el pedido explicito solo requiere ingresar por duplicado la nueva contrasena.
  - Trade-off: una sesion abierta puede cambiar la contrasena; se mitiga limitando la accion al usuario autenticado actual.

## Risks / Trade-offs

- Sesion desatendida podria cambiar contrasena -> se mitiga manteniendo la accion dentro de una sesion autenticada y limitada al propio usuario.
- Error de tipeo -> se mitiga con repeticion obligatoria y validacion client/server.
- Modal abierto mientras el usuario cierra sesion -> se mitiga limpiando estado al cerrar sesion.
