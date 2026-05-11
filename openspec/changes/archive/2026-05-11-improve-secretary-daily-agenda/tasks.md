## 1. Especificacion

- [x] 1.1 Crear proposal, design, spec delta y tareas para agenda diaria de secretaria.
- [x] 1.2 Validar OpenSpec del cambio.

## 2. Implementacion

- [x] 2.1 Extraer helpers locales en `/turnos` para obtener medico, turnos diarios y disponibilidades diarias.
- [x] 2.2 Renderizar agenda diaria agrupada por medico cuando secretaria esta en "Todos los medicos".
- [x] 2.3 Renderizar agenda diaria de un medico cuando hay medico seleccionado o rol medico activo.
- [x] 2.4 Agregar acciones de alta de turno desde disponibilidad diaria con parametros precargados.
- [x] 2.5 Mantener acciones existentes de turno y cambio de estado dentro de la nueva vista diaria.

## 3. Pruebas y verificacion

- [x] 3.1 Agregar o ajustar prueba Playwright para vista diaria de secretaria agrupada por medico.
- [x] 3.2 Ejecutar lint enfocado.
- [x] 3.3 Ejecutar build.
- [x] 3.4 Ejecutar pruebas Playwright automatizadas.
