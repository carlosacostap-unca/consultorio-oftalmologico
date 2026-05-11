## Why

La carga de AV, PIO y refraccion es repetitiva y central en una consulta oftalmologica. Aunque los campos ya existen, la disposicion actual no ayuda a comparar OD/OI ni lejos/cerca con rapidez durante la atencion.

## What Changes

- Reorganizar AV y PIO en bloques compactos por ojo.
- Reorganizar refraccion como grillas claras para lejos y cerca.
- Mantener ADD visible entre lejos y cerca y conservar el calculo actual.
- Agregar ayudas visuales y placeholders para ESF, CIL y EJE.
- No cambiar nombres de campos, persistencia ni esquema PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: Mejora la carga del examen oftalmologico estructurado dentro de la nueva consulta.

## Impact

- UI de `app/consultas/nueva/page.tsx`.
- Prueba Playwright del flujo medico desde turno.
- Especificacion OpenSpec `clinical-consultations`.
- Sin migraciones de datos.
