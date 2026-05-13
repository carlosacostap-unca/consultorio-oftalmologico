## Why

Al guardar una consulta, el medico necesita decidir rapidamente el siguiente paso sin interpretar una fila de acciones equivalentes. El cierre de la atencion debe orientar la continuidad segun lo cargado en la consulta.

## What Changes

- Mostrar un panel de cierre asistido luego de guardar una nueva consulta.
- Recomendar una accion principal segun el contenido: receta si hay tratamiento, anteojos si hay refraccion, retorno a jornada si viene desde turno.
- Mantener acciones secundarias para abrir consulta, ficha del paciente, imprimir anteojos, crear receta y volver al contexto anterior.
- No cambiar el guardado, las colecciones ni las rutas existentes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: Las acciones posteriores al guardado deben priorizar el siguiente paso clinico mas probable.

## Impact

- Afecta `app/consultas/nueva/page.tsx`.
- Afecta cobertura Playwright en `tests/playwright/consultorio.spec.ts`.
- No requiere migraciones ni cambios en PocketBase.
