## Context

Gestion de Turnos ya carga turnos con `expand: paciente_id,medico_id` y concentra las operaciones de secretaria. La ficha completa del paciente vive en `/pacientes/[id]` y muestra datos administrativos e historial de consultas. Para recepcion no hace falta replicar toda la ficha clinica, sino exponer un resumen accionable y edicion minima.

## Goals / Non-Goals

**Goals:**

- Abrir una ficha rapida desde lista, agenda diaria, sala de espera y modal de gestion de turno.
- Cargar bajo demanda el paciente actualizado, ultimos turnos y ultimas consultas.
- Editar campos administrativos frecuentes: apellido, nombre, documento, telefono, email, obra social, afiliado, domicilio y numero de ficha.
- Actualizar la UI local de turnos luego de guardar cambios del paciente.
- Mantener acciones claras para ver ficha completa y crear consulta.

**Non-Goals:**

- No reemplazar la pantalla completa de paciente.
- No implementar deduplicacion avanzada en este cambio.
- No crear nuevas colecciones ni migraciones.
- No editar datos clinicos de consultas desde la ficha rapida.

## Decisions

- **Modal lateral dentro de `/turnos`.** Evita abandonar el contexto de agenda y permite seguir trabajando con el turno abierto o visible.
- **Carga bajo demanda.** La ficha rapida consulta datos cuando se abre, en vez de cargar historial para todos los turnos.
- **Edicion administrativa minima.** Se usa `pb.collection("pacientes").update` para campos existentes, sin tocar validaciones complejas de la ficha completa salvo campos requeridos basicos.
- **Historial resumido.** Se muestran hasta cinco turnos recientes/proximos y cinco consultas recientes para orientar a la secretaria.
- **Sin dependencias nuevas.** Se mantiene el patron actual de Client Component y PocketBase directo desde la pantalla.

## Risks / Trade-offs

- **Datos incompletos por permisos PocketBase** -> Mostrar estados de error y mantener enlace a ficha completa.
- **Numero de ficha duplicado** -> La ficha rapida no reemplaza validaciones completas; se mantiene orientada a correcciones simples.
- **Mas acciones en una pantalla densa** -> Usar un modal separado y botones pequeños en nombres de paciente para no cargar las tarjetas.
