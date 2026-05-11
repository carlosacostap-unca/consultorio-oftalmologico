## Context

La aplicacion ya detecta posibles duplicados en alta rapida y ficha rapida, pero solo como advertencia. Los registros clinicos y operativos usan `paciente_id` en varias colecciones (`turnos`, `consultas`, `recetas`), por lo que resolver duplicados implica reasignar referencias sin perder trazabilidad.

La fusion debe ser una accion administrativa, deliberada y reversible en terminos de auditoria: no debe borrar fisicamente la ficha duplicada en el primer paso. Tambien debe convivir con la busqueda operativa de pacientes para que secretaria y medicos no sigan eligiendo registros fusionados.

## Goals / Non-Goals

**Goals:**

- Permitir revisar candidatos duplicados desde una pantalla administrativa.
- Comparar dos pacientes lado a lado antes de fusionar.
- Elegir paciente principal y paciente duplicado con confirmacion explicita.
- Reasignar `turnos`, `consultas` y `recetas` al paciente principal.
- Marcar el paciente duplicado como fusionado/archivado y conservar trazabilidad.
- Ocultar pacientes fusionados en busquedas operativas normales.
- Cubrir el flujo con Playwright contra PocketBase de testing.

**Non-Goals:**

- No hacer fusion automatica sin revision humana.
- No fusionar campos clinicos complejos de manera inteligente en esta etapa.
- No borrar fisicamente pacientes duplicados.
- No resolver duplicados masivos en lote.
- No modificar historiales de auditoria ya existentes fuera de la reasignacion de referencias.

## Decisions

- **Endpoint server-side para fusion.** La fusion se ejecutara desde un endpoint protegido, no desde el cliente, para validar permisos, evitar operaciones parciales desde la UI y centralizar la logica de reasignacion.

- **Archivado en `pacientes`.** Se agregaran campos administrativos al paciente duplicado, por ejemplo `fusionado_en_paciente_id`, `fusionado_at`, `fusionado_por`, `fusion_motivo` y/o `estado_registro`. Esto conserva la ficha original y permite auditar que fue absorbida por otra.

- **Reasignacion por coleccion relacionada.** El endpoint actualizara todos los registros de `turnos`, `consultas` y `recetas` donde `paciente_id` sea el duplicado. La operacion informara conteos por coleccion.

- **Sin merge automatico de datos personales.** El paciente principal conserva sus datos. La pantalla de comparacion permite que el admin revise y, si hace falta, edite manualmente la ficha principal antes o despues de fusionar.

- **Busqueda operativa excluye fusionados.** Las pantallas de seleccion de paciente filtraran registros fusionados/archivados. La ficha del paciente fusionado seguira accesible por URL o desde la trazabilidad.

- **Permiso restringido.** La primera version usara rol activo `admin` para fusionar. Si luego se necesita delegar, se puede extraer a un permiso operativo especifico.

## Risks / Trade-offs

- **Operacion parcial por error de red** -> El endpoint debe actualizar colecciones en orden controlado y devolver conteos; si falla, debe informar en que paso ocurrio para revision manual.
- **Campos PocketBase ausentes** -> La implementacion debe incluir bootstrap/schema para testing y documentar los campos necesarios para produccion.
- **Falsos positivos** -> La fusion requiere seleccion y confirmacion explicita; las sugerencias no ejecutan cambios por si solas.
- **Paciente duplicado usado en URLs antiguas** -> La ficha del duplicado debe mostrar estado fusionado y enlace al paciente principal.
- **Datos administrativos divergentes** -> No se mezclan automaticamente para evitar sobreescribir datos correctos; el admin decide ajustes en la ficha principal.

## Migration Plan

1. Agregar campos de fusion/archivo a `pacientes` en la instancia de testing mediante bootstrap.
2. Implementar filtros para excluir fusionados en busquedas operativas.
3. Implementar endpoint de fusion y pantalla administrativa.
4. Probar con Playwright reasignacion de turnos, consultas y recetas.
5. Aplicar los mismos campos en produccion antes del despliegue o como parte de un script seguro.
6. Si hay rollback de UI, los campos extra quedan inocuos y los registros ya fusionados mantienen trazabilidad.

## Open Questions

- Definir si la pantalla vivira en `/pacientes/duplicados` o dentro de `/pacientes` como una pestaña administrativa.
- Definir si el paciente duplicado debe tener una etiqueta visible "Fusionado" en listados administrativos o solo en su ficha.
- Confirmar si la fusion queda solo para `admin` o si se creara un permiso configurable para usuarios administrativos no admin.
