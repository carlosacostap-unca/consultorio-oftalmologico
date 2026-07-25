# Diseno

## Enfoque
La validacion se resuelve en la pantalla cliente de alta de mutuales, cargando una lista liviana de mutuales existentes con `id`, `nombre` y `codigo`.

## Detalles
- Normalizar el codigo con `trim()` para comparar y guardar.
- Ignorar mutuales sin codigo al armar la lista de codigos ocupados.
- Mostrar los codigos ocupados en una seccion compacta dentro del formulario.
- Marcar el campo `codigo` como invalido cuando coincide con un codigo ocupado.
- Revalidar en `handleSubmit` antes de llamar a PocketBase.

## Limites
- Esta validacion reduce errores de usuario, pero no reemplaza una restriccion unica de base de datos si varios usuarios crean mutuales al mismo tiempo.
- No se cambia la edicion de mutuales existentes en este alcance.
