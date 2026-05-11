## MODIFIED Requirements

### Requirement: Crear receta
El sistema SHALL permitir crear recetas para un paciente, con consulta asociada opcional, preservando el contexto clinico cuando la receta nace desde una consulta.

#### Scenario: Nueva receta libre
- **WHEN** el usuario abre `/recetas/nueva`
- **THEN** el sistema carga pacientes ordenados por apellido y nombre
- **AND** permite seleccionar paciente, fecha, medicamentos/anteojos e indicaciones

#### Scenario: Nueva receta desde consulta
- **WHEN** la URL incluye `consulta_id` y `paciente_id`
- **THEN** el formulario precarga ambos IDs
- **AND** carga las consultas del paciente para permitir confirmar o cambiar la asociacion
- **AND** muestra contexto del paciente y de la consulta vinculada

#### Scenario: Guardar receta
- **WHEN** el usuario completa paciente, fecha y medicamentos/anteojos
- **THEN** el sistema crea un registro en `recetas`
- **AND** guarda la fecha con hora `12:00:00.000Z`
- **AND** muestra una confirmacion de receta guardada sin redirigir automaticamente

#### Scenario: Acciones posteriores al guardado
- **WHEN** la receta se guarda correctamente
- **THEN** el sistema permite abrir la receta creada
- **AND** permite volver a la consulta vinculada cuando existe
- **AND** permite imprimir anteojos cuando existe consulta vinculada
- **AND** permite cargar otra receta para el mismo paciente
