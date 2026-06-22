## Design

La UI no debe depender exclusivamente de `expand=medico_id`, porque PocketBase aplica las reglas de visibilidad de `users` al expandir relaciones desde el cliente. En produccion, `users.viewRule = id = @request.auth.id`, por lo que un medico no puede expandir el usuario de otro medico.

Las pantallas cliente cargaran `/api/medicos` con el token del usuario autenticado y armaran un mapa `id -> medico`. Para cada consulta:

- Si `expand.medico_id` existe, se usa como primera opcion.
- Si no existe, se busca `consulta.medico_id` en el mapa de medicos.
- Si tampoco existe, se muestra el fallback actual.

La nueva consulta debe asignar `medico_id` desde el usuario autenticado con rol medico. Para que el encabezado no quede temporalmente sin nombre, seguira usando el propio usuario como fallback inmediato y la lista interna como respaldo cuando corresponda.

El endpoint `POST /api/consultas` rechazara creaciones si el rol activo no es `medico` o si el `medico_id` solicitado no coincide con el usuario autenticado. Esto conserva la regla operativa de que una consulta clinica nueva la carga el medico responsable logueado.
