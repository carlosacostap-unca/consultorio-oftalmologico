## 1. Resolucion compartida del medico

- [x] 1.1 Agregar cobertura unitaria para resolver el medico por expansion, lista autenticada y fallback.
- [x] 1.2 Revisar las pantallas principales de consultas para conservar la resolucion por `medico_id` sin depender exclusivamente de PocketBase expandido.

## 2. Vistas imprimibles

- [x] 2.1 Cargar la lista autenticada de medicos y resolver el responsable en el informe clinico de consulta.
- [x] 2.2 Aplicar la misma resolucion en la receta de anteojos imprimible.
- [x] 2.3 Aplicar la misma resolucion a las consultas incluidas en la historia clinica imprimible del paciente.

## 3. Validacion

- [x] 3.1 Agregar o ajustar una prueba del flujo entre dos medicos, incluyendo una vista imprimible.
- [x] 3.2 Ejecutar las pruebas focalizadas, lint de archivos afectados y build de produccion.
- [x] 3.3 Validar los artefactos OpenSpec y revisar que no se hayan ampliado reglas de acceso de `users`.
