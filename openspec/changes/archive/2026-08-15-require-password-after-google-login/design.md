## Context

El login actual permite Google OAuth y tambien email/contrasena desde la pantalla inicial. La administracion de usuarios crea registros verificados con contrasena aleatoria porque el ingreso esperado era OAuth, por lo que la existencia tecnica de un hash de contrasena en PocketBase no indica que el usuario conozca una contrasena propia.

El nuevo flujo debe bloquear el acceso al panel principal solo cuando el usuario autenticado todavia no configuro una contrasena elegida por el mismo. El cambio toca autenticacion, datos de `users` y una actualizacion sensible de credenciales.

## Goals / Non-Goals

**Goals:**

- Distinguir entre contrasena aleatoria administrativa y contrasena configurada por el usuario.
- Pedir contrasena y repeticion despues de Google OAuth antes de mostrar el panel principal.
- Guardar la nueva contrasena mediante un endpoint autenticado y limitado al usuario actual.
- Mantener funcionando el login con email y contrasena.
- Cubrir validaciones basicas de UX y de servidor.

**Non-Goals:**

- Cambiar el proveedor OAuth de Google.
- Agregar recuperacion de contrasena o cambio de contrasena desde perfil.
- Forzar el flujo a usuarios que ya tengan marcada una contrasena configurada.
- Modificar permisos operativos o roles.

## Decisions

- Agregar un campo booleano `password_configured` en la coleccion `users`.
  - Rationale: PocketBase no expone al cliente si la contrasena real es conocida por el usuario, y los usuarios creados por admin ya tienen una contrasena aleatoria. Un indicador explicito modela la intencion del negocio.
  - Alternative considered: inferirlo desde el hash de contrasena. Se descarta porque no diferencia contrasena aleatoria de contrasena elegida.

- Crear un endpoint autenticado `POST /api/usuarios/password` para el usuario actual.
  - Rationale: la actualizacion de credenciales debe validarse server-side y no depender de permisos client-side sobre la coleccion `users`.
  - Alternative considered: actualizar `users` directamente desde el cliente con el SDK. Se descarta porque expone mas superficie de permisos y mezcla validacion sensible con UI.

- Usar `pbAdmin` para actualizar solo el registro autenticado.
  - Rationale: permite guardar `password`, `passwordConfirm` y `password_configured` sin requerir que el usuario conozca la contrasena aleatoria previa.
  - Alternative considered: pedir contrasena anterior. Se descarta porque justamente el caso objetivo es que la persona no la conoce.

- Bloquear el dashboard desde `app/page.tsx` cuando el usuario autenticado tenga `password_configured !== true`.
  - Rationale: la pantalla inicial ya centraliza la resolucion de usuario, rol activo y panel principal.
  - Alternative considered: crear una ruta separada. Se descarta para mantener el flujo de acceso simple y local al punto de entrada.

- Marcar `password_configured` como `true` despues de un login exitoso con email/contrasena.
  - Rationale: si el usuario pudo autenticarse con email y contrasena, esa contrasena ya es util para el usuario.

## Risks / Trade-offs

- Usuarios existentes quedaran con `password_configured` vacio o falso -> se les pedira configurar contrasena la proxima vez que entren con Google.
- El endpoint usa privilegio administrativo -> se mitiga validando el token del usuario actual y actualizando exclusivamente su propio registro.
- Passwords debiles o errores de tipeo -> se mitiga con longitud minima, confirmacion en pantalla y validacion server-side.
- Si el guardado de contrasena falla despues del login OAuth, el usuario queda autenticado pero bloqueado en la pantalla intermedia -> se mitiga mostrando error y permitiendo reintentar o cerrar sesion.

## Migration Plan

1. Agregar el campo booleano `password_configured` a `users` mediante script de schema controlado.
2. Ajustar la creacion administrativa de usuarios para dejar `password_configured` en `false`.
3. Implementar el endpoint autenticado de configuracion de contrasena.
4. Actualizar la pantalla inicial para mostrar el paso intermedio y refrescar el usuario despues de guardar.
5. Agregar pruebas del flujo y validar build.

Rollback: ocultar el paso intermedio en frontend y conservar el campo extra sin uso. El campo es aditivo y no deberia afectar login existente.
