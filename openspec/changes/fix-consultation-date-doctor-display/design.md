## Approach

La fecha clinica seguira guardandose como clave `yyyy-mm-dd` en el estado del formulario y se convertira a fecha almacenada con los helpers existentes. Para la UI se reemplaza el `input type="date"` por un campo de texto controlado que muestra `dd/mm/aaaa`, acepta entrada `dd/mm/aaaa` y solo actualiza el estado clinico cuando la fecha esta completa y es valida.

Para el medico responsable, la consulta existente se cargara con `expand: "medico_id"`. La etiqueta se resolvera primero desde la lista global de medicos y luego desde `consulta.expand.medico_id`; si aun no se pudo resolver pero existe `medico_id`, el mensaje indicara que el medico esta asignado pero no resuelto, evitando confundirlo con una consulta sin medico.

## Notes

- El cambio no flexibiliza la creacion de consultas: sigue aplicando la regla actual de que el medico responsable logueado crea la atencion.
- El control de fecha no depende de `Intl` ni del locale del navegador para la visualizacion principal.
