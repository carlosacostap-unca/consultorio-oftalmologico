# Offline Data Synchronization Specification

## Purpose
Define la sincronización bidireccional, durable y auditable de los datos clínicos creados o modificados desde la aplicación de escritorio.

## Requirements
### Requirement: Cola local durable
El sistema SHALL registrar cada alta, edición o baja lógica offline de pacientes, consultas y recetas en una cola durable atribuida al usuario y al equipo.

#### Scenario: Guardar operación offline
- **WHEN** un usuario guarda un cambio sin conexión
- **THEN** el registro queda disponible inmediatamente en la base local
- **AND** se crea una operación pendiente con ID único, entidad, acción, payload, campos cambiados, versión base, actor, equipo y fecha local

#### Scenario: Reiniciar con pendientes
- **WHEN** la aplicación se cierra o el equipo se reinicia antes de sincronizar
- **THEN** las operaciones pendientes permanecen en la cola
- **AND** conservan su orden y dependencias

### Requirement: Sincronización bidireccional ordenada
El sistema SHALL enviar primero las operaciones locales pendientes y luego descargar los cambios confirmados por el servidor central.

#### Scenario: Reconexión con cambios relacionados
- **WHEN** vuelve Internet y existen un paciente, una consulta y una receta creados offline
- **THEN** el sistema envía primero el paciente, luego la consulta y finalmente la receta
- **AND** descarga los cambios centrales posteriores a los cursores durables
- **AND** marca cada operación como confirmada sólo después de recibir aceptación central

#### Scenario: Falla durante un lote
- **WHEN** la conexión se interrumpe durante push o pull
- **THEN** el sistema no descarta operaciones pendientes ni adelanta el cursor no confirmado
- **AND** reintenta desde el último punto durable con espera creciente

### Requirement: Idempotencia de operaciones
El sistema SHALL procesar cada `operation_id` a lo sumo una vez en el servidor y SHALL devolver el resultado previamente confirmado ante reintentos.

#### Scenario: Respuesta perdida después de aplicar
- **WHEN** el servidor aplica una operación pero la PC no recibe la respuesta
- **AND** la PC reenvía el mismo `operation_id`
- **THEN** el servidor no crea ni modifica nuevamente el registro
- **AND** devuelve la confirmación y los mapeos originales

### Requirement: Servidor central autoritativo
El sistema SHALL tratar como definitiva toda versión confirmada por el servidor central y SHALL aplicar autorización central antes de aceptar operaciones del escritorio.

#### Scenario: Operación autorizada
- **WHEN** un dispositivo registrado envía una operación con sesión central válida y rol permitido
- **THEN** el endpoint valida usuario, dispositivo, entidad y acción
- **AND** aplica la operación o devuelve un conflicto explícito

#### Scenario: Operación no autorizada
- **WHEN** la sesión está revocada, el dispositivo no está habilitado o el rol no permite la acción
- **THEN** el servidor rechaza la operación sin modificar datos clínicos
- **AND** la PC conserva el pendiente y muestra que requiere revalidación o intervención

### Requirement: Fichas provisorias por equipo
El sistema SHALL asignar una ficha provisoria única a cada paciente creado offline y SHALL reemplazarla por la ficha definitiva decidida por el servidor.

#### Scenario: Crear paciente offline
- **WHEN** se crea un paciente sin conexión en el equipo con código `PC1`
- **THEN** la base local asigna una ficha con formato `TEMP-PC1-<SECUENCIA>`
- **AND** no reutiliza esa secuencia aunque el registro sea descartado posteriormente

#### Scenario: Confirmar paciente nuevo
- **WHEN** el servidor acepta el alta del paciente con ficha provisoria
- **THEN** asigna una ficha definitiva sin colisionar con pacientes activos
- **AND** devuelve la ficha definitiva a la PC
- **AND** la PC actualiza sus vistas y conserva la ficha provisoria en auditoría

### Requirement: Pull incremental y bajas lógicas
El sistema SHALL descargar cambios centrales por colección mediante cursores durables y SHALL propagar bajas lógicas sin depender de registros físicamente eliminados.

#### Scenario: Descargar página de cambios
- **WHEN** existen cambios centrales posteriores al cursor local
- **THEN** el servidor devuelve una página ordenada de forma estable
- **AND** la PC aplica upserts por el mismo ID antes de avanzar el cursor

#### Scenario: Recibir baja lógica
- **WHEN** un registro central está marcado como eliminado
- **THEN** la PC lo omite de los flujos operativos normales
- **AND** conserva los metadatos necesarios para auditoría y sincronización

### Requirement: Fusión segura de pacientes
El sistema SHALL fusionar automáticamente sólo ediciones concurrentes de paciente sobre campos distintos y SHALL registrar la decisión.

#### Scenario: Campos distintos
- **WHEN** una PC modifica el teléfono y el servidor modificó la obra social desde la versión base
- **THEN** el servidor conserva ambos cambios
- **AND** crea una nueva versión auditada sin conflicto manual

#### Scenario: Mismo campo sensible
- **WHEN** una PC y el servidor modificaron el mismo documento, ficha, nombre, fecha de nacimiento o antecedente desde la versión base
- **THEN** el servidor no sobrescribe silenciosamente ninguna versión
- **AND** crea un conflicto visible con base, versión local, versión central y campos en choque

### Requirement: Conflictos conservadores de consultas y recetas
El sistema SHALL impedir sobrescrituras silenciosas cuando una consulta o receta fue editada local y centralmente desde la misma versión base.

#### Scenario: Consulta concurrente
- **WHEN** la consulta central cambió después de la versión base de una edición local
- **THEN** el servidor conserva la consulta central vigente
- **AND** registra la edición local completa como conflicto para revisión

#### Scenario: Receta concurrente
- **WHEN** la receta central cambió después de la versión base de una edición local
- **THEN** el servidor conserva la receta central vigente
- **AND** registra la edición local completa como conflicto para revisión

### Requirement: Detección de posibles pacientes duplicados
El sistema SHALL revisar coincidencias fuertes antes de consolidar centralmente un paciente creado offline.

#### Scenario: Documento coincidente
- **WHEN** un alta offline tiene el mismo documento normalizado que un paciente central activo
- **THEN** el servidor crea un conflicto de posible duplicado
- **AND** no asigna silenciosamente una segunda ficha definitiva

#### Scenario: Nombre y nacimiento coincidentes
- **WHEN** un alta offline coincide fuertemente por nombre y fecha de nacimiento con un paciente central
- **THEN** el servidor presenta ambos registros para revisión
- **AND** conserva el borrador local hasta que se resuelva

### Requirement: Resolución auditable de conflictos
El sistema SHALL permitir a un usuario autorizado resolver conflictos sin eliminar la evidencia de las versiones comparadas.

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

### Requirement: Descarga extensa reanudable
El sistema SHALL procesar las descargas centrales extensas en tramos acotados y reanudables, conservando el orden de dependencias y el último cursor confirmado hasta alcanzar al servidor central.

#### Scenario: Colección mayor que el presupuesto de un tramo
- **WHEN** una colección contiene más páginas que las permitidas en una ejecución acotada
- **THEN** la PC aplica las páginas completas del tramo y conserva su último cursor confirmado
- **AND** registra que la descarga continúa sin clasificar el agotamiento del presupuesto como error
- **AND** programa automáticamente otro tramo desde ese cursor

#### Scenario: Reinicio con descarga pendiente
- **WHEN** la aplicación se cierra o Windows se reinicia antes de alcanzar la última página central
- **THEN** la siguiente sincronización reanuda la colección desde el cursor durable existente
- **AND** no exige reinstalar la aplicación ni volver a descargar páginas ya confirmadas

#### Scenario: Página que no avanza el cursor
- **WHEN** el servidor devuelve una página con más resultados pero el cursor está ausente, repetido o no es posterior al solicitado
- **THEN** la PC detiene la continuación automática y clasifica la respuesta como error técnico
- **AND** conserva el último cursor durable anterior a esa página

#### Scenario: Falla mientras se aplica una página
- **WHEN** una página no puede persistirse completamente en PocketBase local
- **THEN** la PC no guarda el cursor de esa página
- **AND** el reintento vuelve a solicitarla y aplica sus registros de manera idempotente

### Requirement: Estado de sincronización visible
El sistema SHALL mostrar conectividad, fase de sincronización, colección en curso, última sincronización completa, cantidad de pendientes, errores y conflictos, y SHALL permitir iniciar una sincronización manual no concurrente.

#### Scenario: Ver resumen persistente
- **WHEN** un usuario autenticado navega por la aplicación de escritorio
- **THEN** la barra lateral muestra el estado y el total de pendientes
- **AND** enlaza a `/sincronizacion`

#### Scenario: Sincronizar manualmente
- **WHEN** el usuario selecciona `Sincronizar ahora`
- **THEN** el sistema ejecuta una sola sincronización aunque se pulse varias veces
- **AND** actualiza el avance y resultado sin bloquear el trabajo local

#### Scenario: Descarga con continuaciones pendientes
- **WHEN** una colección requiere más de un tramo para alcanzar al servidor central
- **THEN** la pantalla mantiene el estado `Sincronizando` y muestra la colección en curso y contadores técnicos no clínicos
- **AND** no presenta el agotamiento del presupuesto como error ni actualiza la última sincronización completa

#### Scenario: Descarga central completada
- **WHEN** pacientes, consultas y recetas responden que no quedan páginas posteriores a sus cursores confirmados
- **THEN** el sistema presenta la copia local como actualizada
- **AND** registra la fecha de última sincronización completa

#### Scenario: Error visible y recuperable
- **WHEN** una operación falla por red, autenticación, validación, persistencia, cursor inválido o conflicto
- **THEN** la pantalla clasifica el error y conserva la operación y los cursores confirmados
- **AND** ofrece la acción adecuada de reintentar, revalidar o revisar

### Requirement: Auditoría de sincronización
El sistema SHALL conservar médico, equipo, fecha local, fecha central, operación, versiones y resultado para cada cambio sincronizado.

#### Scenario: Operación confirmada
- **WHEN** el servidor confirma una operación local
- **THEN** registra actor, dispositivo, timestamps, entidad, registro y resultado
- **AND** los logs de aplicación omiten tokens y contenido clínico completo
