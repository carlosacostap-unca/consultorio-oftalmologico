## Why

Las consultas son el registro clinico central de la aplicacion. Para mejorar trazabilidad y seguridad operativa, necesitamos saber cuando se crea o modifica una consulta y quien realizo esa accion.

## What Changes

- Crear una coleccion `consulta_eventos` para registrar eventos de auditoria de consultas.
- Registrar un evento al crear una consulta nueva.
- Registrar un evento al editar una consulta existente.
- Mostrar el historial de auditoria dentro del detalle de la consulta.
- Mantener el guardado actual tolerante a fallos: si la auditoria falla, la consulta no debe perderse.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: Las consultas deben exponer historial de auditoria de creacion y edicion.

## Impact

- Afecta esquema PocketBase con nueva coleccion `consulta_eventos`.
- Afecta `app/consultas/nueva/page.tsx`, `app/consultas/[id]/page.tsx` y `app/api/consultas/[id]/route.ts`.
- Agrega helpers y script de esquema.
- Afecta cobertura Playwright del flujo medico de nueva consulta.
