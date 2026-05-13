## Context

La aplicacion ya tiene un patron para historial operativo de turnos mediante `turno_eventos`. Las consultas se crean desde el cliente en `/consultas/nueva` y se editan desde `PATCH /api/consultas/[id]`.

## Goals / Non-Goals

**Goals:**
- Registrar eventos basicos de creacion y edicion de consultas.
- Mostrar esos eventos en la vista de detalle de consulta.
- Reutilizar el enfoque tolerante a fallos de `turno_eventos`.
- Permitir bootstrap de esquema en testing y produccion con script.

**Non-Goals:**
- No implementar diff exhaustivo campo por campo en esta etapa.
- No auditar impresiones, recetas, eliminaciones o fusion de pacientes todavia.
- No bloquear la creacion o edicion si falla el registro de auditoria.

## Decisions

- Crear coleccion `consulta_eventos` con relacion a `consultas`, `pacientes` y `users`, mas titulo, detalle, tipo y metadata JSON.
- Registrar eventos de creacion desde el cliente despues de crear la consulta, usando la sesion activa.
- Registrar eventos de edicion desde el route handler server-side, usando usuario autenticado y `pbAdmin`.
- Mostrar eventos en `/consultas/[id]` ordenados por creacion descendente.

## Risks / Trade-offs

- [El evento puede fallar aunque la consulta se guarde] -> La auditoria sera best-effort y dejara error en consola.
- [No hay diff detallado inicial] -> Guardar metadata suficiente para extender luego sin cambiar la UI.
- [Nueva coleccion requiere bootstrap] -> Agregar script de esquema y sumarlo al bootstrap de testing.
