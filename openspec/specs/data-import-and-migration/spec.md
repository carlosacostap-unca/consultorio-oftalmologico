# Data Import And Migration Specification

## Purpose
Define los scripts de importacion, diagnostico y migracion de datos legacy desde archivos DBF/CSV/XLSX hacia PocketBase.
## Requirements
### Requirement: Importacion de mutuales
El sistema SHALL proveer un script para importar mutuales desde datos legacy a la coleccion `mutuales`.

#### Scenario: Importar mutuales
- **WHEN** se ejecuta el script de importacion de mutuales con datos fuente disponibles
- **THEN** el script crea registros en `mutuales` usando el endpoint PocketBase configurado
- **AND** registra progreso y errores en consola

### Requirement: Importacion de pacientes
El sistema SHALL proveer un script para importar pacientes legacy con datos personales, ficha y obra social textual.

#### Scenario: Importar pacientes
- **WHEN** se ejecuta el script de importacion de pacientes
- **THEN** el script transforma fechas legacy a formato ISO cuando corresponde
- **AND** crea registros en `pacientes`

### Requirement: Importacion de consultas
El sistema SHALL importar consultas legacy relacionandolas por numero de ficha.

#### Scenario: Paciente encontrado por ficha
- **WHEN** el script encuentra un paciente con el numero de ficha de la consulta legacy
- **THEN** crea una consulta asociada a ese paciente

#### Scenario: Paciente no encontrado
- **WHEN** no existe paciente para la ficha de una consulta legacy
- **THEN** el script salta esa consulta
- **AND** reporta el salto en consola

### Requirement: Migracion de relacion paciente-mutual
El sistema SHALL proveer migracion para crear y poblar `pacientes.mutual_id`.

#### Scenario: Campo relation ausente
- **WHEN** la coleccion `pacientes` no tiene `mutual_id`
- **THEN** el script agrega un campo relation hacia `mutuales`

#### Scenario: Asociar por nombre normalizado
- **WHEN** un paciente tiene `obra_social` que coincide con una mutual normalizada
- **THEN** el script actualiza `mutual_id`
- **AND** reporta pacientes con y sin relacion

### Requirement: Diagnostico de mutuales y pacientes
El sistema SHALL proveer un diagnostico de coincidencias entre `pacientes.obra_social` y `mutuales.nombre`.

#### Scenario: Ejecutar diagnostico
- **WHEN** se ejecuta el diagnostico
- **THEN** el script informa totales de pacientes, mutuales, pacientes con obra social y sin obra social
- **AND** reporta coincidencias exactas o aproximadas cuando puede evaluarlas

### Requirement: Migracion de permisos y configuracion
El sistema SHALL proveer scripts para inicializar permisos por rol, roles multiples de usuarios y configuracion del sistema.

#### Scenario: Migrar permisos
- **WHEN** se ejecuta la migracion de roles y permisos
- **THEN** el script crea o actualiza registros de `role_permissions` para roles administrables

#### Scenario: Migrar roles multiples de usuarios
- **WHEN** se ejecuta la migracion de roles y permisos
- **THEN** el script asegura un campo multi-rol `roles` en la coleccion `users`
- **AND** copia el valor legacy `role` de cada usuario a `roles` cuando corresponda
- **AND** conserva la migracion idempotente para ejecuciones repetidas

#### Scenario: Migrar configuracion
- **WHEN** se ejecuta la migracion de configuracion
- **THEN** el script asegura la clave `consulta_edit_limit_days` en `system_settings`
- **AND** usa 7 como valor inicial si no existe

### Requirement: Migracion de antecedentes fijos
El sistema SHALL migrar antecedentes desde CSV de pacientes hacia pacientes y consultas.

#### Scenario: Mapear antecedentes
- **WHEN** se ejecuta la migracion de antecedentes
- **THEN** el script cruza filas por numero de ficha o documento
- **AND** actualiza antecedentes en `pacientes` y en consultas asociadas cuando hay cambios

### Requirement: Autenticacion de scripts administrativos
Los scripts administrativos SHALL autenticarse contra PocketBase con token o credenciales de administrador.

#### Scenario: Token disponible
- **WHEN** existe token administrativo en el entorno
- **THEN** el script lo usa en las llamadas a PocketBase

#### Scenario: Credenciales disponibles
- **WHEN** no hay token pero hay credenciales
- **THEN** el script obtiene token mediante endpoint admin o `_superusers`

#### Scenario: Entorno fuente y destino
- **WHEN** un script administrativo necesita leer una instancia fuente y escribir en una instancia destino
- **THEN** el script autentica cada instancia con su propio archivo de entorno
- **AND** aplica guardas anti-produccion antes de escribir en el destino

### Requirement: Seeds de testing aislados
El sistema SHALL permitir ejecutar seeds demo contra una instancia PocketBase de testing separada de produccion.

#### Scenario: Ejecutar seeds de testing
- **WHEN** el desarrollador ejecuta el script de seed de testing
- **THEN** el sistema carga variables desde `.env.test.local`
- **AND** crea o actualiza usuarios, pacientes, disponibilidades y turnos demo en la instancia configurada

#### Scenario: Bloquear seed contra produccion
- **WHEN** el script de seed de testing detecta una URL que parece produccion
- **THEN** el sistema aborta antes de escribir datos
- **AND** muestra un error que indique revisar la configuracion de PocketBase

### Requirement: Normalizacion de fechas de nacimiento de pacientes
El sistema SHALL proveer un script administrativo para normalizar `pacientes.fecha_nacimiento` guardadas a medianoche UTC.

#### Scenario: Ejecutar diagnostico sin aplicar cambios
- **WHEN** se ejecuta el script sin `--apply`
- **THEN** el script lista candidatos con `fecha_nacimiento` exactamente a `00:00:00.000Z`
- **AND** escribe un reporte dry-run en `reports/`
- **AND** no modifica registros en PocketBase

#### Scenario: Aplicar normalizacion confirmada
- **WHEN** se ejecuta el script con `--apply --confirm=CONFIRMO_NORMALIZAR_FECHAS_NACIMIENTO`
- **THEN** el script crea un respaldo de los registros candidatos antes de actualizar
- **AND** cambia solo la hora de `00:00:00.000Z` a `12:00:00.000Z`
- **AND** conserva el mismo anio, mes y dia calendario
- **AND** escribe un reporte con actualizados, fallidos y remanentes

#### Scenario: Bloquear apply sin confirmacion
- **WHEN** se ejecuta el script con `--apply` sin la confirmacion exacta
- **THEN** el script aborta antes de modificar datos
- **AND** informa la confirmacion requerida

### Requirement: Normalizacion de fechas clinicas de consulta a medianoche UTC
El sistema SHALL proveer una migracion administrativa para normalizar consultas existentes cuya `fecha` este guardada a medianoche UTC exacta, conservando el mismo dia clinico y cambiando la hora a mediodia UTC.

#### Scenario: Diagnostico sin aplicar cambios
- **WHEN** el operador ejecuta la migracion sin `--apply`
- **THEN** el sistema lista el total de consultas candidatas
- **AND** informa ejemplos representativos
- **AND** escribe un reporte de dry-run sin modificar PocketBase

#### Scenario: Bloquear aplicacion sin confirmacion
- **WHEN** el operador ejecuta la migracion con `--apply` sin confirmacion explicita
- **THEN** el sistema aborta antes de actualizar consultas
- **AND** informa la confirmacion requerida

#### Scenario: Aplicar normalizacion confirmada
- **WHEN** el operador ejecuta la migracion con `--apply` y confirmacion explicita
- **THEN** el sistema guarda un backup de las consultas objetivo
- **AND** actualiza solo consultas cuya hora sea `00:00:00.000Z`
- **AND** cambia la hora a `12:00:00.000Z` manteniendo ano, mes y dia
- **AND** escribe un reporte de resultado con exitos, fallos y candidatas restantes
