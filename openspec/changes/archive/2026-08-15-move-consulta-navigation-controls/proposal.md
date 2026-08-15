## Why

Las pantallas de carga y visualizacion de consultas reservan una cabecera superior para acciones de navegacion y contexto, que separa innecesariamente el formulario y la informacion clinica. Se necesita liberar esa zona sin perder accesos a las acciones necesarias.

## What Changes

- Eliminar la cabecera superior decorativa y los rotulos superiores de paciente de las pantallas de nueva consulta y consulta existente.
- Reubicar las acciones `Volver` y `Ver contexto` al cierre de cada pantalla.
- Mantener el comportamiento actual de retorno y de apertura del contexto clinico.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `clinical-consultations`: las acciones de navegacion y contexto de las pantallas de consulta se presentan al final del flujo clinico, sin cabecera superior dedicada.

## Impact

- Afecta `app/consultas/nueva/page.tsx` y `app/consultas/[id]/page.tsx`.
- No cambia APIs, datos clinicos, permisos ni el esquema de PocketBase.
