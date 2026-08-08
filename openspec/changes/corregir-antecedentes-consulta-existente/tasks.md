## 1. Combinacion de antecedentes

- [x] 1.1 Crear un helper tipado que combine los antecedentes fijos de la consulta y del paciente sin perder valores verdaderos.
- [x] 1.2 Agregar pruebas unitarias para antecedentes presentes en el paciente, en la consulta y en ambas fuentes.

## 2. Hidratacion de consulta existente

- [x] 2.1 Extender el tipo de paciente de la pantalla con los campos de antecedentes utilizados.
- [x] 2.2 Hidratar el formulario una sola vez con la consulta y la ficha del paciente combinadas.
- [x] 2.3 Evitar que una carga asincrona obsoleta actualice los chips después de navegar a otra consulta.
- [x] 2.4 Mantener oculto el formulario hasta completar la hidratacion combinada para que ningun chip aparezca transitoriamente desmarcado.

## 3. Verificacion

- [x] 3.1 Ejecutar las pruebas unitarias focalizadas y el lint de los archivos modificados.
- [x] 3.2 Ejecutar el build de producción y validar el cambio OpenSpec.
