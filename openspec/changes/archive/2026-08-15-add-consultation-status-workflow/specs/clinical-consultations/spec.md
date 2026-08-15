## MODIFIED Requirements

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, estado operativo, contexto clinico previo del paciente disponible bajo demanda, auditoria de creacion, acciones de cierre asistidas al finalizar el guardado y una disposicion compacta de escritorio para monitores Full HD.

#### Scenario: Guardar avance de consulta
- **WHEN** el usuario guarda una nueva consulta como avance con paciente seleccionado
- **THEN** el sistema crea un registro en `consultas`
- **AND** guarda la fecha en formato ISO
- **AND** asigna `estado = en_curso`
- **AND** registra un evento de auditoria de creacion de consulta
- **AND** si la consulta viene desde un turno mantiene el turno en `En consulta`

#### Scenario: Finalizar consulta nueva
- **WHEN** el usuario finaliza una nueva consulta con paciente seleccionado
- **THEN** el sistema crea un registro en `consultas`
- **AND** asigna `estado = finalizada`
- **AND** si la consulta viene desde un turno lo marca `Atendido`
- **AND** muestra una confirmacion de consulta finalizada sin redirigir automaticamente

### Requirement: Edicion protegida de consultas
El sistema SHALL limitar la edicion de consultas segun la configuracion `consulta_edit_limit_days` y permitir finalizar consultas editables.

#### Scenario: Guardar cambios de consulta
- **WHEN** la fecha de consulta esta dentro del limite permitido
- **THEN** el formulario permite editar y guardar mediante `PATCH /api/consultas/[id]`
- **AND** conserva el estado actual salvo que el usuario elija cambiarlo

#### Scenario: Finalizar consulta existente
- **WHEN** el usuario finaliza una consulta editable
- **THEN** el sistema actualiza `estado = finalizada`
- **AND** registra auditoria del cambio de estado

### Requirement: Listado de consultas
El sistema SHALL listar consultas con filtros por paciente, letra inicial y fecha, mostrando el estado operativo de cada consulta.

#### Scenario: Cargar consultas
- **WHEN** el usuario abre `/consultas`
- **THEN** el sistema consulta `consultas` paginadas de a 20
- **AND** expande `paciente_id`
- **AND** muestra fecha, paciente, numero de ficha, estado, motivo y diagnostico

### Requirement: Auditoria de consultas
El sistema SHALL registrar y mostrar eventos de auditoria asociados a cada consulta clinica.

#### Scenario: Cambiar estado de consulta
- **WHEN** se actualiza el estado de una consulta existente
- **THEN** el sistema registra un evento de auditoria asociado a la consulta
- **AND** guarda estado anterior y estado nuevo en metadata
