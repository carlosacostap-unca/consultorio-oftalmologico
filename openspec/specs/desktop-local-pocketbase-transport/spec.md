# Desktop Local PocketBase Transport Specification

## Purpose

Garantizar que la aplicación de escritorio intercambie solicitudes válidas y trazables con PocketBase local durante la activación, el ingreso y el trabajo offline.

## Requirements

### Requirement: Serialización JSON compatible con PocketBase local
El sistema SHALL enviar como JSON válido toda solicitud de la aplicación de escritorio hacia PocketBase local cuyo cuerpo sea un objeto y cuyo tipo de contenido sea `application/json`.

#### Scenario: Autenticación local con contraseña
- **WHEN** la aplicación de escritorio autentica un usuario contra PocketBase local
- **THEN** el cuerpo recibido contiene un objeto JSON válido con la identidad y la contraseña
- **AND** PocketBase no recibe la representación textual `[object Object]`

#### Scenario: Creación del usuario durante la activación
- **WHEN** la copia inicial crea el usuario descargado desde la aplicación central
- **THEN** PocketBase local recibe un objeto JSON válido con los datos permitidos del usuario
- **AND** puede aplicar sus validaciones de colección sobre esos datos

#### Scenario: Credencial local para un usuario adicional
- **WHEN** la copia inicial crea un usuario distinto del usuario que activó el equipo
- **THEN** genera una credencial local aleatoria que no contiene la contraseña central
- **AND** su representación UTF-8 no supera el límite de 72 bytes de bcrypt

#### Scenario: Compilación de escritorio con la lógica vigente
- **WHEN** se genera una nueva versión portátil después de corregir las credenciales locales
- **THEN** el servidor incluido en el paquete usa la misma lógica vigente del código compilado
- **AND** no conserva la implementación anterior que superaba el límite de bcrypt

### Requirement: Conservación de cabeceras y restricciones de escritorio
El sistema MUST conservar el tipo de contenido y las cabeceras de identificación requeridas sin debilitar las restricciones de escritura de la aplicación de escritorio.

#### Scenario: Solicitud identificada por dispositivo
- **WHEN** una solicitud se realiza desde el runtime de escritorio
- **THEN** incluye el identificador del dispositivo
- **AND** incluye el identificador del actor cuando existe una sesión local autenticada

#### Scenario: Escritura fuera del alcance offline
- **WHEN** el cliente intenta modificar una colección que no está habilitada para escritura desde escritorio
- **THEN** la solicitud se rechaza antes de enviarse a PocketBase local

#### Scenario: Copia inicial de datos administrativos de referencia
- **WHEN** la activación crea o actualiza `mutuales` con origen identificado como servidor central
- **THEN** la solicitud se permite para completar la copia inicial local
- **AND** conserva la cabecera que identifica el origen central

#### Scenario: Protección administrativa fuera de la copia inicial
- **WHEN** una solicitud intenta modificar `mutuales` sin el origen central exacto o modificar directamente `system_settings`
- **THEN** se rechaza antes de enviarse a PocketBase local
- **AND** las eliminaciones y las demás colecciones administrativas continúan bloqueadas aun cuando incluyan esa cabecera

### Requirement: Copia privilegiada confinada de configuración local
El sistema SHALL conservar las reglas administrativas de `system_settings` y realizar su copia inicial mediante una operación privilegiada limitada al proceso principal de Electron.

#### Scenario: Upsert de configuración proveniente del bootstrap
- **WHEN** la activación copia un registro de `system_settings` descargado desde el servidor central autenticado
- **THEN** el proceso principal crea o actualiza ese registro con el superusuario técnico local
- **AND** el renderer recibe sólo la confirmación de la operación

#### Scenario: Entrada confinada de configuración
- **WHEN** el renderer solicita copiar un ajuste local
- **THEN** el canal acepta únicamente un ID PocketBase válido, una clave no vacía dentro del límite del esquema y un valor JSON acotado
- **AND** usa la colección fija `system_settings` y una operación fija de upsert
- **AND** no acepta colecciones, rutas, métodos ni credenciales proporcionados por el renderer

#### Scenario: Uso offline ordinario
- **WHEN** un usuario intenta modificar `system_settings` fuera de la copia inicial
- **THEN** PocketBase local continúa exigiendo superusuario
- **AND** el filtro de alcance de escritorio continúa bloqueando la escritura normal

### Requirement: Reintento idempotente de usuarios locales
El sistema SHALL reconocer usuarios adicionales ya copiados aunque las reglas de la colección local impidan que el usuario activo los consulte directamente.

#### Scenario: Usuario adicional existente y no visible
- **WHEN** la activación se repite y un usuario adicional ya existe con el mismo identificador local
- **THEN** el proceso principal comprueba su existencia con el superusuario técnico local
- **AND** la copia continúa sin intentar crear nuevamente el email existente

#### Scenario: Canal privilegiado confinado
- **WHEN** el renderer consulta la existencia de un usuario local
- **THEN** sólo puede enviar un identificador PocketBase válido para la colección fija `users`
- **AND** recibe únicamente un valor booleano
- **AND** las credenciales y el token del superusuario no se exponen al renderer

#### Scenario: Identificador local inválido
- **WHEN** el renderer solicita comprobar un identificador vacío, malformado o fuera del formato PocketBase
- **THEN** el proceso principal rechaza la solicitud antes de consultar la base local
