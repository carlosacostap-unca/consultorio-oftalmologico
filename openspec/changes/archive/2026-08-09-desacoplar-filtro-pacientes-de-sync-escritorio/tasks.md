## 1. Contrato de filtros

- [x] 1.1 Limitar `ACTIVE_PATIENT_FILTER` a campos del esquema web base y conservar la exclusión de pacientes fusionados.
- [x] 1.2 Definir separadamente el filtro que excluye `sync_deleted` para consumidores con esquema de escritorio instalado.

## 2. Cobertura y verificación local

- [x] 2.1 Agregar pruebas focalizadas que distingan el filtro web del filtro específico de escritorio.
- [x] 2.2 Ejecutar pruebas focalizadas, lint, TypeScript y build de Next.js sin errores ni advertencias.
- [x] 2.3 Ejecutar `openspec validate --all --strict` y confirmar que no existen migraciones, dependencias ni cambios de datos.

## 3. Publicación y recuperación productiva

- [x] 3.1 Publicar el hotfix mediante PR aprobado y verificar el SHA desplegado en Dokploy.
- [x] 3.2 Confirmar mediante GET de sólo lectura que `/api/pacientes/documento` y `/api/pacientes/ficha` responden correctamente, y completar la verificación pendiente de `corregir-validacion-dni-alta-paciente`.
