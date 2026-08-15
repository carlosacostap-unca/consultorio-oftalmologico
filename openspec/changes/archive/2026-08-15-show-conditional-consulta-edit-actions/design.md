## Design

La UI seguira usando la misma regla temporal que ya protege el formulario y el endpoint: una consulta es editable si su `fecha` no es anterior al minimo calculado con `consultaEditLimitDays`.

En `/consultas/[id]`, cuando la consulta se abre en `mode=view`, se mostrara una accion directa a `/consultas/[id]` si el rol activo resuelto es `medico` y la consulta es editable por fecha. Fuera de esos casos la pantalla seguira en solo lectura sin ofrecer el acceso.

En `/pacientes/[id]`, la pantalla cargara la configuracion de edicion y resolvera el rol activo del usuario autenticado. Los eventos de consulta de la linea de tiempo y las filas del historial incluiran `editHref` solo cuando `activeRole === "medico"` y la fecha de la consulta este dentro del plazo. Las recetas y consultas no editables no mostraran boton de edicion.

No se cambia la autorizacion del servidor: el `PATCH /api/consultas/[id]` mantiene la validacion central del plazo configurado. La UI solo evita mostrar accesos que el medico no podria usar.
