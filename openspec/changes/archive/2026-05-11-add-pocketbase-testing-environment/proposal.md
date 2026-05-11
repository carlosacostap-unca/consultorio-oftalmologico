## Why

Las pruebas automatizadas crean, actualizan y eliminan datos de PocketBase. Para evitar tocar datos reales, el proyecto necesita un entorno de testing separado y scripts que fallen si apuntan accidentalmente a produccion.

## What Changes

- Agregar soporte para `.env.test.local` en Playwright y scripts de seed.
- Agregar guardas anti-produccion para comandos de testing.
- Documentar como configurar una instancia PocketBase de testing en VPS.
- Mantener `.env.local` para desarrollo manual.
- No crear ni modificar la instancia remota desde el repositorio.

## Capabilities

### New Capabilities

### Modified Capabilities
- `data-import-and-migration`: Los seeds de datos demo deberan poder ejecutarse contra un entorno de testing separado.
- `appointment-scheduling`: Las pruebas Playwright de turnos deberan ejecutarse contra PocketBase de testing cuando se use el script de testing.

## Impact

- Afecta `package.json`, `playwright.config.ts`, `tests/playwright/consultorio.spec.ts` y scripts bajo `scripts/`.
- Agrega documentacion de configuracion de testing.
- No requiere cambios de esquema PocketBase.
