## Context

Los scripts destructivos o de preparación de testing comparten `assertTestingPocketBaseUrl`. La función bloquea el dominio productivo conocido y exige que la URL contenga un marcador no productivo, pero actualmente omite `staging`. La instancia elegida para el piloto de escritorio se denomina `pb-staging-consultorio-oftalmologico.acostaparra.com`.

## Goals / Non-Goals

**Goals:**

- Permitir dominios que contengan el marcador inequívoco `staging`.
- Conservar precedencia del bloqueo explícito de hosts productivos.
- Verificar el comportamiento con pruebas unitarias sin conexiones remotas.

**Non-Goals:**

- Inferir automáticamente si cualquier servidor remoto es seguro.
- Modificar credenciales, datos o esquemas PocketBase.
- Eliminar el override deliberado existente.

## Decisions

- Se agregará `staging` a los marcadores aceptados por la guarda compartida. Centralizarlo allí cubre bootstrap, seeds y runner de Playwright sin duplicar reglas.
- El host productivo conocido seguirá evaluándose antes de aceptar marcadores no productivos. No se usará `ALLOW_PRODUCTION_PB_FOR_TESTS` para el flujo normal de staging.
- Las pruebas usarán URLs sintéticas y comprobarán staging, testing, producción y un dominio sin marcador.

## Risks / Trade-offs

- [Un dominio ajeno podría contener la palabra `staging`] → La guarda es una defensa contra errores operativos, no una verificación de identidad; se mantienen credenciales separadas y el bloqueo explícito de producción.
- [Un futuro dominio productivo podría incluir `staging`] → Los hosts productivos deben agregarse a `PRODUCTION_HOST_MARKERS` y tienen precedencia.
