## Enfoque
La ruta nueva sigue el patron de las impresiones existentes: componente cliente, carga directa desde PocketBase con `expand: paciente_id`, listado de recetas relacionadas por `consulta_id` y botones `Imprimir`/`Cerrar` ocultos en impresion.

## Contenido del informe
- Cabecera: titulo, consultorio, fecha de consulta.
- Paciente: nombre, documento, ficha, obra social, afiliado y fecha de nacimiento.
- Consulta: motivo, diagnostico y tratamiento.
- Antecedentes activos.
- Examen: agudeza visual, presion ocular, biomicroscopia y fondo de ojo.
- Refraccion de lejos/cerca para OD/OI.
- Recetas asociadas con medicamentos e indicaciones.
- Firma y sello.

## Fuera de alcance
- No genera PDF en servidor.
- No cambia los datos clinicos ni permisos.
- No modifica el formato de receta medica ni anteojos.
