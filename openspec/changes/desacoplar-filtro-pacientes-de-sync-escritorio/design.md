## Context

El filtro compartido `ACTIVE_PATIENT_FILTER` se amplió durante el desarrollo de escritorio para excluir `sync_deleted = true`. Ese campo pertenece al esquema opcional de sincronización y no existe en el PocketBase productivo porque la capacidad de escritorio permanece deshabilitada. PocketBase rechaza con HTTP 400 cualquier consulta que mencione el campo inexistente; por eso fallan tanto `/api/pacientes/documento` como `/api/pacientes/ficha` y quedan expuestos al mismo problema listados y búsquedas web.

La evidencia productiva aisló el origen: la colección responde 200 sin filtro y con `estado_registro != "fusionado"`, pero responde 400 con `sync_deleted != true`. El hotfix debe recuperar la web sin aplicar una migración de escritorio ni ocultar la semántica que necesitará el futuro runtime offline.

## Goals / Non-Goals

**Goals:**

- Definir un filtro base de pacientes activos compatible con el esquema web productivo.
- Mantener excluidos los pacientes fusionados.
- Conservar un criterio separado y explícito para contextos que sí instalen el esquema de escritorio.
- Proteger el contrato mediante pruebas puras y verificaciones HTTP de sólo lectura.

**Non-Goals:**

- Instalar `sync_deleted` o cualquier otro campo de escritorio en producción.
- Habilitar `DESKTOP_SYNC_ENABLED` o completar el runtime offline.
- Resolver en este hotfix todos los consumidores futuros del filtro de bajas lógicas locales.
- Cambiar registros, reglas o permisos de PocketBase.

## Decisions

### Mantener el filtro web en el esquema base

`ACTIVE_PATIENT_FILTER` contendrá únicamente `estado_registro != "fusionado"`. Todos sus consumidores actuales recuperarán compatibilidad con producción sin cambios individuales ni detección administrativa de esquema. Se descarta agregar el campo a PocketBase porque convertiría una capacidad opcional y deshabilitada en requisito de los flujos web.

### Separar el filtro del esquema de escritorio

Se exportará un filtro específico que componga el criterio base con `sync_deleted != true`. No reemplazará automáticamente al filtro web: los consumidores de escritorio deberán adoptarlo explícitamente durante las tareas pendientes de esa capacidad, cuando su esquema esté instalado y sus pruebas de bajas lógicas estén completas.

Se descarta detectar campos en tiempo de ejecución porque los clientes web no tienen permisos de esquema y esa consulta administrativa fue precisamente la causa de fallos anteriores.

### Verificar el contrato, no datos clínicos

Las pruebas comprobarán el texto y la composición de ambos filtros. Después del despliegue se consultarán con valores sintéticos las rutas de DNI y ficha, sin crear ni modificar pacientes.

## Risks / Trade-offs

- [El runtime de escritorio incompleto deja de excluir bajas lógicas mediante el filtro general] → La capacidad permanece deshabilitada; el filtro específico queda disponible y su adopción se mantiene como requisito antes del piloto offline.
- [Otro campo opcional vuelve a incorporarse al filtro base] → Las pruebas exigirán que el filtro web no contenga `sync_deleted` y que el filtro de escritorio sí lo contenga.
- [La corrección oculta otro fallo de PocketBase] → Se verifican por separado colección, filtro base y rutas productivas; cualquier error restante conservará evidencia concreta.

## Migration Plan

1. Cambiar el contrato compartido y agregar pruebas focalizadas.
2. Ejecutar pruebas, lint, TypeScript, build y validación OpenSpec.
3. Desplegar sin migraciones ni cambios de variables.
4. Verificar `/api/pacientes/documento` y `/api/pacientes/ficha` mediante GET de sólo lectura.
5. Si aparece una regresión, revertir el commit; no existe estado de datos que deshacer.

## Open Questions

Ninguna para el hotfix web. La adopción completa del filtro específico pertenece al cambio activo de escritorio antes de su piloto.
