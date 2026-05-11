## Overview

La configuracion `consultaEditLimitDays` se mueve desde `/permisos` a una nueva pagina de administracion en `/edicion-consultas`. La nueva pagina usa los mismos endpoints existentes para cargar y guardar configuracion.

## Decisions

- La ruta sera `/edicion-consultas` para mantener una URL clara y corta.
- El menu lateral mostrara `Edicion de consultas` dentro de Configuracion, junto a Usuarios y Permisos.
- `/permisos` dejara de llamar `GET /api/configuracion` y `PATCH /api/configuracion`.
- `/edicion-consultas` validara sesion y rol activo `admin` del mismo modo que `/permisos`.
- No se crean endpoints nuevos porque `/api/configuracion` ya representa esta configuracion.

## Risks

- Si el usuario cambia su rol activo desde `admin` hacia un rol operativo mientras esta en `/edicion-consultas`, la pagina debe redirigir a `/`.
- Si el menu crece, la seccion Configuracion debe seguir siendo escaneable en el lateral.

## Out of Scope

- Nuevas configuraciones clinicas.
- Cambios en la regla de negocio de cuantos dias se permite editar.
