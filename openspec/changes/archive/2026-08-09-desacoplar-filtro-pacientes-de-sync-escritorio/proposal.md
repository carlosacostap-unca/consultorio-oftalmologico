## Why

Los flujos web de pacientes en producción responden HTTP 400 porque su filtro general referencia `sync_deleted`, un campo exclusivo del esquema de sincronización de escritorio que no existe ni debe ser requisito cuando esa capacidad está deshabilitada. Esto bloquea la validación de DNI, el cálculo de ficha y puede afectar búsquedas clínicas aunque las credenciales y los campos web vigentes sean correctos.

## What Changes

- Hacer que el filtro web de pacientes activos dependa únicamente de campos del esquema productivo base.
- Mantener fuera de los resultados a pacientes fusionados mediante `estado_registro`.
- Separar explícitamente el criterio de baja lógica de escritorio para que sólo se utilice en contextos cuyo esquema de sincronización esté instalado.
- Agregar cobertura que impida reintroducir campos opcionales de escritorio en consultas web comunes.
- Verificar en producción, mediante lecturas, la validación de DNI y el cálculo de siguiente ficha.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `patient-management`: los listados, búsquedas y validaciones web de pacientes activos deberán funcionar sin depender del esquema opcional de sincronización de escritorio.

## Impact

- Afecta el contrato de filtros compartidos en `lib/patient-merge.ts` y sus consumidores web y server-side.
- Puede requerir un filtro separado para el runtime de escritorio, sin habilitarlo ni completar su implementación pendiente.
- No modifica APIs públicas, dependencias, registros, scripts de importación ni el esquema de PocketBase.
