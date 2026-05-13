## Context

`/pacientes/[id]?mode=view` ya carga paciente, consultas y recetas, y muestra metricas, ultima consulta, continuidad, historia clinica y recetas recientes. La mejora reorganiza informacion ya disponible para reducir lectura y orientar la proxima accion del medico.

## Goals / Non-Goals

**Goals:**
- Mostrar un panel compacto de continuidad actual cerca del encabezado de la ficha.
- Exponer ultima consulta, ultima receta y una accion sugerida sin nuevas consultas a PocketBase.
- Reutilizar rutas actuales para nueva consulta, nueva receta, consulta existente e impresion.

**Non-Goals:**
- No reemplazar la linea de tiempo clinica.
- No agregar nuevos campos clinicos ni editar registros previos desde este panel.
- No cambiar permisos ni reglas de PocketBase.

## Decisions

- Calcular el resumen desde `ultimaConsulta`, `recetasRecientes` y `consultas.length`.
- Priorizar como accion sugerida crear nueva consulta si no hay consultas, crear receta si la ultima consulta tiene tratamiento, y abrir ultima consulta cuando no hay una continuidad terapeutica explicita.
- Mantener los botones existentes de cabecera y secciones para no romper habitos de navegacion.

## Risks / Trade-offs

- [Duplicacion visual con la seccion de ultima consulta] -> Consolidar el nuevo panel como resumen y mantener la continuidad detallada debajo.
- [Accion sugerida no siempre coincide con criterio medico] -> Mostrarla como orientacion y conservar todas las acciones manuales.
- [Pantalla mas densa] -> Usar una grilla compacta y textos cortos.
