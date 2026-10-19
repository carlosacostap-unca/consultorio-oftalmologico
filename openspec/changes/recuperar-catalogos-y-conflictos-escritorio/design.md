## Context

La sincronización periódica no actualiza mutuales. Los conflictos resueltos fuera de la PC permanecen bloqueados localmente. Existen snapshots y ledger durable que permiten recuperar la decisión sin volver a aplicar una edición clínica.

## Goals / Non-Goals

**Goals:** Descargar dependencias antes de pacientes; recuperar decisiones confirmadas y auditadas; preservar filas, evidencia y ediciones concurrentes.

**Non-Goals:** Elegir automáticamente entre textos clínicos, borrar pendientes, restaurar una base antigua o modificar esquemas. Sin cambios en impresión/exportación.

## Decisions

- Reutilizar bootstrap autenticado para mutuales, paginado y sin eliminar registros locales. Ejecutarlo antes de reconocimientos y pull. Si falla, conservar cursores y cola.
- Añadir GET por conflicto que requiere exactamente el equipo y actor originales, incluso para administradores, y valida ledger confirmado, entidad, registro y operación. Un conflicto abierto no se resuelve. Devolver la versión central actual para no propagar snapshots obsoletos; conservar snapshots originales como evidencia.
- Cliente consulta sus conflictos abiertos y aplica sólo resoluciones durables compatibles. Vinculaciones entre pacientes siguen el flujo manual existente. Guardar registro con protección transaccional de otras operaciones, luego confirmar operación y cerrar conflicto. Si falla cualquier paso, el reintento es idempotente. No cerrar cuando otra edición local impide guardar.
- Conservar central mediante POST exige que la revisión mostrada siga vigente; ante cambio nuevo devuelve 409. Aplicar local verifica permiso con el registro central actual.
- La resolución puntual autorizada se registra con respaldo y trazabilidad del responsable técnico; no se atribuye una nueva decisión al médico. Actualizar sólo metadatos de conflicto/ledger, conservando contenido clínico ya combinado.

## Risks / Trade-offs

- Catálogo cambiado durante paginación: cada ejecución vuelve a consultar; un paciente con dependencia aún ausente falla sin adelantar cursor ni vaciar relación.
- Resolución central parcial: GET no acepta un ledger inconsistente; conservar conflicto y reparar metadatos verificando antes-imagen.
- Edición local adicional: protección impide sobrescritura y mantiene el conflicto para revisión.
- Cierre local interrumpido: confirmar operación antes de cerrar conflicto permite recuperar en próxima ejecución.

## Migration Plan

Sin migraciones. Pruebas sintéticas, respaldo central nuevo verificado, PR/CI, despliegue por main, verificación API y publicación firmada 0.1.18. Distribuir por actualizador con respaldo local previo. No restaurar backups sobre datos nuevos; si hay regresión detener distribución y preservar pendientes. Confirmar resultado del equipo físico después de actualizar.

## Open Questions

Ninguna decisión clínica pendiente para el caso autorizado; otros conflictos siguen requiriendo revisión.
