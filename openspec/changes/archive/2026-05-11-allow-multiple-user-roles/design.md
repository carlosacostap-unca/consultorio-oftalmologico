## Context

Actualmente la coleccion `users` guarda un unico `role` con valores `admin`, `medico` o `secretaria`. Ese campo se usa en la barra lateral, en `/permisos`, en `requireAdmin`, en las APIs de usuarios y en el script `scripts/migrar_roles_permisos.mjs`.

La matriz `role_permissions` ya esta modelada por rol operativo y no necesita convertirse en permisos por usuario. El cambio debe permitir que un usuario acumule funciones, por ejemplo `medico` y `secretaria`, y que sus permisos efectivos sean la union de los permisos de cada rol asignado.

## Goals / Non-Goals

**Goals:**
- Permitir uno o mas roles por usuario en PocketBase y en la administracion de permisos.
- Mantener una transicion compatible desde usuarios existentes que solo tienen `role`.
- Centralizar helpers de normalizacion para que cliente, APIs y navegacion interpreten roles de la misma manera.
- Conservar la matriz de permisos por rol para `medico` y `secretaria`.

**Non-Goals:**
- Crear roles personalizados definidos por el usuario.
- Cambiar la granularidad de permisos por rol a permisos directos por usuario.
- Cambiar permisos de impresion/exportacion; este cambio solo afecta acceso administrativo y permisos operativos existentes.

## Decisions

1. Usar `roles` como campo canonico multi-select en `users`.

   Rationale: PocketBase ya soporta campos `select` con `maxSelect` mayor a 1, lo que mantiene los valores validados por esquema sin introducir una coleccion relacional nueva. Alternativa considerada: coleccion `user_roles`; se descarta porque agregaria joins/expansions y complejidad innecesaria para tres roles fijos.

2. Mantener compatibilidad de lectura con `role` durante la migracion.

   Rationale: `pb.authStore.record` puede conservar sesiones emitidas antes de la migracion y algunos registros existentes pueden no tener `roles` hasta ejecutar el script. Los helpers deberan normalizar `roles` desde `user.roles` cuando exista y desde `user.role` como fallback. Alternativa considerada: migracion breaking que elimine `role`; se descarta para evitar bloquear accesos existentes.

3. Validar roles multiples con una unica utilidad compartida.

   Rationale: `POST /api/usuarios`, `PATCH /api/usuarios/role`, `/api/permisos`, `/permisos` y `Sidebar` necesitan reglas iguales: remover duplicados, filtrar valores desconocidos y exigir al menos un rol valido. Alternativa considerada: validacion local en cada endpoint/componente; se descarta por riesgo de inconsistencias de seguridad.

4. Considerar admin por pertenencia a roles.

   Rationale: un usuario que incluye `admin` debe acceder a `/permisos` y APIs administrativas aunque tambien tenga roles operativos. `admin` sigue fuera de `MANAGED_ROLES` y no participa de `role_permissions`.

5. Calcular permisos efectivos como union de roles administrables.

   Rationale: si un usuario tiene `medico` y `secretaria`, debe poder realizar las acciones permitidas por cualquiera de esos roles. Alternativa considerada: interseccion de permisos; se descarta porque haria mas restrictivo agregar roles y no representa acumulacion de funciones.

## Risks / Trade-offs

- [Registros sin roles despues de migrar] -> Los helpers usaran fallback a `role` y el script normalizara usuarios existentes de forma idempotente.
- [Autorizacion admin inconsistente entre cliente y servidor] -> `requireAdmin` debe usar el mismo criterio de normalizacion que la UI, y las APIs seguiran siendo la fuente de verdad para acciones sensibles.
- [APIs usadas por UI antigua] -> Durante la transicion, los endpoints pueden aceptar `role` o `roles`, pero deberan responder `roles` y opcionalmente `role` para compatibilidad visual hasta completar la UI.
- [Usuarios sin rol valido] -> La validacion de creacion/actualizacion rechazara listas vacias o valores desconocidos; la lectura administrativa podra mostrar fallback `secretaria` solo si no existe ningun rol persistido ni legacy.

## Migration Plan

1. Actualizar `scripts/migrar_roles_permisos.mjs` para crear `users.roles` como select multi-value con valores `admin`, `medico`, `secretaria`.
2. Para cada usuario existente, poblar `roles` con el valor legacy `role` si existe; si no hay rol, conservar el criterio actual de inicializacion para usuarios existentes segun corresponda.
3. Mantener `users.role` durante esta etapa para rollback y compatibilidad con sesiones antiguas.
4. Actualizar codigo para escribir `roles` como fuente canonica y, durante la transicion, sincronizar `role` con el primer rol o con `admin` cuando `admin` este presente si el campo legacy existe.
5. Rollback: conservar `role` permite volver al comportamiento de rol unico ignorando `roles`; los datos multi-rol se perderian en UI antigua, pero no impiden el acceso basico.
