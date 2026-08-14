## ADDED Requirements

### Requirement: Búsqueda de actualizaciones configurada y observable
La aplicación de escritorio SHALL resolver la URL central desde su configuración explícita o desde la activación cifrada del equipo y SHALL comunicar de forma visible el resultado de toda búsqueda manual de actualizaciones.

#### Scenario: Equipo activado sin variables de entorno
- **WHEN** una instalación empaquetada no dispone de variables de entorno para la URL central pero conserva una activación cifrada válida
- **THEN** el actualizador utiliza `centralAppUrl` de esa activación para consultar la política autorizada
- **AND** no exige reinstalar ni volver a activar el equipo

#### Scenario: Configuración central ausente
- **WHEN** el usuario solicita buscar actualizaciones y no existe una URL central válida en el entorno ni en la activación
- **THEN** la aplicación informa que falta configurar la conexión central
- **AND** registra el motivo de forma sanitizada sin bloquear el trabajo local

#### Scenario: Sesión central ausente o vencida
- **WHEN** el usuario solicita buscar actualizaciones sin un token central vigente
- **THEN** la aplicación informa que debe volver a iniciar sesión para buscar actualizaciones
- **AND** conserva operativa la versión instalada y los datos locales

#### Scenario: Versión instalada vigente
- **WHEN** el servidor confirma que no existe una versión autorizada superior
- **THEN** la interfaz informa que la aplicación está actualizada
- **AND** conserva la fecha de la comprobación

#### Scenario: Error de red o del servidor de actualizaciones
- **WHEN** la consulta no puede completarse por conectividad o por una respuesta inválida del servidor
- **THEN** la interfaz informa que no pudo buscar la actualización y permite reintentar
- **AND** el diagnóstico registra el resultado sin exponer tokens, firmas ni URLs con parámetros sensibles
