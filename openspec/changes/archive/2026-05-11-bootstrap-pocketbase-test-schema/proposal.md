## Why

La instancia PocketBase de testing ya esta disponible, pero el seed de agenda falla porque faltan colecciones clinicas como `pacientes`. Para que las pruebas automatizadas sean reproducibles, el entorno test debe poder inicializar su esquema sin copiar datos reales.

## What Changes

- Agregar un script de bootstrap que copie definiciones de colecciones desde una instancia fuente hacia PocketBase test.
- Exigir guardas anti-produccion en la instancia destino antes de crear o actualizar colecciones.
- Limitar el bootstrap a esquema, reglas e indices; no copiar registros clinicos.
- Documentar el flujo: inicializar esquema, correr seeds y ejecutar Playwright.

## Capabilities

### New Capabilities

- `pocketbase-test-schema-bootstrap`: Inicializacion controlada del esquema PocketBase de testing para soportar seeds y pruebas E2E.

### Modified Capabilities

- `data-import-and-migration`: El entorno de testing incorpora un paso reproducible de preparacion de esquema antes de sembrar datos demo.

## Impact

- Scripts bajo `scripts/`.
- Documentacion de testing PocketBase.
- Instancia PocketBase de testing definida por `.env.test.local`.
- Lectura de una instancia fuente para obtener definiciones de colecciones, sin copiar datos reales.
