## Context

El pull actual solicita pacientes, consultas y recetas en una misma iteración y aplica una página de cada entidad. Aunque las páginas se recorren en orden, una receta de la primera página puede depender de una consulta ubicada en una página posterior; PocketBase rechaza entonces la relación y se interrumpe el ciclo. La pantalla de sincronización carga operaciones y conflictos con `Promise.all`; una consulta inválida rechaza todo el refresco y deja `loading` activo. Finalmente, el `catch` general del motor convierte cualquier excepción en conectividad `offline`.

## Goals / Non-Goals

**Goals:**

- Completar el pull de cada entidad antes de comenzar la entidad dependiente.
- Persistir el cursor únicamente después de aplicar toda la página local.
- Mantener visible y operativa la pantalla ante fallas de lectura local.
- Distinguir una falla funcional de una pérdida real de conectividad.
- Conservar intactas la base local, la cola, los cursores ya confirmados y la base central.

**Non-Goals:**

- Cambiar el esquema PocketBase local o central.
- Borrar o reconstruir la copia local existente.
- Alterar el protocolo de push, resolución de conflictos o actualización automática.

## Decisions

### 1. Pull secuencial por entidad

El cliente solicitará una sola entidad por vez en el orden `pacientes`, `consultas`, `recetas` y agotará todas sus páginas antes de avanzar. Se conserva el endpoint y el formato actuales; sólo cambia la planificación del cliente. Se descarta intentar reordenar registros dentro de una página combinada porque no puede garantizar que una dependencia esté incluida en esa misma página.

### 2. Cursor confirmado después de persistir la página

Cada página aplicará todos sus registros y recién entonces guardará su cursor. Si una relación o escritura falla, la entidad se reintentará desde el cursor durable anterior. Los upserts por ID hacen seguro repetir una página parcial.

### 3. Estado visual resiliente

La consulta de conflictos dejará de ordenar por un campo inexistente. El refresco usará `try/catch/finally`: siempre abandonará el estado de carga y mostrará un error sanitizado si una lectura local falla. Se descarta silenciar la excepción porque ocultaría una copia local incompleta.

### 4. Conectividad separada del resultado de sincronización

El motor marcará `offline` cuando el navegador indique falta de red o el error corresponda a transporte. Los rechazos de validación, relaciones o datos conservarán conectividad `online` y se reflejarán en `lastError`. Esto evita presentar un problema de integridad como corte de Internet.

## Risks / Trade-offs

- [El pull inicial realiza más solicitudes] → Cada entidad se pagina por separado, manteniendo lotes de 100 y el límite seguro de páginas.
- [Una página se aplica parcialmente antes de fallar] → El cursor no avanza y los upserts idempotentes repiten la página.
- [Clasificación incompleta de errores de red] → Centralizar una función conservadora y cubrir mensajes/errores de transporte conocidos con pruebas.

## Migration Plan

1. Desplegar la corrección en staging sin ejecutar migraciones.
2. Reiniciar la aplicación de escritorio y repetir la sincronización sobre la base local conservada.
3. Verificar que la consulta faltante se descargue antes que su receta y que la pantalla muestre el resultado.
4. Si aparece una regresión, volver al binario anterior; no hay cambios de esquema ni cursores adelantados por páginas fallidas.

## Open Questions

Ninguna para el piloto actual.
