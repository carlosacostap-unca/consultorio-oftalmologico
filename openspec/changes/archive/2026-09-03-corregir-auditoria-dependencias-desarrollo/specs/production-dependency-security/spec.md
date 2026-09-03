## MODIFIED Requirements

### Requirement: Auditoría separada de herramientas de desarrollo
El proyecto MUST auditar también el árbol completo y resolver los hallazgos altos o críticos cuando exista una actualización compatible sin ruptura. La resolución corregida MUST quedar registrada en el lockfile y reproducirse mediante una instalación limpia antes de autorizar una promoción.

#### Scenario: Hallazgo exclusivo de desarrollo con corrección compatible
- **WHEN** `npm audit` identifica una vulnerabilidad alta o crítica fuera del runtime
- **THEN** se actualiza la dependencia directa o transitiva dentro de un rango compatible
- **AND** la resolución corregida queda registrada en el lockfile
- **AND** `npm ci` reproduce el árbol actualizado desde cero
- **AND** se repiten las verificaciones de build, pruebas y empaquetado afectadas

#### Scenario: Hallazgo sin corrección compatible
- **WHEN** la auditoría completa conserva un hallazgo que sólo puede corregirse mediante una versión mayor incompatible o `--force`
- **THEN** no se fuerza la actualización
- **AND** se documentan el paquete, el camino transitivo, la exposición y la decisión de release
