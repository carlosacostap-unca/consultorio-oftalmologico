## ADDED Requirements

### Requirement: Conflictos compatibles sin eliminación de datos
El sistema SHALL guardar y resolver conflictos usando los campos actuales y heredados del esquema mixto sin borrar campos, registros ni snapshots existentes.

#### Scenario: Campos heredados obligatorios
- **WHEN** producción exige `entidad`, `tipo` y `estado` además del esquema actual
- **THEN** el servidor guarda ambos formatos con valores equivalentes válidos
- **AND** conserva completas las versiones base, local y central

#### Scenario: Resolver un conflicto existente
- **WHEN** un usuario autorizado resuelve explícitamente un conflicto
- **THEN** se actualizan ambos estados de resolución
- **AND** se mantienen los snapshots originales y la auditoría

### Requirement: Reintento de conflicto durable
El sistema SHALL reutilizar el conflicto existente de una operación del mismo equipo y actor cuando el reintento ocurre después de una interrupción de la confirmación durable.

#### Scenario: Falla después de guardar el conflicto
- **WHEN** el conflicto quedó guardado pero falló la escritura de la confirmación
- **THEN** el reintento devuelve el mismo ID de conflicto sin crear otro
- **AND** no cambia los registros clínicos ni los snapshots del conflicto

#### Scenario: Falla al guardar evidencia local
- **WHEN** la PC no puede guardar el conflicto recibido
- **THEN** la operación sigue siendo recuperable mediante reintento
- **AND** no se marca como conflicto cerrado ni se elimina su payload

#### Scenario: Falla de confirmación después de aplicar una edición o baja
- **WHEN** el registro central conserva el `sync_operation_id` de la operación pero se interrumpió la escritura de su confirmación durable
- **THEN** el reintento autorizado reconoce que esa operación ya se aplicó y completa su confirmación
- **AND** no vuelve a escribir el registro ni crea un conflicto contra su propia edición

### Requirement: Protección de registros locales sin confirmar
El sistema SHALL conservar los registros locales con operaciones sin confirmar cuando recibe una versión central y SHALL mantener el cursor anterior si no puede aplicar una página completa con seguridad.

#### Scenario: Confirmación histórica con edición posterior
- **WHEN** se confirma una operación y existe otra operación sin confirmar sobre el mismo registro
- **THEN** se conserva el contenido local actual y la operación posterior
- **AND** se registra la confirmación de la operación original sin borrar su evidencia

#### Scenario: Pull sobre registro en error o conflicto
- **WHEN** una página central contiene un registro con operación local pendiente, enviándose, en error o en conflicto
- **THEN** no sobrescribe el registro local
- **AND** detiene la página sin avanzar su cursor
- **AND** permite reintentar tras confirmar o resolver la operación local

### Requirement: Recuperación con respaldos y conciliación
La recuperación del incidente SHALL exigir respaldos local y central verificados y SHALL conciliar cada operación afectada manteniendo sus identificadores originales.

#### Scenario: Respaldo local pendiente
- **WHEN** todavía no está verificado el respaldo del equipo afectado
- **THEN** se puede preparar y probar la corrección con datos sintéticos
- **AND** no se publica una corrección que libere sus reintentos automáticos ni se modifica su base

#### Scenario: Comprobar recuperación
- **WHEN** se ejecuta el reintento controlado con respaldos disponibles
- **THEN** cada operación queda asociada a una confirmación durable o un conflicto con ambas versiones
- **AND** se comparan contenido y relaciones además de contadores

#### Scenario: Regresión antes de publicar
- **WHEN** se prepara una nueva publicación de escritorio
- **THEN** el workflow exige los ensayos de preservación y el recorrido completo del motor y endpoints sobre dos bases sintéticas separadas
- **AND** un fallo en cualquiera de estos ensayos detiene el empaquetado y la publicación

#### Scenario: Arranque de prueba del instalador piloto
- **WHEN** se ejecuta el runtime empaquetado con `--smoke-test`
- **THEN** requiere una ruta absoluta de perfil nueva, vacía y separada del perfil habitual
- **AND** inicia y detiene los servicios en ese perfil sin abrir el escritorio clínico ni habilitar el actualizador
- **AND** un perfil existente o una ruta no segura detiene el ensayo antes de iniciar sus servicios
