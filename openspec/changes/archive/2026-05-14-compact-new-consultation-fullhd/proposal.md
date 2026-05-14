## Why

Los medicos que probaron la aplicacion indicaron que la pantalla de nueva consulta requiere demasiado scroll vertical. En monitores Full HD necesitan una vista de carga mas compacta, orientada al trabajo durante la atencion, sin perder el contexto clinico previo ni los campos actuales.

## What Changes

- Reorganizar `/consultas/nueva` para escritorio en una composicion compacta de dos columnas.
- Mantener la carga clinica principal visible y prioritaria.
- Mover el contexto clinico previo a un panel lateral con altura controlada y scroll propio.
- Reducir margenes, separaciones y alturas de textarea en desktop para evitar scroll vertical de pagina en Full HD.
- Mantener comportamiento responsive en pantallas menores.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: La nueva consulta debe ofrecer una experiencia compacta de escritorio para monitores Full HD.

## Impact

- Afecta `app/consultas/nueva/page.tsx`.
- Afecta la verificacion visual y la cobertura Playwright del flujo medico de nueva consulta.
