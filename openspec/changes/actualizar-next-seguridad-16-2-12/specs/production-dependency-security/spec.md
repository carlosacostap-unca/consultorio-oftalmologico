## ADDED Requirements

### Requirement: Umbral de seguridad para dependencias de producción
El proceso de release MUST impedir la publicación cuando las dependencias incluidas en el runtime reporten vulnerabilidades de severidad alta o crítica.

#### Scenario: Auditoría bloqueante antes del release
- **WHEN** se prepara un build web o instalador de escritorio para producción
- **THEN** se ejecuta `npm audit --omit=dev`
- **AND** el release continúa únicamente si no existen vulnerabilidades altas o críticas

#### Scenario: Vulnerabilidad con versión corregida disponible
- **WHEN** la auditoría identifica una vulnerabilidad alta o crítica con una versión corregida compatible
- **THEN** la dependencia afectada y su lockfile se actualizan antes de generar el artefacto final

### Requirement: Auditoría separada de herramientas de desarrollo
El proyecto MUST auditar también el árbol completo y resolver los hallazgos altos o críticos cuando exista una actualización compatible sin ruptura.

#### Scenario: Hallazgo exclusivo de desarrollo con corrección compatible
- **WHEN** `npm audit` identifica una vulnerabilidad alta o crítica fuera del runtime
- **THEN** se actualiza la dependencia directa o transitiva dentro de un rango compatible
- **AND** se repiten las verificaciones de build, pruebas y empaquetado afectadas

#### Scenario: Hallazgo sin corrección compatible
- **WHEN** la auditoría completa conserva un hallazgo que sólo puede corregirse mediante una versión mayor incompatible o `--force`
- **THEN** no se fuerza la actualización
- **AND** se documentan el paquete, el camino transitivo, la exposición y la decisión de release

### Requirement: Resolución reproducible del runtime seguro
El sistema SHALL fijar versiones compatibles y conservar un lockfile que permita reconstruir el mismo árbol de dependencias mediante `npm ci`.

#### Scenario: Actualización del framework a la última versión estable
- **WHEN** se implementa este cambio de seguridad
- **THEN** `next` y `eslint-config-next` quedan alineados en `16.3.0`
- **AND** React permanece en una versión admitida por sus peer dependencies

#### Scenario: Resolución corregida de transitivas
- **WHEN** npm regenera el árbol desde las dependencias declaradas
- **THEN** PostCSS se resuelve en `8.5.23` o posterior
- **AND** Sharp se resuelve en `0.35.3` o posterior
- **AND** NanoID se resuelve en una versión posterior a `3.3.16`
- **AND** no se usan versiones canary ni overrides incompatibles

#### Scenario: Instalación desde cero
- **WHEN** el release se instala desde el lockfile en un worktree limpio
- **THEN** `npm ci` termina correctamente sin depender de junctions hacia otro repositorio
- **AND** el árbol instalado supera la auditoría de producción

### Requirement: Compatibilidad funcional del release
La actualización de dependencias MUST conservar el comportamiento clínico, las APIs, la autorización y la persistencia existentes.

#### Scenario: Verificación previa al empaquetado
- **WHEN** finaliza la actualización de dependencias
- **THEN** las pruebas focalizadas, TypeScript y el build de producción terminan correctamente
- **AND** el lint completo no agrega hallazgos respecto del baseline documentado
- **AND** no se requieren cambios de esquema ni migraciones de datos

#### Scenario: Instalador de escritorio regenerado
- **WHEN** se genera el instalador NSIS desde la versión corregida
- **THEN** incluye el servidor standalone, PocketBase y los archivos vigentes del proceso principal de Electron
- **AND** puede iniciar sus servicios locales sin incorporar URLs de staging
