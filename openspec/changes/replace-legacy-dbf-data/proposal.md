## Why

El consultorio recibio una exportacion actualizada del sistema anterior en archivos DBF de FoxPro y necesita reemplazar los datos cargados actualmente en PocketBase sin perder trazabilidad clinica ni asignar consultas al paciente equivocado. La migracion debe tratar explicitamente fichas duplicadas, consultas sin paciente, codigos de mutual incompletos y datos clinicos legacy que no tienen destino directo.

## What Changes

- Agregar un flujo administrativo de diagnostico `dry-run` para leer `data/MUTUALES.DBF`, `data/PACIENTE.DBF` y `data/DATOMED.DBF` directamente, sin modificar PocketBase.
- Definir reglas de reemplazo controlado para mutuales, pacientes y consultas legacy.
- Generar reportes de excepciones antes de aplicar cambios: fichas duplicadas exactas, fichas ambiguas, consultas huerfanas, codigos de mutual sin coincidencia y diagnosticos de paciente sin destino directo.
- Preparar un importador administrativo con modo `--apply`, guardas anti-accidente, backup previo y validacion de conteos finales.
- Conservar consultas legacy seguras por relacion de ficha y dejar sin asignacion automatica los casos donde la ficha fue reutilizada por personas distintas.
- Conservar diagnosticos legacy de `PACIENTE.DBF` como registros clinicos historicos reconocibles, sin mezclarlos con antecedentes administrativos.
- **BREAKING**: el reemplazo de datos legacy elimina o sustituye los registros actuales de `mutuales`, `pacientes` y `consultas` dentro del alcance definido antes de recargar los DBF aprobados.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `data-import-and-migration`: define el reemplazo controlado desde DBF, el diagnostico previo, las reglas para excepciones y las verificaciones posteriores.
- `patient-management`: define como deben conservarse pacientes legacy cuando hay fichas duplicadas, cobertura no identificada y diagnosticos historicos provenientes de `PACIENTE.DBF`.
- `clinical-consultations`: define como se importan consultas historicas desde `DATOMED.DBF`, incluyendo consultas huerfanas o ambiguas sin asignacion automatica de paciente.
- `mutual-management`: define mutuales administrativas para codigos legacy sin obra social identificable y evita inventar coincidencias clinicamente dudosas.

## Impact

- Scripts: nuevos scripts administrativos para diagnostico, reportes, backup y reemplazo/importacion DBF.
- Datos fuente: `data/MUTUALES.DBF`, `data/PACIENTE.DBF`, `data/DATOMED.DBF`.
- PocketBase: escritura masiva en `mutuales`, `pacientes` y `consultas`; posible creacion de mutuales administrativas para datos legacy incompletos.
- Validacion: reportes de excepciones, conteos de origen/destino, modo `dry-run`, guardas anti-produccion accidental y ejecucion manual de `--apply`.
- UI: sin cambios visuales obligatorios en este alcance; la app debe seguir tolerando pacientes/consultas legacy con campos opcionales y registros historicos sin `medico_id`.
