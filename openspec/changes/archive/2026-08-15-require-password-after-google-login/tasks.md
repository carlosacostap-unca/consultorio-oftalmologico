## 1. Schema y datos

- [x] 1.1 Crear script de schema para agregar `password_configured` booleano a la coleccion `users` sin romper registros existentes.
- [x] 1.2 Ajustar scripts de bootstrap/test schema para incluir `password_configured`.
- [x] 1.3 Actualizar la creacion administrativa de usuarios para guardar `password_configured: false` junto con la contrasena aleatoria.

## 2. API de contrasena

- [x] 2.1 Crear endpoint autenticado `POST /api/usuarios/password` que valide el token del usuario actual.
- [x] 2.2 Validar server-side contrasena minima, confirmacion coincidente y body invalido.
- [x] 2.3 Actualizar solo el registro del usuario autenticado con `password`, `passwordConfirm` y `password_configured: true`.
- [x] 2.4 Devolver respuestas claras para exito, no autenticado, validacion fallida y error de guardado.

## 3. Pantalla inicial y flujo de acceso

- [x] 3.1 Extender tipos de usuario para incluir `password_configured`.
- [x] 3.2 Mostrar una pantalla intermedia cuando el usuario autenticado tenga `password_configured !== true`.
- [x] 3.3 Agregar inputs de contrasena y repeticion con validacion client-side de coincidencia.
- [x] 3.4 Guardar la contrasena mediante el endpoint, refrescar el usuario y continuar al panel principal.
- [x] 3.5 Permitir cerrar sesion desde la pantalla intermedia.
- [x] 3.6 Marcar `password_configured` como verdadero despues de un login exitoso con email y contrasena si aun no lo estaba.

## 4. Pruebas y validacion

- [x] 4.1 Agregar o ajustar seed de usuarios de prueba para cubrir usuario sin contrasena configurada y usuario con contrasena configurada.
- [x] 4.2 Agregar prueba Playwright del bloqueo post-Google simulado o del estado autenticado sin `password_configured`.
- [x] 4.3 Agregar prueba de validacion por repeticion de contrasena incorrecta.
- [x] 4.4 Ejecutar `npm.cmd run build`.
- [x] 4.5 Ejecutar pruebas relevantes de schema y Playwright en entorno test si PocketBase de test esta disponible.
