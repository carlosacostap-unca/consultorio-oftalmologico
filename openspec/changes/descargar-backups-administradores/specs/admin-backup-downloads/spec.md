## ADDED Requirements

### Requirement: Acceso administrativo verificado
El sistema SHALL permitir consultar y descargar backups sólo a usuarios autenticados con rol admin asignado y activo, comprobado en el servidor en cada solicitud.

#### Scenario: Intento sin permisos
- **WHEN** una secretaria, un médico, una sesión vencida o un administrador con rol médico activo solicita el listado o una descarga
- **THEN** la API responde 403 y no consulta ni firma archivos del storage

#### Scenario: Cambio de usuario en Windows
- **WHEN** el token central conservado pertenece a otro usuario distinto al autenticado localmente
- **THEN** se rechaza el acceso y se solicita volver a iniciar sesión con conexión

### Requirement: Listado de respaldos disponibles
El sistema SHALL mostrar en web y Windows todos los backups centrales disponibles, ordenados desde el más reciente, con nombre, fecha, tamaño y tipo automático/manual. SHALL informar la cantidad configurada de automáticos sin asumir que los manuales caducan en 30 días.

#### Scenario: Listar copias automáticas y manuales
- **WHEN** un administrador abre Backups y existen copias de ambos tipos
- **THEN** ambas aparecen en el listado con botón Descargar

#### Scenario: Storage vacío o inaccesible
- **WHEN** no hay backups o el servicio no responde
- **THEN** la pantalla distingue lista vacía de error y ofrece actualizar

### Requirement: Descarga directa limitada a un backup
El sistema SHALL emitir una URL HTTPS firmada por cinco minutos para un único backup existente, con nombre validado y descarga como archivo adjunto. SHALL mantener credenciales y tokens de superusuario exclusivamente en el servidor.

#### Scenario: Descargar un respaldo
- **WHEN** un administrador selecciona un backup disponible
- **THEN** el servidor revalida permisos y existencia y el cliente descarga directamente del storage
- **AND** no carga el archivo completo en memoria de la aplicación ni lo retransmite mediante Next.js

#### Scenario: Nombre manipulado o backup eliminado
- **WHEN** se solicita una ruta ajena, un nombre inválido o una copia que ya no existe
- **THEN** no se genera ninguna URL y se muestra un error recuperable

#### Scenario: Credenciales de lectura ausentes
- **WHEN** el servidor todavía no dispone de credenciales para firmar la descarga
- **THEN** se puede consultar el listado y se informa que falta habilitar la descarga

### Requirement: Uso online desde escritorio
Windows SHALL consultar la misma fuente central mediante un bridge acotado y una sesión central vigente del usuario actual, sin credenciales de storage ni funciones locales de restauración.

#### Scenario: Equipo sin Internet
- **WHEN** un administrador abre Backups sin conexión
- **THEN** se informa que necesita Internet y se permite reintentar al recuperarla
