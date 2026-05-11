## Context

La pantalla de duplicados ya consulta un resumen por paciente con datos administrativos y conteos por coleccion. El endpoint server-side tiene acceso admin y ya consulta `turnos`, `consultas` y `recetas`, por lo que puede devolver tambien muestras recientes sin exponer nuevas reglas PocketBase al cliente.

## Goals / Non-Goals

**Goals:**

- Mostrar actividad reciente suficiente para decidir que paciente conservar.
- Mantener el bloque de comparacion compacto y escaneable.
- Reutilizar el endpoint existente de duplicados.
- Evitar cambios de esquema o migraciones.

**Non-Goals:**

- No mostrar historiales completos en la comparacion.
- No cambiar la logica de fusion ni los campos de trazabilidad.
- No agregar filtros avanzados de actividad en esta etapa.

## Decisions

- **Actividad limitada.** El endpoint devolvera hasta 3 registros recientes por tipo: turnos por `fecha_hora`, consultas por `fecha` y recetas por `fecha`.
- **Datos minimos por item.** Cada item incluira fecha y una descripcion breve: motivo/estado para turnos, motivo/diagnostico para consultas, medicamentos/indicaciones para recetas.
- **Render compacto.** Cada tarjeta de paciente mostrara secciones "Turnos", "Consultas" y "Recetas" debajo de los conteos.
- **Sin cambios de seguridad.** La actividad solo se devuelve desde el endpoint admin ya protegido por rol activo `admin`.

## Risks / Trade-offs

- **Mucho contenido en la comparacion** -> Se limita a 3 items por tipo y se usan textos truncados.
- **Registros con fechas incompletas** -> La UI debe mostrar "Sin fecha" sin romper el layout.
- **Colecciones con campos opcionales** -> El endpoint normaliza textos faltantes a etiquetas cortas.
