## Context

PocketBase protege la coleccion `users` con reglas que permiten a un usuario comun ver solamente su propio registro. Por eso `expand=medico_id` puede devolver el medico responsable cuando coincide con el usuario logueado, pero queda vacio cuando otro medico consulta la atencion. Las pantallas principales ya compensan esa restriccion con `/api/medicos`; las vistas imprimibles todavia dependen exclusivamente de la expansion.

El endpoint `/api/medicos` autentica la solicitud y usa credenciales administrativas del servidor para devolver solo `id`, `name` y `email` de usuarios con rol medico. Esa superficie limitada es adecuada tanto en web como en la aplicacion de escritorio local.

## Goals / Non-Goals

**Goals:**

- Mostrar una etiqueta consistente del medico responsable en todas las consultas y documentos imprimibles.
- Permitir que un medico vea el nombre de otro medico responsable sin ampliar las reglas de lectura de `users`.
- Cubrir con pruebas la ausencia esperada de `expand.medico_id` para otro medico.

**Non-Goals:**

- Permitir que un medico edite o reasigne consultas de otro profesional.
- Exponer datos privados adicionales de usuarios.
- Modificar el esquema de PocketBase o completar consultas que no tengan `medico_id`.

## Decisions

1. Se mantendra `/api/medicos` como fuente autorizada de nombres. Cambiar `users.viewRule` permitiria expansiones directas, pero expondria registros de usuarios mas alla de la necesidad clinica.
2. Se reutilizara `doctorLabelFromList(medicoId, expandedDoctor, medicos)` para resolver primero la expansion disponible y luego la lista segura por identificador. Esto evita reglas distintas entre pantallas.
3. Las vistas imprimibles cargaran en paralelo la consulta y `/api/medicos` usando el token actual. El documento se renderizara despues de completar ambas cargas, para no imprimir un fallback transitorio.
4. Si `/api/medicos` falla, la vista conservara la expansion como respaldo y mostrara el fallback actual solo si tampoco puede resolver el identificador. La consulta seguira siendo imprimible.
5. La validacion automatizada incluira al menos la funcion de resolucion y el flujo de una consulta asignada a un medico distinto del usuario autenticado.

## Risks / Trade-offs

- [La carga imprimible agrega una solicitud] → Ejecutarla en paralelo con la consulta y reutilizar el endpoint liviano existente.
- [Un medico eliminado o ausente de la copia local no puede resolverse] → Conservar el identificador de responsabilidad y mostrar un fallback explicito sin bloquear la consulta.
- [Una falla del endpoint podria pasar inadvertida] → Registrar el error y cubrir el comportamiento de respaldo en pruebas.

## Migration Plan

No hay migracion de datos ni esquema. El despliegue consiste en actualizar la aplicacion; el rollback restaura las vistas anteriores sin afectar registros persistidos.

## Open Questions

Ninguna para la implementacion inicial.
