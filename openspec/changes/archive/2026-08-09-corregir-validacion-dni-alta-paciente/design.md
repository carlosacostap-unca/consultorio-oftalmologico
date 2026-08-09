## Context

El formulario valida ficha y DNI antes de crear el paciente. La validación de DNI delega en una ruta del App Router que actualmente lee primero la definición administrativa de `pacientes` para descubrir si existe el campo legado `dni`. En producción esa lectura de esquema falla con las credenciales disponibles, aunque la consulta de registros y la colección funcionan correctamente.

## Goals / Non-Goals

**Goals:**

- Consultar duplicados por el campo canónico `numero_documento` sin requerir acceso administrativo al esquema.
- Conservar los filtros de paciente activo, tipo de documento y exclusión del registro actual.
- Diferenciar en la interfaz una falla de validación previa de un rechazo al crear el paciente.
- Verificar la ruta con una consulta real de solo lectura y el build de producción.

**Non-Goals:**

- Cambiar el esquema o los permisos de PocketBase.
- Migrar pacientes o reintroducir el campo legado `dni`.
- Modificar las reglas de duplicados de ficha o de fusión de pacientes.

## Decisions

- `numero_documento` será el único campo consultado para el DNI porque es el campo vigente del esquema y del formulario. Se descarta descubrir campos mediante `/api/collections/pacientes`, ya que amplía permisos sin aportar compatibilidad real al backend actual.
- La ruta mantendrá el acceso servidor a PocketBase para no duplicar reglas de filtros en el cliente.
- El formulario separará la validación previa del bloque de creación para mostrar un mensaje accionable si falla `/api/pacientes/documento`.
- Se conservará el mensaje de duplicado existente cuando la ruta responda correctamente con una coincidencia.

## Risks / Trade-offs

- [Una instalación antigua conserva exclusivamente `dni`] → El proyecto y producción usan `numero_documento`; el bootstrap de esquema y los formularios se validarán antes del despliegue.
- [La ruta sigue dependiendo de credenciales para consultar registros] → Esa es la capacidad mínima necesaria y ya está probada por `/api/pacientes/ficha`; el error quedará explícito si deja de estar disponible.
- [El despliegue no se activa automáticamente desde GitHub] → Publicar el commit y verificar la ruta pública; si continúa la versión anterior, informar el paso de despliegue manual pendiente.
