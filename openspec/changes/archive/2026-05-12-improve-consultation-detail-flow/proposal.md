## Why
El medico ya puede llegar bien desde la jornada diaria hasta la consulta, pero al abrir una consulta existente necesita reconocer rapido el estado clinico, las indicaciones emitidas y las acciones naturales de continuidad sin recorrer todo el formulario.

## What Changes
- Mejora la vista de consulta existente con un panel de continuidad clinica.
- Resume estado de la consulta, antecedentes, datos clave del paciente, recetas emitidas y acciones siguientes.
- Enriquecce la seccion de recetas asociadas con indicaciones y accesos mas claros.
- Mantiene intactas las reglas de edicion protegida y el formulario clinico actual.

## Impact
- Modifica `/consultas/[id]` en modo vista/lectura y conserva edicion.
- No requiere cambios de esquema en PocketBase.
- Amplia cobertura Playwright del flujo medico consulta-receta.
