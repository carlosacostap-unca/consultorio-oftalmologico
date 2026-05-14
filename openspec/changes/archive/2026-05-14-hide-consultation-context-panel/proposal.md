## Why

La pantalla de nueva consulta sigue mostrando scroll vertical en Full HD. El panel lateral de contexto clinico ocupa ancho util y no resuelve el objetivo principal de carga sin scroll. Los medicos priorizan una superficie de carga clinica completa y compacta, con contexto disponible solo cuando lo necesiten.

## What Changes

- Ocultar el contexto clinico por defecto en escritorio.
- Agregar un boton para mostrar u ocultar el contexto bajo demanda.
- Mostrar el contexto como panel superpuesto, sin reservar ancho permanente en la pantalla.
- Reorganizar la carga principal para aprovechar todo el ancho en Full HD.
- Mantener el contexto visible de forma responsive cuando corresponda en pantallas chicas.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: La nueva consulta debe permitir abrir contexto clinico bajo demanda y priorizar una pantalla principal sin scroll vertical en Full HD.

## Impact

- Afecta `app/consultas/nueva/page.tsx`.
- Ajusta cobertura Playwright del flujo medico de nueva consulta.
