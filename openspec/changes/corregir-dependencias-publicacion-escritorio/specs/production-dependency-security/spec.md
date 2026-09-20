## MODIFIED Requirements

### Requirement: Resolución reproducible del runtime seguro
El sistema SHALL fijar versiones compatibles y conservar un lockfile que permita reconstruir el mismo árbol de dependencias mediante `npm ci`.

#### Scenario: Actualización del framework a la última versión estable
- **WHEN** se implementa este cambio de seguridad
- **THEN** `next` y `eslint-config-next` quedan alineados en `16.3.5`
- **AND** React permanece en una versión admitida por sus peer dependencies

#### Scenario: Resolución corregida de transitivas
- **WHEN** npm regenera el árbol desde las dependencias declaradas
- **THEN** PostCSS se resuelve en `8.5.23` o posterior
- **AND** Sharp se resuelve en `0.35.4` o posterior
- **AND** js-yaml se resuelve en `4.3.2` o posterior dentro de la serie compatible
- **AND** NanoID se resuelve en una versión posterior a `3.3.16`
- **AND** no se usan versiones canary ni overrides incompatibles

#### Scenario: Instalación desde cero
- **WHEN** el release se instala desde el lockfile en un worktree limpio
- **THEN** `npm ci` termina correctamente sin depender de junctions hacia otro repositorio
- **AND** el árbol instalado supera la auditoría de producción
