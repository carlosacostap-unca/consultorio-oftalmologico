## Why

La nueva consulta es el centro del trabajo del medico, pero hoy se presenta como una planilla extensa. Despues de llegar desde la jornada diaria, el medico necesita orientarse rapido: paciente, antecedentes, motivo, examen y cierre clinico.

## What Changes

- Reorganizar `/consultas/nueva` como flujo clinico por secciones.
- Mostrar un resumen visible del paciente seleccionado con ficha, documento, edad, obra social y domicilio cuando existan.
- Destacar el contexto del turno cuando la consulta se inicia desde la jornada medica.
- Separar carga rapida, antecedentes, examen oftalmologico, refraccion y cierre clinico.
- Mantener los campos actuales y la persistencia existente sin cambios de esquema PocketBase.
- Ajustar pruebas Playwright para validar que el flujo desde turno sigue creando y vinculando la consulta.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: Mejora la experiencia de nueva consulta clinica y conserva el flujo desde turno.

## Impact

- UI de `app/consultas/nueva/page.tsx`.
- Pruebas Playwright de jornada medica y guardado de consulta.
- Especificacion OpenSpec `clinical-consultations`.
- Sin migraciones ni cambios en colecciones PocketBase.
