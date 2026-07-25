## Context

Las consultas guardan `fecha` en PocketBase como campo de fecha/hora, pero para el flujo clinico se usa como fecha de atencion sin hora. Actualmente las pantallas de nueva consulta y edicion convierten el valor del input de fecha con `new Date("YYYY-MM-DD").toISOString()`, lo que produce medianoche UTC. Al visualizar ese instante en Argentina, el dia puede verse como el anterior.

La app ya tiene historiales importados que usan mediodia UTC para fechas clinicas, lo que evita el cruce de dia en America/Argentina/Buenos_Aires.

## Goals / Non-Goals

**Goals:**
- Preservar el dia clinico elegido por el usuario al crear y editar consultas.
- Leer fechas existentes de forma estable aunque esten guardadas con medianoche UTC.
- Aplicar la misma interpretacion en listados, filtros, reglas de editabilidad e impresiones de consultas.
- Mantener la auditoria y autorizacion actual de consultas.

**Non-Goals:**
- No modificar turnos, disponibilidades ni recordatorios, porque esos campos representan instantes con hora real.
- No ejecutar una migracion masiva de datos existentes.
- No cambiar el tipo de campo PocketBase en esta correccion.

## Decisions

- Crear helpers compartidos para fechas clinicas en `lib/clinical-date.ts`.
  - `clinicalDateKey(value)` devuelve `YYYY-MM-DD` priorizando el prefijo textual del valor recibido antes de construir un `Date`.
  - `clinicalDateToStoredDateTime(value)` serializa `YYYY-MM-DD` como `YYYY-MM-DDT12:00:00.000Z`.
  - Alternativa considerada: guardar solo string `YYYY-MM-DD`. Se descarta porque implicaria cambiar esquema y filtros PocketBase existentes.

- Reutilizar los helpers en creacion, edicion, renderizado y calculo de ventana editable.
  - La UI debe mostrar el dia clinico con independencia de la zona horaria local.
  - La API debe validar la editabilidad por dia clinico, no por instante UTC.

- Mantener filtros por fecha como rango de dia completo compatible con PocketBase.
  - Al guardar nuevos registros al mediodia UTC, el filtro existente por `YYYY-MM-DD 00:00:00` a `YYYY-MM-DD 23:59:59` conserva el comportamiento esperado.

## Risks / Trade-offs

- [Risk] Registros antiguos guardados a medianoche UTC pueden seguir teniendo una hora distinta internamente -> Mitigation: los helpers de lectura usan el dia textual almacenado y evitan recalcular el dia por zona local.
- [Risk] Otras entidades con fecha/hora real podrian confundirse con fechas clinicas -> Mitigation: limitar el helper a consultas y no reemplazar manejo de turnos.
- [Risk] Alguna superficie no detectada podria seguir usando `new Date(fecha)` -> Mitigation: buscar usos de `consulta.fecha` y cubrir pantallas principales, API y paciente.
