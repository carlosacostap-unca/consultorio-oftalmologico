## Context

La agenda de turnos usa un modal rapido para gestionar un turno desde la vista diaria/semanal. Ese modal hoy concentra edicion de datos, reprogramacion, cancelacion y eliminacion en una sola columna, lo que aumenta la probabilidad de tocar una accion no deseada durante la atencion operativa.

## Goals / Non-Goals

**Goals:**
- Separar visualmente datos editables, reprogramacion y cancelacion dentro del modal.
- Mantener el flujo rapido desde la agenda, sin navegar a otra pantalla.
- Conservar las validaciones y actualizaciones actuales contra PocketBase.

**Non-Goals:**
- No se modifica el modelo de datos de turnos.
- No se agregan permisos nuevos.
- No se cambia el flujo de impresion ni exportacion.

## Decisions

- Usar pestañas internas en el modal: `Datos`, `Reprogramar` y `Cancelacion`. Esto mantiene una sola ventana de trabajo y evita una navegacion extra.
- Mostrar las acciones destructivas solo dentro del area de cancelacion. La edicion cotidiana queda separada de cancelar o eliminar.
- Reutilizar los handlers existentes (`handleSaveTurnoChanges`, `handleRescheduleTurno`, `handleCancelTurno`, `handleDelete`) para minimizar riesgo funcional.
- Mantener el estado local del modal en `app/turnos/page.tsx`, alineado con el patron actual de la pantalla.

## Risks / Trade-offs

- [Risk] Las pruebas automatizadas que buscaban controles visibles por defecto pueden necesitar seleccionar la pestaña correspondiente. → Mitigacion: actualizar Playwright para abrir `Cancelacion` antes de cancelar y conservar nombres de botones de accion.
- [Risk] Agregar mas estado al modal puede dejar una pestaña vieja al abrir otro turno. → Mitigacion: resetear la pestaña a `Datos` al abrir y cerrar el modal.
- [Risk] Si se oculta demasiado la accion de eliminar, puede costar encontrarla. → Mitigacion: dejarla visible dentro de `Cancelacion` como accion secundaria claramente destructiva.
