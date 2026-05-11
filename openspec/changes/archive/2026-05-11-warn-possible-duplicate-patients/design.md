## Context

Gestion de Turnos permite crear pacientes minimos durante alta rapida y corregir datos desde la ficha rapida. La coleccion `pacientes` ya tiene campos suficientes para buscar coincidencias: `numero_documento`, `dni`, `telefono`, `numero_ficha`, `nombre`, `apellido`, `obra_social`. La mejora debe ser informativa, no destructiva ni bloqueante.

## Goals / Non-Goals

**Goals:**

- Detectar candidatos duplicados usando campos administrativos existentes.
- Mostrar advertencias dentro del alta rapida de paciente y la ficha rapida.
- Excluir al paciente actual cuando se revisa su propia ficha.
- Mantener el guardado posible, salvo validaciones existentes como DNI exacto en alta rapida.
- Probar la advertencia con Playwright.

**Non-Goals:**

- No fusionar pacientes.
- No bloquear por similitud de nombre/apellido.
- No crear indice, coleccion nueva ni servicio server-side.
- No resolver historiales clinicos duplicados.

## Decisions

- **Consulta cliente bajo demanda.** Se reutiliza PocketBase desde `app/turnos/page.tsx`, consistente con el resto de la pantalla.
- **Debounce corto.** Las advertencias se recalculan despues de que la secretaria deja de escribir para evitar consultas por cada tecla.
- **Reglas simples de coincidencia.** Coincidencias exactas por documento, telefono y ficha; nombre/apellido se busca por `~` para mostrar posibles similares.
- **Componente visual reutilizable.** Un mismo bloque presenta coincidencias en alta rapida y ficha rapida.
- **No bloquear.** La secretaria puede decidir continuar; la fusion queda para una mejora futura.

## Risks / Trade-offs

- **Falsos positivos por nombre comun** -> Se muestra como advertencia y no como error.
- **Consultas PocketBase con campos vacios** -> Se ejecutan solo con valores significativos.
- **Datos con `dni` o `numero_documento` segun origen** -> La busqueda contempla ambos campos.
