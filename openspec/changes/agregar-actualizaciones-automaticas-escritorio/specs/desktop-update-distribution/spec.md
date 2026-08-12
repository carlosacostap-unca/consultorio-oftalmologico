## ADDED Requirements

### Requirement: Publicación explícita y reproducible
El sistema MUST publicar una versión de escritorio únicamente desde una etiqueta `desktop-v<semver>` asociada a un commit integrado en `main` y después de superar todas las verificaciones requeridas.

#### Scenario: Etiqueta de escritorio válida
- **WHEN** se crea una etiqueta de escritorio con versión superior sobre un commit de `main`
- **THEN** CI instala dependencias desde el lockfile, audita, valida, prueba, compila y genera el instalador NSIS
- **AND** publica juntos el instalador, los metadatos de Electron Updater, el manifiesto firmado y sus checksums en el canal piloto

#### Scenario: Despliegue web ordinario
- **WHEN** Dokploy despliega un cambio web sin una nueva etiqueta de escritorio
- **THEN** el sistema no genera ni publica automáticamente una versión de escritorio

#### Scenario: Verificación bloqueante fallida
- **WHEN** falla una auditoría, prueba, build, firma o comprobación de artefactos
- **THEN** el flujo no modifica el manifiesto vigente de ningún canal
- **AND** las instalaciones existentes continúan recibiendo la última versión válida

### Requirement: Distribución privada autorizada
El sistema SHALL conservar los artefactos en almacenamiento privado y SHALL autorizar cada consulta y descarga mediante el servidor central sin entregar credenciales de iDrive e2 a la aplicación de escritorio.

#### Scenario: Equipo activado solicita el feed
- **WHEN** un equipo activado presenta sesión central e identidad válidas al endpoint de actualización
- **THEN** el servidor determina su canal autoritativo
- **AND** entrega los metadatos correspondientes sin revelar claves S3

#### Scenario: Descargar artefacto autorizado
- **WHEN** un equipo autorizado solicita un artefacto perteneciente al manifiesto de su canal
- **THEN** el servidor genera una URL prefirmada de corta duración para ese objeto exacto
- **AND** evita transportar el cuerpo completo del instalador a través de Dokploy

#### Scenario: Equipo revocado o identidad inconsistente
- **WHEN** un equipo inactivo, revocado o con identidad distinta solicita metadatos o artefactos
- **THEN** el servidor rechaza la solicitud sin generar una URL de descarga
- **AND** registra el motivo técnico sin credenciales ni información clínica

#### Scenario: Migrar un registro de equipo legacy
- **WHEN** `sync_devices` conserva campos legacy obligatorios y se prepara la habilitación de actualizaciones
- **THEN** el sistema agrega y completa idempotentemente los campos actuales sin eliminar los anteriores ni recrear la identidad del equipo
- **AND** activación, búsqueda y contacto aceptan ambos formatos durante la transición
- **AND** los índices únicos nuevos se crean después de verificar el backfill técnico
- **AND** no modifica registros de pacientes, consultas ni recetas

### Requirement: Canales piloto y estable
El sistema SHALL asignar de manera determinista cada equipo a `pilot` o `stable` y MUST promover a estable exactamente los artefactos ya verificados en piloto.

#### Scenario: Publicar una nueva versión
- **WHEN** una versión supera el flujo de publicación
- **THEN** queda disponible primero sólo para los equipos asignados a `pilot`
- **AND** los equipos `stable` conservan su manifiesto anterior

#### Scenario: Promoción manual aprobada
- **WHEN** la versión piloto fue validada y se aprueba su promoción
- **THEN** el canal `stable` referencia los mismos hashes y artefactos probados
- **AND** no recompila ni sustituye silenciosamente el instalador

#### Scenario: Detener una versión defectuosa
- **WHEN** se detecta una regresión antes de promover
- **THEN** el sistema mantiene `stable` en la versión anterior
- **AND** exige un número de versión superior para publicar la corrección a equipos que ya instalaron la versión defectuosa

### Requirement: Integridad criptográfica del release
La aplicación de escritorio MUST instalar únicamente artefactos cuyo manifiesto, versión, plataforma, arquitectura y hash coincidan con una firma Ed25519 verificada mediante una clave pública incorporada.

#### Scenario: Release íntegro
- **WHEN** termina la descarga de una actualización
- **THEN** la aplicación valida la firma del manifiesto y el SHA-512 del instalador
- **AND** habilita la instalación sólo si ambas verificaciones y el checksum estándar del updater coinciden

#### Scenario: Firma o hash inválido
- **WHEN** el manifiesto no tiene una firma válida o el artefacto no coincide con su hash
- **THEN** la aplicación descarta la actualización y no ejecuta el instalador
- **AND** conserva operativa la versión instalada y registra un diagnóstico sanitizado

#### Scenario: Custodia de claves
- **WHEN** CI firma una versión y Dokploy atiende una descarga
- **THEN** la clave privada de firma permanece sólo en el entorno aprobado de publicación
- **AND** las credenciales S3 de escritura, lectura y la clave pública de verificación conservan alcances separados

### Requirement: Política normal y obligatoria
El servidor SHALL informar si una actualización es normal u obligatoria y SHALL mantener una versión mínima compatible sin interrumpir una sesión clínica en curso.

#### Scenario: Actualización normal disponible
- **WHEN** el equipo consulta y existe una versión normal superior en su canal
- **THEN** puede descargarla y posponer su instalación
- **AND** la aplicación vuelve a recordarla sin cerrar el trabajo actual

#### Scenario: Actualización obligatoria descargada
- **WHEN** una actualización obligatoria ya fue descargada y validada
- **THEN** la aplicación permite finalizar la sesión actual
- **AND** exige instalarla en el siguiente inicio limpio antes de habilitar el trabajo normal

#### Scenario: Actualización obligatoria sin conectividad
- **WHEN** el equipo no pudo descargar una versión obligatoria por falta de red
- **THEN** la aplicación conserva el acceso a la copia local con una advertencia persistente
- **AND** el servidor rechaza una sincronización sólo si la versión instalada es incompatible, sin borrar operaciones pendientes

### Requirement: Observabilidad sin contenido clínico
El sistema SHALL registrar el estado de publicación y actualización por versión y equipo sin almacenar secretos ni cuerpos clínicos.

#### Scenario: Equipo informa resultado
- **WHEN** un equipo consulta, descarga, instala o rechaza una versión
- **THEN** el servidor registra equipo, versión, canal, etapa, fecha y código de resultado
- **AND** excluye tokens, URLs prefirmadas completas y datos de pacientes, consultas o recetas
