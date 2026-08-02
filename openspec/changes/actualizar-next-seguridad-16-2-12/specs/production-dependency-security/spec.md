## ADDED Requirements

### Requirement: Umbral de seguridad para dependencias de producción
El proceso de release MUST impedir la publicación cuando las dependencias incluidas en el runtime reporten vulnerabilidades de severidad alta o crítica.

#### Scenario: Auditoría bloqueante antes del release
- **WHEN** se prepara un build web o instalador de escritorio para producción
- **THEN** se ejecuta una auditoría que excluye dependencias exclusivas de desarrollo
- **AND** el release continúa únicamente si no existen vulnerabilidades altas o críticas en ese conjunto

#### Scenario: Vulnerabilidad con versión corregida disponible
- **WHEN** la auditoría identifica una vulnerabilidad alta o crítica con una versión de parche corregida
- **THEN** la dependencia afectada y su lockfile se actualizan antes de generar el artefacto final

### Requirement: Resolución reproducible del runtime seguro
El sistema SHALL fijar versiones compatibles y conservar un lockfile que permita reconstruir el mismo árbol de dependencias mediante `npm ci`.

#### Scenario: Actualización del framework a la última versión estable
- **WHEN** se verifica la versión estable más reciente de Next.js
- **THEN** `next` y `eslint-config-next` quedan alineados en `16.2.12`
- **AND** React permanece en una versión admitida por sus peer dependencies

#### Scenario: Actualización segura y compatible de Next.js
- **WHEN** se corrigen las vulnerabilidades detectadas en `next@16.2.6`
- **THEN** las alertas directas del framework se corrigen mediante la última versión estable
- **AND** PostCSS y Sharp se resuelven dentro de rangos declarados compatibles sin usar versiones canary ni overrides incompatibles
- **AND** el instalador permanece bloqueado mientras las dependencias transitivas incumplan el umbral de producción

#### Scenario: Instalación desde cero
- **WHEN** el release se instala desde el lockfile en un worktree limpio
- **THEN** `npm ci` termina correctamente sin depender de junctions hacia otro repositorio
- **AND** el árbol instalado supera la auditoría de producción

### Requirement: Compatibilidad funcional del release
La actualización de seguridad MUST conservar el comportamiento clínico, las APIs, la autorización y la persistencia existentes.

#### Scenario: Verificación previa al empaquetado
- **WHEN** finaliza la actualización de dependencias
- **THEN** las pruebas focalizadas, TypeScript, ESLint sobre los archivos afectados y el build de producción terminan correctamente
- **AND** los errores preexistentes del lint completo se documentan por separado sin atribuirlos a la actualización
- **AND** no se requieren cambios de esquema ni migraciones de datos

#### Scenario: Instalador de escritorio regenerado
- **WHEN** se genera el instalador NSIS desde la versión corregida
- **THEN** incluye el servidor standalone, PocketBase y los archivos vigentes del proceso principal de Electron
- **AND** puede iniciar sus servicios locales sin incorporar URLs de staging
