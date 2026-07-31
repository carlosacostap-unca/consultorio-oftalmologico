## ADDED Requirements

### Requirement: Identificacion del medico responsable
El sistema SHALL mostrar el nombre del medico responsable de una consulta a todo usuario autenticado con permiso para acceder a esa consulta, aunque el responsable sea otro medico y PocketBase no permita expandir su registro de usuario.

#### Scenario: Un medico consulta una atencion de otro medico
- **WHEN** un usuario con rol medico abre el listado o el detalle de una consulta cuyo `medico_id` corresponde a otro medico
- **THEN** el sistema muestra el nombre del medico responsable
- **AND** no depende exclusivamente de `expand.medico_id`

#### Scenario: Un medico imprime una atencion de otro medico
- **WHEN** un usuario con rol medico abre el informe clinico, la receta de anteojos o la historia clinica imprimible que contiene una consulta de otro medico
- **THEN** el documento muestra el nombre del medico responsable correspondiente a `medico_id`

#### Scenario: La consulta no tiene un medico resoluble
- **WHEN** una consulta no tiene `medico_id` o el identificador no corresponde a un medico disponible
- **THEN** el sistema muestra un fallback explicito
- **AND** permite consultar e imprimir el resto de la informacion clinica

#### Scenario: Privacidad de usuarios
- **WHEN** el sistema obtiene nombres para resolver la responsabilidad medica
- **THEN** solo utiliza los datos minimos de identificacion provistos por el endpoint autenticado de medicos
- **AND** no amplia las reglas generales de lectura de la coleccion `users`
