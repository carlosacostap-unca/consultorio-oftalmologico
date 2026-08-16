## Design

Se incorporara un script operacional `scripts/backfill_consulta_eventos.mjs` con dos modos:

- Dry-run por defecto: lista consultas sin eventos y genera reporte JSON.
- Apply con confirmacion explicita: crea un evento `created` retroactivo por cada consulta sin auditoria.

El script aceptara `--since=<fecha>` para acotar el universo. El caso actual se diagnosticara desde `2026-06-17`, porque antes de esa fecha existen eventos y no conviene mezclar esta reparacion con historicos/importaciones.

Los eventos retroactivos usaran:

- `consulta_id`: consulta encontrada.
- `paciente_id`: paciente de la consulta.
- `actor_id`: medico asignado si existe.
- `actor_nombre`: nombre/email del medico asignado o texto de sistema.
- `tipo`: `created`.
- `titulo`: `Consulta registrada en auditoria`.
- `detalle`: texto que indique reparacion retroactiva.
- `metadata`: `backfill: true`, fecha original, estado, medico y motivo.

El script no eliminara ni modificara consultas existentes.
