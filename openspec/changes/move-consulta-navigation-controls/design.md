## Context

Las rutas `/consultas/nueva` y `/consultas/[id]` renderizan una cabecera de formulario con titulo, `Volver` y `Ver contexto`. Ambas rutas ya tienen controles de cierre, por lo que las acciones pueden integrarse alli sin cambiar el estado clinico ni la navegacion existente.

## Goals / Non-Goals

**Goals:**
- Liberar la parte superior de ambas pantallas de consulta.
- Conservar las acciones `Volver` y `Ver contexto` al final de la pantalla.
- Preservar las funciones actuales de retorno y de acceso al contexto clinico.

**Non-Goals:**
- No redisenar los campos ni eliminar informacion clinica del formulario.
- No alterar APIs, permisos, historial, impresion ni guardado de consultas.

## Decisions

- Eliminar el bloque de cabecera y el rotulo superior de paciente de cada formulario. Esto responde directamente a la solicitud de despejar la parte superior y evita dejar espacio residual, sin quitar campos ni datos.
- Incorporar `Volver` y `Ver contexto` en el grupo inferior de acciones de cada ruta. Se reutilizan los mismos callbacks ya existentes, para que el destino de retorno y el comportamiento del contexto no cambien.
- Mantener las acciones de guardado y cancelacion actuales. `Volver` no reemplaza una accion clinica de cierre cuando esta ya exista.

## Risks / Trade-offs

- [Las acciones quedan fuera del primer viewport en formularios largos] → La solicitud prioriza la zona inferior; se conservan labels claros y controles accesibles al final.
- [Cambiar callbacks podria modificar el destino de retorno] → Cada boton reutilizara el callback que usaba en la cabecera correspondiente.
