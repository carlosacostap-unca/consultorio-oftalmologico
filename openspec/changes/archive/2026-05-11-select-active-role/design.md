## Context

El sistema ya permite que un usuario tenga multiples roles asignados en `users.roles`. Hoy la UI y `requireAdmin` miran los roles asignados, por lo que un usuario con `admin` siempre ve y usa funciones administrativas aunque quiera trabajar como medico o secretaria.

La nueva pieza es el rol activo: una eleccion de sesion que no cambia los roles asignados en PocketBase. El rol activo debe ser validado contra los roles asignados del usuario antes de afectar permisos.

## Goals / Non-Goals

**Goals:**
- Resolver automaticamente el rol activo al iniciar, priorizando `medico` cuando este asignado.
- Persistir localmente el rol activo por usuario autenticado para no preguntar en cada navegacion.
- Permitir cambiar el rol activo desde la interfaz cuando el usuario tenga mas de un rol.
- Usar el rol activo para mostrar navegacion administrativa y validar endpoints admin.

**Non-Goals:**
- Cambiar los roles asignados al usuario desde el selector de sesion.
- Agregar cambios de esquema o migraciones en PocketBase.
- Implementar permisos finos por rol en todas las pantallas operativas en esta iteracion.

## Decisions

1. Guardar el rol activo en `localStorage` con clave por usuario y resolver un valor por defecto.

   Rationale: la eleccion es una preferencia de sesion/interfaz y no debe mutar datos administrativos. Si no existe una eleccion valida, el sistema usa `medico` cuando esta asignado y luego el primer rol disponible. Alternativa considerada: campo persistido en PocketBase; se descarta porque mezclaria estado personal de sesion con configuracion de usuario.

2. Crear helpers compartidos de rol activo.

   Rationale: Home, Sidebar y llamadas API necesitan resolver la misma regla: si hay rol guardado y sigue asignado se usa; si no, se elige el unico rol disponible o se pide seleccion. Alternativa considerada: duplicar logica en componentes; se descarta por riesgo de inconsistencias.

3. Enviar el rol activo en APIs administrativas con un header.

   Rationale: el servidor no puede confiar solo en UI. Los endpoints admin validaran que el usuario tenga asignado ese rol y que el rol activo sea `admin`. Alternativa considerada: confiar en que el usuario tiene `admin` asignado; se descarta porque ignora la eleccion activa.

4. Mantener compatibilidad con usuarios de un solo rol.

   Rationale: la mayoria de usuarios no deberia ver pasos extra. Si solo hay un rol asignado, la app lo establece automaticamente como activo.

## Risks / Trade-offs

- [Rol activo local obsoleto] -> Al refrescar usuario, si el rol guardado ya no esta asignado, se limpia y se fuerza nueva seleccion o auto-seleccion.
- [Cliente omite header de rol activo] -> Endpoints admin devuelven `403` salvo que el rol activo validado sea `admin`.
- [Cambio de rol no refresca menus] -> Sidebar mantiene estado propio y escucha un evento local para actualizarse al cambiar el rol activo.
- [Sesion antigua con varios roles sin rol activo] -> El sistema resuelve automaticamente un rol activo valido; pantallas administrativas no quedan habilitadas salvo que el rol activo sea `admin`.
