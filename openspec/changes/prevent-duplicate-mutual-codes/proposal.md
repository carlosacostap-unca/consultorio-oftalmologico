# Evitar codigos duplicados de mutuales

## Por que
Al dar de alta una nueva mutual, el usuario puede cargar un codigo que ya pertenece a otra obra social. Eso genera ambiguedad operativa para busqueda, carga administrativa y migraciones de pacientes.

## Que cambia
- La pantalla `/mutuales/nueva` muestra los codigos ya ocupados junto con el nombre de la mutual correspondiente.
- Si el usuario ingresa un codigo existente, el formulario muestra una advertencia contextual.
- El alta queda bloqueada cuando el codigo ingresado ya esta ocupado.

## Impacto
- Mejora la carga administrativa de mutuales.
- Evita duplicados por validacion del cliente antes de crear el registro.
- No modifica mutuales existentes ni datos historicos.
