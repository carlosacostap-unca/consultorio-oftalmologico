# Bloquear DNI repetidos en pacientes

## Por que
La aplicacion permite guardar pacientes con el mismo DNI/numero de documento. En el consultorio no puede haber dos fichas activas asociadas al mismo DNI, porque eso fragmenta la historia clinica y permite crear nuevas consultas sobre una ficha incorrecta.

## Que cambia
- El alta de paciente valida el documento antes de guardar y bloquea si ya existe otro paciente activo con ese DNI.
- La edicion de paciente valida el documento excluyendo al paciente actual y bloquea si el DNI pertenece a otra ficha activa.
- La validacion contempla registros historicos que todavia tengan el documento en `dni` o en `numero_documento`.

## Impacto
- Pantallas `/pacientes/nuevo` y `/pacientes/[id]`.
- API de validacion de pacientes.
- Especificacion de gestion de pacientes.
