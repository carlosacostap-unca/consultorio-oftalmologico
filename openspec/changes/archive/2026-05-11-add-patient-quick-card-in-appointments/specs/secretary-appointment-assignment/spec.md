## ADDED Requirements

### Requirement: Ficha rapida de paciente desde Gestion de Turnos
El sistema SHALL permitir que secretaria consulte una ficha rapida del paciente sin abandonar Gestion de Turnos.

#### Scenario: Abrir ficha desde un turno
- **WHEN** secretaria selecciona la accion de ficha rapida sobre un paciente en Agenda Diaria, Sala de espera, Lista o el modal de gestion de turno
- **THEN** el sistema muestra nombre, documento, telefono, email, obra social, afiliado, domicilio y numero de ficha
- **AND** conserva el contexto actual de Gestion de Turnos en segundo plano

#### Scenario: Ver actividad reciente
- **WHEN** la ficha rapida se abre para un paciente con actividad
- **THEN** el sistema muestra ultimos turnos y ultimas consultas del paciente
- **AND** ofrece enlaces a la ficha completa del paciente y a nueva consulta

### Requirement: Correccion administrativa rapida del paciente
El sistema SHALL permitir que secretaria corrija datos administrativos minimos del paciente desde la ficha rapida.

#### Scenario: Guardar datos minimos
- **WHEN** secretaria edita telefono, email, obra social, documento u otro dato administrativo minimo y guarda
- **THEN** el sistema actualiza el paciente
- **AND** refleja los nuevos datos en los turnos visibles del paciente

#### Scenario: Error al guardar
- **WHEN** PocketBase rechaza la actualizacion del paciente
- **THEN** el sistema informa que no se pudieron guardar los cambios
- **AND** mantiene la ficha rapida abierta para corregir o reintentar
