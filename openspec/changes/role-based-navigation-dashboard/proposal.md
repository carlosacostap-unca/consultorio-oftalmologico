## Why

La navegacion actual quedo funcional pero inconsistente entre perfiles: mezcla configuracion, datos y tareas diarias sin reflejar claramente que viene a hacer cada usuario al ingresar. Ordenar el menu lateral y la pantalla de bienvenida por rol activo reduce friccion operativa para secretaria y medico, y concentra las tareas administrativas para admin.

## What Changes

- Reorganizar el menu lateral segun el rol activo (`secretaria`, `medico`, `admin`) con secciones y prioridades propias de cada flujo.
- Mantener para secretaria la gestion de mutuales como parte de su operacion diaria.
- Mostrar para medico una navegacion centrada en atencion, pacientes, recetas y bloqueos propios, evitando opciones administrativas poco frecuentes como mutuales.
- Mostrar para admin navegacion separada en Configuracion, Datos y Calidad de datos.
- Reemplazar el panel de bienvenida generico por una pantalla inicial adaptada al rol activo, con accesos principales y texto contextual.
- Asegurar que al cambiar el rol activo se actualicen inmediatamente el menu lateral y la bienvenida.
- No se introducen cambios de esquema ni migraciones de PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `access-and-navigation`: define navegacion lateral y panel inicial especificos por rol activo.

## Impact

- `components/Sidebar.tsx`: estructura de secciones y enlaces por rol activo.
- `app/page.tsx`: panel inicial autenticado por rol activo.
- `lib/active-role.ts` y `lib/permissions.ts`: posible reutilizacion de labels y resolucion de rol, sin cambios de contrato esperados.
- Pruebas Playwright existentes o nuevas para validar menu y bienvenida por rol.
- Sin impacto en APIs, PocketBase schema, import scripts ni datos existentes.
