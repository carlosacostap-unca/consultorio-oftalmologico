## ADDED Requirements

### Requirement: Artefacto de escritorio sin datos clinicos del constructor
El sistema MUST generar y publicar paquetes de escritorio que contengan solamente codigo y recursos operativos, excluyendo fuentes de importacion, respaldos clinicos y bases activas presentes en el equipo constructor.

#### Scenario: Empaquetar con un directorio local de datos
- **WHEN** el repositorio del constructor contiene `data/`, archivos DBF o respaldos ignorados por Git
- **THEN** electron-builder no los copia a `resources/app` ni a otra ubicacion del paquete
- **AND** conserva el servidor standalone y los recursos requeridos por el runtime

#### Scenario: Verificacion bloqueante detecta datos empaquetados
- **WHEN** la salida contiene `resources/app/data`, una base `pb_data`, un manifiesto `*.nft.json` o una representacion equivalente de datos locales activos, incluso dentro de `app.asar`
- **THEN** la verificacion del paquete falla antes de considerar el artefacto apto para publicar
- **AND** informa rutas relativas sin imprimir contenido clinico

#### Scenario: Recursos permitidos de PocketBase
- **WHEN** la salida contiene el ejecutable PocketBase, migraciones y hooks previstos
- **THEN** la verificacion los acepta
- **AND** la aplicacion crea su base operativa separadamente bajo el perfil del usuario al iniciar
