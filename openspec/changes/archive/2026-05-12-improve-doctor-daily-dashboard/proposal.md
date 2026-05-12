## Why
El medico necesita una pantalla de inicio diaria que lo ayude a atender pacientes sin buscar acciones entre controles administrativos. La agenda diaria ya existe, pero puede destacar mejor que paciente esta en consulta, cual sigue y que acciones clinicas conviene tomar.

## What Changes
- Agrega un panel de atencion en la agenda diaria cuando el rol activo es `medico`.
- Destaca paciente en consulta, proximo paciente y pendientes clinicos del dia.
- Expone acciones directas a continuar/iniciar consulta, abrir ficha clinica y crear receta.
- Mantiene el comportamiento operativo existente para secretaria y administracion.

## Impact
- Modifica la vista `/turnos` en modo agenda diaria para el rol medico.
- No requiere cambios de esquema en PocketBase.
- Agrega cobertura Playwright del tablero diario del medico.
