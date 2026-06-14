## ADDED Requirements

### Requirement: Diagnostico previo de reemplazo DBF
El sistema SHALL proveer un diagnostico de reemplazo que lea los archivos DBF legacy sin modificar PocketBase.

#### Scenario: Ejecutar diagnostico sin escritura
- **WHEN** se ejecuta el diagnostico de reemplazo DBF
- **THEN** el sistema lee `data/MUTUALES.DBF`, `data/PACIENTE.DBF` y `data/DATOMED.DBF`
- **AND** informa conteos de registros activos, borrados, importables y excepciones
- **AND** no crea, actualiza ni elimina registros en PocketBase

#### Scenario: Reportar excepciones clinicas
- **WHEN** el diagnostico detecta fichas duplicadas, consultas sin paciente o codigos de mutual sin coincidencia
- **THEN** el sistema genera un reporte con los casos afectados
- **AND** incluye datos suficientes para revision manual sin requerir leer todo el DBF

### Requirement: Reemplazo controlado de datos legacy
El sistema SHALL reemplazar mutuales, pacientes y consultas legacy solo mediante un flujo administrativo con backup y confirmacion explicita.

#### Scenario: Bloquear aplicacion sin confirmacion
- **WHEN** se ejecuta el importador de reemplazo sin flag de aplicacion explicito
- **THEN** el sistema ejecuta solamente el diagnostico
- **AND** muestra que no se aplicaron cambios

#### Scenario: Backup antes de reemplazar
- **WHEN** se ejecuta el importador de reemplazo con aplicacion habilitada
- **THEN** el sistema crea o verifica un backup reciente de las colecciones afectadas
- **AND** aborta antes de borrar o escribir datos si no puede asegurar el backup requerido

#### Scenario: Limpiar dependencias antes de reemplazar
- **WHEN** existen registros que referencian consultas o pacientes anteriores
- **THEN** el sistema elimina o reemplaza primero las colecciones dependientes en orden seguro
- **AND** reporta esas eliminaciones junto con las colecciones principales

#### Scenario: Validar conteos posteriores
- **WHEN** finaliza el reemplazo DBF
- **THEN** el sistema reporta mutuales, pacientes y consultas importadas
- **AND** reporta registros omitidos, huerfanos o ambiguos
- **AND** compara los conteos finales contra el diagnostico previo

### Requirement: Lectura DBF con encoding legacy
El sistema SHALL leer DBF de FoxPro preservando caracteres legacy de pacientes, mutuales y consultas.

#### Scenario: Decodificar texto legacy
- **WHEN** el sistema extrae campos de texto desde DBF
- **THEN** decodifica los valores con CP850 u otra codificacion legacy configurada
- **AND** conserva nombres, direcciones y textos clinicos con caracteres especiales cuando existan

#### Scenario: Normalizar fechas DBF
- **WHEN** un campo DBF de fecha tiene valor valido
- **THEN** el sistema lo transforma a formato compatible con PocketBase
- **AND** conserva vacio el campo destino cuando la fecha legacy esta ausente o no es valida
