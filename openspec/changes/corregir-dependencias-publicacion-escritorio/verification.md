# Evidencia de validación — 20/09/2026

- El workflow de 0.1.12, ejecución 35509947189, se detuvo en la auditoría antes de publicar artefactos.
- Dependencias corregidas: next/eslint-config-next 16.3.5, sharp 0.35.4, js-yaml 4.3.2.
- Instalación limpia `npm ci`: 699 paquetes instalados correctamente en el worktree aislado.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- `npm audit --audit-level=high`: aprobado; queda un hallazgo bajo de desarrollo en Joi 18.2.4, fuera del runtime y del umbral bloqueante. No se amplió el cambio a herramientas no afectadas por la publicación.
- `npm run test:sync-core`: 171/171 aprobadas.
- `npm run build`: aprobado con Next.js 16.3.5, incluyendo TypeScript.
- `npm run lint`: aprobado sin advertencias.
- Validación estricta del cambio OpenSpec: aprobada.
- El proceso de publicación sigue usando los workflows existentes, sin saltar auditorías ni extraer secretos.

Referencias de las correcciones:
- https://github.com/advisories/GHSA-p293-qw3h-jr36
- https://github.com/advisories/GHSA-2xp9-vwfh-vxw4
- https://github.com/advisories/GHSA-2883-xcg3-v3hh
- https://github.com/advisories/GHSA-rgj7-g3m4-5g8c
