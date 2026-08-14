## MODIFIED Requirements

### Requirement: Sincronización bidireccional ordenada
El sistema SHALL enviar primero las operaciones locales pendientes y luego descargar los cambios confirmados por el servidor central respetando las dependencias entre pacientes, consultas y recetas.

#### Scenario: Reconexión con cambios relacionados
- **WHEN** vuelve Internet y existen un paciente, una consulta y una receta creados offline
- **THEN** el sistema envía primero el paciente, luego la consulta y finalmente la receta
- **AND** descarga los cambios centrales posteriores a los cursores durables
- **AND** marca cada operación como confirmada sólo después de recibir aceptación central

#### Scenario: Descargar cambios relacionados paginados
- **WHEN** una receta central referencia una consulta ubicada en una página posterior del pull
- **THEN** la PC completa primero todas las páginas de pacientes y consultas
- **AND** comienza a aplicar recetas sólo después de que sus dependencias estén disponibles localmente

#### Scenario: Falla durante un lote
- **WHEN** la conexión se interrumpe durante push o pull
- **THEN** el sistema no descarta operaciones pendientes ni adelanta el cursor no confirmado
- **AND** reintenta desde el último punto durable con espera creciente

### Requirement: Pull incremental y bajas lógicas
El sistema SHALL descargar cambios centrales por colección mediante cursores durables, SHALL procesar las colecciones en orden de dependencia y SHALL propagar bajas lógicas sin depender de registros físicamente eliminados.

#### Scenario: Descargar página de cambios
- **WHEN** existen cambios centrales posteriores al cursor local
- **THEN** el servidor devuelve una página ordenada de forma estable
- **AND** la PC aplica todos los upserts por el mismo ID antes de avanzar el cursor de esa colección

#### Scenario: Falla al aplicar una página
- **WHEN** un registro de una página no puede persistirse localmente
- **THEN** la PC conserva el último cursor durable anterior a esa página
- **AND** permite reintentar los upserts idempotentes sin omitir registros

#### Scenario: Recibir baja lógica
- **WHEN** un registro central está marcado como eliminado
- **THEN** la PC lo omite de los flujos operativos normales
- **AND** conserva los metadatos necesarios para auditoría y sincronización

### Requirement: Estado de sincronización visible
El sistema SHALL mostrar conectividad, última sincronización, cantidad de pendientes, errores y conflictos, SHALL permitir iniciar una sincronización manual no concurrente y SHALL abandonar siempre los estados transitorios de carga ante una falla recuperable.

#### Scenario: Ver resumen persistente
- **WHEN** un usuario autenticado navega por la aplicación de escritorio
- **THEN** la barra lateral muestra el estado y el total de pendientes
- **AND** enlaza a `/sincronizacion`

#### Scenario: Sincronizar manualmente
- **WHEN** el usuario selecciona `Sincronizar ahora`
- **THEN** el sistema ejecuta una sola sincronización aunque se pulse varias veces
- **AND** actualiza el avance y resultado sin bloquear el trabajo local

#### Scenario: Error visible y recuperable
- **WHEN** una operación falla por red, autenticación, validación, relación o conflicto
- **THEN** la pantalla abandona el estado de carga, clasifica el error y conserva la operación
- **AND** ofrece la acción adecuada de reintentar, revalidar o revisar

#### Scenario: Error funcional con servidor alcanzable
- **WHEN** la red está disponible pero una validación o dependencia impide completar la sincronización
- **THEN** la interfaz mantiene la conectividad como disponible
- **AND** muestra el error de sincronización sin informarlo como falta de conexión
