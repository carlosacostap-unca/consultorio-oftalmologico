## Context

PocketBase asigna su propio campo `updated` cada vez que la copia central se aplica sobre la base local. La cola actual toma ese timestamp local como versión base y el servidor lo compara literalmente con `updated` central. Por eso una baja inmediatamente posterior a una sincronización puede parecer obsoleta aunque ningún dato funcional haya cambiado.

Además, el conflicto central elimina todos los campos `sync_*` de `local_snapshot`. La resolución genérica `apply_local` aplica ese snapshot como una edición y no conserva la intención `delete`; el paciente vuelve a quedar activo aunque la operación se cierre. El piloto 0.1.8 reprodujo ambos comportamientos con un paciente sintético.

El esquema ya contiene `sync_base_updated`, por lo que la solución no requiere una migración de colecciones. Debe ser compatible con bases locales creadas por 0.1.8, cuyos anclajes existentes pueden estar ausentes o desactualizados.

## Goals / Non-Goals

**Goals:**

- Mantener una revisión central canónica en cada copia local sincronizada.
- Evitar conflictos cuando sólo difieren timestamps o metadatos técnicos.
- Conservar los conflictos cuando sí cambió información funcional en el servidor.
- Hacer que la resolución de una baja respete su intención original y sus permisos.
- Presentar acciones específicas y comprensibles para conflictos de eliminación.
- Permitir completar y limpiar el registro sintético del piloto mediante una versión posterior.

**Non-Goals:**

- Cambiar la política de baja lógica o retención clínica.
- Resolver automáticamente conflictos que contienen diferencias funcionales.
- Incorporar nuevas entidades al modo offline.
- Promover el canal piloto a estable dentro de esta corrección.
- Modificar importadores legacy, impresión o exportación clínica.

## Decisions

### 1. Persistir la revisión central en `sync_base_updated`

Cada alta, actualización o pull confirmado guardará `centralRecord.updated` en el campo local `sync_base_updated`. Al construir una operación posterior, la cola priorizará ese valor sobre el `updated` generado por PocketBase local.

Se reutiliza el campo existente porque expresa el concepto necesario y evita una migración. Se descartó comparar directamente timestamps locales y centrales porque pertenecen a relojes y escrituras diferentes.

### 2. Usar comparación funcional como compatibilidad para anclajes heredados

Si la revisión enviada no coincide con la central durante una baja, el servidor comparará el snapshot base con el registro central ignorando campos de sistema y sincronización. Si no hay diferencias funcionales, la baja continuará; si existen, se creará un conflicto con los campos reales que cambiaron.

Esta ruta permite reparar bases 0.1.8 sin un barrido completo ni una migración. Se descartó aceptar toda baja con revisión distinta porque podría ocultar una modificación clínica concurrente.

### 3. Resolver bajas mediante una rama explícita

El endpoint de conflictos reconocerá `delete_conflict`. Al elegir aplicar la versión local, validará permiso de `delete` y marcará el registro central con `sync_deleted`, autor, equipo, operación y fecha. Al conservar central, devolverá el registro activo y cancelará la intención local.

Se descartó reutilizar la resolución genérica de actualización porque su sanitización elimina precisamente los metadatos que representan la baja.

### 4. Presentar intención, no una tabla vacía

La pantalla mostrará un conflicto de baja como tal y ofrecerá acciones equivalentes a “Cancelar baja y conservar central” y “Confirmar baja local”. La comparación tabular continuará para conflictos de edición y duplicados.

Esto evita el mensaje engañoso “0 campos diferentes” y reduce el riesgo de elegir una acción contraria a la intención del usuario.

### 5. Cubrir el recorrido completo de regresión

Las pruebas abarcarán el anclaje local, la comparación funcional, ambas resoluciones del conflicto y el recorrido crear offline → sincronizar → eliminar → sincronizar. La validación manual final se realizará sobre el registro sintético ya identificado, antes de considerar una promoción a `stable`.

## Risks / Trade-offs

- [Un snapshot heredado incompleto podría no demostrar equivalencia funcional] → Ante duda, conservar el comportamiento conservador y crear conflicto con diferencias explícitas.
- [Aplicar una baja local es una acción destructiva] → Exigir permiso de eliminación, confirmación previa en la UI y auditoría central.
- [Una segunda modificación central después de detectar el conflicto] → Revalidar la revisión central al resolver y rechazar si volvió a cambiar.
- [El registro sintético permanece visible hasta la corrección] → Mantenerlo inequívocamente identificado y no asociarle consultas ni recetas.

## Migration Plan

1. Publicar la corrección web en staging y ejecutar las pruebas automatizadas.
2. Generar una nueva versión piloto de escritorio, sin modificar el puntero `stable`.
3. Actualizar el equipo `PC-E24D57F3` y sincronizar para establecer revisiones centrales canónicas.
4. Repetir exclusivamente la baja del paciente `PRUEBAOFFLINEPILOTO` y comprobar 0 pendientes, errores y conflictos.
5. Verificar que el paciente no figure en escritorio ni en la vista central activa.
6. Ante una regresión, conservar `stable` sin cambios y retirar únicamente el puntero piloto de la versión defectuosa.

## Open Questions

Ninguna para iniciar la implementación.
