## Why

La aplicacion ya advierte posibles pacientes duplicados durante el trabajo operativo, pero todavia no existe un proceso seguro para resolverlos. Es importante hacerlo ahora porque la fusion de pacientes afecta turnos, consultas, recetas e historia clinica, y necesita una experiencia controlada con revision humana.

## What Changes

- Agregar un flujo administrativo para revisar posibles pacientes duplicados desde la gestion de pacientes.
- Permitir comparar dos pacientes lado a lado con datos administrativos, cantidad de turnos, consultas y recetas asociadas.
- Permitir elegir un paciente principal y un paciente duplicado antes de fusionar.
- Reasignar al paciente principal los registros relacionados del duplicado: turnos, consultas y recetas.
- Marcar el paciente duplicado como fusionado o archivado en lugar de eliminarlo fisicamente de entrada.
- Registrar una confirmacion explicita antes de ejecutar la fusion.
- Evitar que pacientes fusionados/archivados se usen en busquedas operativas normales, manteniendo trazabilidad de lo ocurrido.

## Capabilities

### New Capabilities

- `patient-duplicate-management`: cubre la revision, comparacion, fusion controlada y trazabilidad de pacientes duplicados.

### Modified Capabilities

- `patient-management`: la gestion de pacientes incorpora acceso al flujo de duplicados y oculta pacientes fusionados en usos normales.
- `secretary-appointment-assignment`: la seleccion operativa de pacientes evita elegir registros ya fusionados/archivados.
- `clinical-consultations`: las consultas quedan reasignadas al paciente principal luego de una fusion.
- `prescriptions`: las recetas quedan reasignadas al paciente principal luego de una fusion.
- `appointment-scheduling`: los turnos quedan reasignados al paciente principal luego de una fusion.

## Impact

- UI: nuevas vistas o secciones en `app/pacientes` para revisar duplicados y ejecutar fusion.
- APIs: nuevo endpoint server-side para ejecutar fusion de forma atomica o transaccional por pasos seguros.
- Datos PocketBase: probablemente requiere campos en `pacientes` para estado de fusion, paciente principal y auditoria minima.
- Colecciones relacionadas: actualizacion de referencias `paciente_id` en `turnos`, `consultas` y `recetas`.
- Permisos: la accion de fusion debe quedar limitada a usuarios admin o a un permiso especifico de gestion de pacientes.
- Pruebas: cobertura Playwright para revisar candidatos y ejecutar una fusion en entorno de testing.
