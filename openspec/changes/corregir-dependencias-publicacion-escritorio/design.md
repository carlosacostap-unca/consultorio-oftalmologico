## Context

El workflow desktop-release bloqueó 0.1.12 antes de compilar o subir artefactos. La firma Ed25519 y el canal privado ya existen. El cambio de tipografía está integrado; falta reconstruir con dependencias corregidas.

## Goals / Non-Goals

**Goals:** superar la auditoría de producción con versiones compatibles, mantener la reproducción mediante npm ci y entregar 0.1.13 por el mecanismo vigente.

**Non-Goals:** cambiar autorización, datos clínicos, esquemas, impresión o las reglas de aprobación y firma.

## Decisions

- Fijar next y eslint-config-next en 16.3.5, parche estable de la misma serie. La auditoría identifica correcciones desde 16.3.3; se usa el parche estable sugerido por npm.
- Actualizar js-yaml a 4.3.2 o posterior y sharp a 0.35.4 o posterior dentro de sus rangos compatibles. Revisar el diff del lockfile y evitar npm audit fix --force.
- Usar 0.1.13 porque 0.1.12 ya tiene etiqueta y un instalador manual; no reescribir su identidad.
- Reutilizar workflows existentes para firma y distribución. No exportar claves privadas ni credenciales de GitHub.

## Risks / Trade-offs

- Cambios transitivos pueden causar regresiones → instalación limpia, auditorías, pruebas, lint y build; el workflow recompila y empaqueta desde el mismo lockfile.
- La configuración productiva está deshabilitada → el usuario habilita Dokploy y se verifica el endpoint antes de anunciar disponibilidad.
- La promoción estable exige revisión configurada en GitHub → mantener esa barrera y entregar el enlace concreto si requiere intervención.

## Migration Plan

Integrar el lockfile y versión corregidos, crear desktop-v0.1.13, verificar la publicación piloto firmada y promover el mismo artefacto a estable siguiendo el proceso existente. La recuperación se realiza con una versión superior; no se fuerza downgrade ni se borra información local.
