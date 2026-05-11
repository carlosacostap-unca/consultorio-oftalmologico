## Why

Despues de guardar una consulta, el medico necesita una vista de lectura rapida para confirmar el cierre clinico, comparar datos clave y continuar con acciones habituales. La pantalla actual muestra los datos como formulario, pero no prioriza lectura, contexto del paciente ni acciones clinicas frecuentes.

## What Changes

- Agregar una cabecera clinica en el detalle de consulta con paciente, fecha, edad, ficha, obra social y modo de la pantalla.
- Mostrar acciones rapidas visibles para crear receta, imprimir anteojos, abrir el paciente y crear nueva consulta.
- Agregar un resumen clinico escaneable con motivo, diagnostico, tratamiento, PIO, AV, refraccion y antecedentes activos.
- Mantener el formulario existente para edicion cuando la consulta sea editable.
- Mantener la navegacion por primera, anterior y posterior consulta.
- Sin cambios de esquema PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: Mejora la lectura del detalle de consulta y las acciones clinicas posteriores.

## Impact

- UI de `app/consultas/[id]/page.tsx`.
- Pruebas Playwright del flujo medico desde jornada diaria.
- Especificacion OpenSpec de consultas clinicas.
