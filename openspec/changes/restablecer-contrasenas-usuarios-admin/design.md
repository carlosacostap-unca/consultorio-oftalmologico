## Context

La aplicación ya permite configurar y cambiar la contraseña propia mediante `/api/usuarios/password`. La pantalla `/usuarios` usa endpoints server-side protegidos con `requireAdmin` para crear, eliminar y asignar roles, pero no ofrece recuperación administrativa de acceso. La actualización debe preservar la separación entre el token del usuario operador y las credenciales administrativas de PocketBase.

## Goals / Non-Goals

**Goals:**

- Permitir que un usuario con rol activo `admin` establezca una nueva contraseña para una cuenta seleccionada.
- Validar contraseña y confirmación tanto en cliente como en servidor.
- Mantener la contraseña fuera de respuestas, logs y estado persistente del cliente después de cerrar el modal.
- Dar confirmación visual clara del resultado.

**Non-Goals:**

- No enviar emails de recuperación ni enlaces temporales.
- No modificar el flujo existente para cambiar la contraseña propia desde el perfil.
- No cambiar roles, sesiones activas ni el esquema PocketBase.

## Decisions

1. Se agregará `PATCH /api/usuarios/password/reset` con `userId`, `password` y `passwordConfirm`. Una ruta separada evita mezclar la autorización administrativa con el endpoint de autoservicio existente.
2. El endpoint llamará `requireAdmin` antes de leer o aplicar el cambio, validará un identificador no vacío, mínimo de 8 caracteres y coincidencia exacta. Luego actualizará `password`, `passwordConfirm` y `password_configured: true` mediante `pbAdmin`.
3. La respuesta contendrá solo identidad básica y estado de configuración; nunca incluirá la contraseña.
4. Cada fila mostrará `Restablecer contraseña`. Al activarla se abrirá un modal con dos campos `password`, mensajes inline y acciones Guardar/Cancelar. El modal limpiará sus campos al cerrar o completar.
5. La acción estará disponible también para la cuenta activa; el cambio de contraseña propia ya es una capacidad válida y no afecta la protección contra autoeliminación o pérdida del rol admin.

## Risks / Trade-offs

- [El administrador conoce la nueva contraseña] → La interfaz indica que debe comunicarla de forma segura; el sistema no la persiste ni la devuelve.
- [Una contraseña equivocada puede bloquear al usuario] → Se exige confirmación explícita y se muestra la cuenta objetivo en el modal.
- [Un usuario no admin intenta invocar el endpoint directamente] → `requireAdmin` exige token válido, rol admin asignado y rol activo `admin`.
- [El restablecimiento puede invalidar la sesión del usuario afectado según PocketBase] → Es un efecto aceptado de una operación explícita de recuperación de acceso.

## Migration Plan

Desplegar la aplicación sin migraciones. El rollback restaura la ruta y la interfaz anteriores; las contraseñas que ya hayan sido restablecidas no se revierten automáticamente.

## Open Questions

Ninguna.
