## Context

La aplicacion ya posee un modal de impresion y una ruta `/turnos/imprimir`. Esa ruta recibe fecha y campos, consulta turnos de la fecha y dispara `window.print()`. Con el trabajo de secretaria sobre multiples medicos, la impresion debe respetar el medico activo o permitir imprimir todas las agendas agrupadas.

## Goals / Non-Goals

**Goals:**

- Permitir seleccionar medico en el modal de impresion.
- Soportar `medico_id=all` y `medico_id=<id>` en `/turnos/imprimir`.
- Agrupar por medico cuando se imprimen todos los medicos.
- Mostrar encabezado con fecha, alcance y totales.
- Usar `expand: paciente_id,medico_id` para evitar consultas extras por fila.
- Cubrir el comportamiento con Playwright.

**Non-Goals:**

- No generar PDF server-side.
- No agregar exportacion CSV o Excel todavia.
- No modificar reglas ni esquema PocketBase.
- No cambiar el flujo de impresion del navegador.

## Decisions

- **Query params explicitos.** La impresion seguira abriendo `/turnos/imprimir`, agregando `medico_id` junto a `date` y `fields`.
- **Agrupacion en cliente.** La pagina imprimible ya es cliente y carga los datos desde PocketBase; agrupar ahi mantiene el alcance chico.
- **Medico por defecto desde contexto actual.** El modal toma `selectedMedicoId`, para que imprimir respete lo que la secretaria esta viendo.
- **Compatibilidad con medico.** Si el rol activo es medico, el selector no permite todos y queda fijado a su usuario.

## Risks / Trade-offs

- **La impresion depende de autenticacion del navegador** -> Se mantiene igual que la implementacion actual.
- **Muchos turnos en una fecha** -> La salida usa tablas compactas y agrupacion, sin paginacion manual.
- **Datos heredados con DNI en campos distintos** -> La pagina imprimible contempla `dni` y `numero_documento`.
