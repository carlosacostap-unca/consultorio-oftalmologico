## Why

La instancia segura destinada a las pruebas de la aplicación de escritorio usa el marcador `staging` en su dominio, pero las guardas actuales solo reconocen `test`, `testing` o direcciones locales. Esto bloquea la preparación segura del esquema y empuja a usar un override que también permitiría producción.

## What Changes

- Reconocer `staging` como marcador válido de un destino no productivo en las guardas de scripts de testing.
- Mantener el rechazo explícito del dominio conocido de producción, aun si otro fragmento de la URL pareciera no productivo.
- Cubrir con pruebas los casos de staging permitido, producción rechazada y dominios ambiguos rechazados.
- Actualizar la documentación del entorno de pruebas para incluir instancias de staging.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pocketbase-test-schema-bootstrap`: ampliar los destinos seguros reconocidos para incluir staging sin habilitar producción.

## Impact

- `scripts/env_utils.mjs` y los comandos que invocan `assertTestingPocketBaseUrl`.
- Pruebas unitarias de las guardas de entorno.
- `docs/testing-pocketbase.md`.
- No requiere migración de datos ni cambios de esquema PocketBase por sí mismo.
