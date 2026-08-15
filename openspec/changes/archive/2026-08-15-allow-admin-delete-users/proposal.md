# Permitir eliminar usuarios desde administracion

## Por que
La pantalla `/usuarios` permite crear cuentas y administrar roles, pero no permite retirar usuarios que ya no deben acceder al sistema. Esto obliga a resolver bajas fuera de la aplicacion.

## Que cambia
- Un usuario con rol activo `admin` puede eliminar otros usuarios desde `/usuarios`.
- La accion pide confirmacion antes de borrar.
- El sistema impide que un admin elimine su propia cuenta.
- La API administrativa de usuarios expone borrado protegido por rol activo `admin`.

## Impacto
- Mejora la gestion operativa de accesos.
- Reduce dependencias del panel externo de PocketBase para bajas simples.
- Mantiene una proteccion explicita contra auto-eliminacion accidental.
