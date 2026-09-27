## Why

Al iniciar una consulta nueva desde un paciente en la aplicacion de escritorio, una respuesta asincronica de respaldo puede sobrescribir los antecedentes ya cargados desde la ficha y dejar los chips desmarcados. Esto oculta informacion clinica vigente —incluida la observacion libre— justo durante la atencion y obliga al profesional a reconstruirla manualmente.

## What Changes

- Mantener estables en la consulta nueva los antecedentes fijos y `Otra` cargados desde la ficha del paciente preseleccionado.
- Consultar la ultima consulta despues de confirmar la ficha seleccionada y combinar ambas fuentes, incluso cuando la ficha ya posee algun antecedente.
- Determinar la ultima consulta por fecha de atencion (`fecha`), usando `created` solo como desempate, igual que el historial visible.
- Mantener activa la union de chips entre ficha y consulta anterior; para `Otra`, conservar primero el valor historico no vacio y usar la ficha como respaldo.
- Evitar que una solicitud asincronica iniciada para un estado anterior sobrescriba los antecedentes de la ficha o de otro paciente.
- Incorporar pruebas de regresion para el ingreso directo desde la ficha del paciente y para la respuesta tardia del respaldo historico.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `clinical-consultations`: precisa la prioridad y estabilidad de la precarga de antecedentes al abrir una consulta nueva con un paciente preseleccionado.

## Impact

- Afecta la hidratacion cliente de `app/consultas/nueva/page.tsx` y las pruebas del flujo de consultas.
- No requiere migraciones de datos, cambios en el esquema de PocketBase ni nuevas dependencias.
- El comportamiento aplica tanto al runtime web como al empaquetado de escritorio, con especial relevancia para las respuestas locales asincronicas del modo offline.
