## Why

La secretaria ya puede crear y corregir pacientes desde Gestion de Turnos, pero todavia no recibe ayuda para detectar registros posiblemente duplicados antes de guardar. Advertir coincidencias tempranas mejora la calidad de datos sin entrar aun en un flujo delicado de fusion de pacientes.

## What Changes

- Mostrar advertencias de posibles pacientes duplicados durante el alta rapida de paciente en turnos.
- Mostrar advertencias de posibles duplicados en la ficha rapida al editar documento, telefono, ficha o nombre/apellido.
- Considerar coincidencias por mismo DNI/documento, mismo telefono, mismo numero de ficha y nombre/apellido parecido.
- Mostrar datos utiles de cada coincidencia: paciente, documento, telefono, ficha y obra social.
- Ofrecer acceso a la ficha completa del posible duplicado.
- No bloquear el guardado salvo las validaciones ya existentes; esta mejora solo advierte.

## Capabilities

### New Capabilities

### Modified Capabilities

- `patient-management`: el sistema advierte posibles duplicados al crear o corregir pacientes desde contextos operativos.
- `secretary-appointment-assignment`: la secretaria ve advertencias de duplicados en alta rapida y ficha rapida dentro de Gestion de Turnos.

## Impact

- UI principal: `app/turnos/page.tsx`.
- Datos: consulta la coleccion existente `pacientes`.
- Pruebas: `tests/playwright/consultorio.spec.ts`.
- No requiere cambios de esquema ni migracion PocketBase.
