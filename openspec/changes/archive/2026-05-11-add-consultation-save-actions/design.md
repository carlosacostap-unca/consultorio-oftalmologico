## Context

La nueva consulta ya se puede iniciar desde la jornada medica, vincular a un turno y marcarlo como `Atendido`. El problema actual es la salida del flujo: `handleSubmit` redirige inmediatamente, lo que impide ofrecer acciones clinicas frecuentes.

## Goals / Non-Goals

**Goals:**

- Mostrar un estado de exito posterior al guardado con acciones claras.
- Guardar el ID de consulta creada para abrirla, crear receta o imprimir anteojos.
- Construir una URL de retorno a `/turnos` con `tab=daily` y `date` cuando hay turno asociado.
- Mantener intacta la persistencia de consulta y actualizacion del turno.

**Non-Goals:**

- Cambiar el formulario de edicion de consulta.
- Cambiar permisos o esquema PocketBase.
- Agregar generacion automatica de recetas.

## Decisions

- Reemplazar la redireccion inmediata por un estado local `savedConsultation`.
- Usar enlaces explicitos para acciones posteriores y `router.push` solo cuando el usuario elige una accion.
- Extender `/turnos` para leer `tab=daily`, `tab=waiting-room`, `tab=weekly`, `tab=list` y `date`.
- Mantener los tests sobre PocketBase de testing como verificacion principal del flujo.

## Risks / Trade-offs

- El usuario puede quedarse en la pantalla de nueva consulta despues de guardar -> Mitigacion: la confirmacion muestra acciones primarias claras.
- Query params nuevos en `/turnos` podrian afectar vistas existentes -> Mitigacion: aceptar solo tabs conocidos y preservar comportamiento anterior por defecto.
