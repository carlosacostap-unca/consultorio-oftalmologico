## Context

El proyecto ya tiene pruebas Playwright y seeds demo, pero ambos leen `.env.local`. Como los tests escriben datos en `turnos` y `pacientes`, deben correr contra una instancia PocketBase aislada.

## Goals / Non-Goals

**Goals:**
- Separar configuracion local/manual de configuracion de testing.
- Hacer que los scripts de testing usen `.env.test.local`.
- Evitar ejecuciones destructivas contra una URL de produccion.
- Documentar el proceso para conectar una instancia PocketBase test en VPS.

**Non-Goals:**
- No automatizar provisioning del VPS.
- No copiar datos reales a testing.
- No cambiar colecciones ni reglas PocketBase desde este cambio.

## Decisions

- Usar `.env.test.local` como archivo canonico para pruebas automatizadas.
- Cargar el archivo indicado por `PLAYWRIGHT_ENV_FILE` desde `playwright.config.ts` antes de iniciar Next.
- Agregar scripts Node pequeños para correr Playwright y seeds con variables de entorno controladas.
- Requerir que las URLs de testing parezcan no productivas, salvo override explicito `ALLOW_PRODUCTION_PB_FOR_TESTS=true`.

## Risks / Trade-offs

- [Risk] Los tests no correran hasta que exista `.env.test.local`. -> Mitigacion: documentar el archivo y entregar `.env.test.local.example`.
- [Risk] La heuristica anti-produccion puede bloquear una URL valida con nombre no obvio. -> Mitigacion: permitir override explicito, visible y deliberado.
- [Risk] La instancia test puede divergir del esquema productivo. -> Mitigacion: documentar que debe tener las mismas colecciones/reglas antes de seed.
