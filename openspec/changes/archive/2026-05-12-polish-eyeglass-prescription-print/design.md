## Enfoque
Se reutiliza el patron de impresiones existentes: componente cliente, carga directa de `consultas` con `expand: paciente_id`, botones ocultos en impresion y formato blanco/negro.

## Contenido
- Titulo y subtitulo de consultorio.
- Datos del paciente: nombre, documento, ficha, obra social y afiliado.
- Datos de consulta: fecha, diagnostico y ADD.
- Tablas separadas para LEJOS y CERCA con OD/OI y columnas esferico, cilindrico, eje.
- Observaciones clinicas breves cuando haya diagnostico/tratamiento.
- Firma y sello.
- Acciones: imprimir, volver a consulta y cerrar.

## Fuera de alcance
- No genera PDF.
- No cambia calculos de refraccion.
- No modifica la receta medica general.
