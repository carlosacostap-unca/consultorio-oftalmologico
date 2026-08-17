## ADDED Requirements

### Requirement: Revisión central durable en la copia local
El sistema SHALL conservar separadamente la revisión central confirmada de cada registro y SHALL usarla como versión base de la siguiente operación local.

#### Scenario: Confirmar un registro central en la PC
- **WHEN** una alta, edición, resolución o descarga central se aplica correctamente en la base local
- **THEN** la PC guarda `updated` central como `sync_base_updated` local
- **AND** no usa el timestamp generado por la escritura local como revisión central

#### Scenario: Enviar una operación posterior
- **WHEN** la PC crea una edición o baja sobre un registro que ya tiene `sync_base_updated`
- **THEN** la operación usa esa revisión como versión base enviada al servidor

#### Scenario: Compatibilidad con una revisión heredada
- **WHEN** una baja enviada por una versión anterior tiene una revisión ausente o distinta de la central
- **AND** el snapshot base y la versión central no tienen diferencias funcionales
- **THEN** el servidor aplica la baja sin crear un conflicto técnico falso

#### Scenario: Cambio funcional concurrente durante una baja
- **WHEN** una baja tiene una revisión distinta de la central
- **AND** el registro central contiene cambios funcionales respecto del snapshot base
- **THEN** el servidor conserva el registro central activo
- **AND** crea un conflicto que identifica los campos funcionales diferentes

## MODIFIED Requirements

### Requirement: Resolución auditable de conflictos
El sistema SHALL permitir a un usuario autorizado resolver conflictos sin eliminar la evidencia de las versiones comparadas y SHALL preservar la acción original de una baja conflictiva.

#### Scenario: Conservar versión central
- **WHEN** el usuario autorizado elige conservar la versión central
- **THEN** la PC aplica la versión central y cierra la operación local conflictiva
- **AND** el sistema registra quién resolvió, cuándo y qué decisión tomó

#### Scenario: Aplicar versión local permitida
- **WHEN** el usuario autorizado elige aplicar valores locales válidos
- **THEN** el servidor crea una nueva versión central auditada
- **AND** todas las PCs la reciben en un pull posterior

#### Scenario: Vincular paciente duplicado
- **WHEN** el usuario determina que un alta local corresponde a un paciente central existente
- **THEN** el sistema mapea las consultas y recetas locales al paciente central
- **AND** conserva la ficha provisoria y el ID local en la auditoría de resolución

#### Scenario: Cancelar una baja conflictiva
- **WHEN** el usuario autorizado elige conservar central en un conflicto cuya acción original es una baja
- **THEN** el registro central permanece activo
- **AND** la PC restaura la versión central y cierra la intención local de eliminación

#### Scenario: Confirmar una baja conflictiva
- **WHEN** el usuario autorizado elige aplicar local en un conflicto cuya acción original es una baja
- **THEN** el servidor valida el permiso de eliminación y registra una baja lógica auditada
- **AND** la PC mantiene el registro oculto después de cerrar el conflicto

#### Scenario: Mostrar una baja en conflicto
- **WHEN** la pantalla presenta un conflicto cuya acción original es una baja
- **THEN** identifica explícitamente la intención de eliminación
- **AND** no lo describe como un conflicto de cero campos diferentes
- **AND** ofrece acciones inequívocas para cancelar o confirmar la baja
