## Why

Un medico debe poder identificar al profesional responsable de una consulta aunque haya sido atendida por otro medico. Actualmente las reglas de visibilidad de `users` impiden expandir otros usuarios desde PocketBase y algunas vistas imprimibles no usan la fuente segura alternativa de nombres, por lo que muestran un medico sin identificar.

## What Changes

- Resolver el nombre del medico responsable por `medico_id` mediante la lista autenticada provista por `/api/medicos`, conservando `expand.medico_id` como primera opcion cuando este disponible.
- Aplicar la misma resolucion en el listado, detalle y vistas imprimibles de consultas, receta de anteojos e historia clinica del paciente.
- Mostrar un fallback explicito solo cuando la consulta no tenga medico asignado o el identificador ya no corresponda a un medico disponible.
- Agregar cobertura automatizada para el caso en que un medico consulta o imprime una atencion cuyo responsable es otro medico.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `clinical-consultations`: Las consultas y sus documentos imprimibles deben mostrar el nombre del medico responsable a todo usuario autenticado con acceso a la consulta, incluso cuando sea otro medico.

## Impact

- Afecta las pantallas de consultas y las vistas imprimibles bajo `app/consultas/` y `app/pacientes/[id]/imprimir`.
- Reutiliza `/api/medicos`; no flexibiliza las reglas de lectura de `users` ni expone campos adicionales.
- No requiere cambios de esquema, migracion de datos ni modificaciones a importadores.
