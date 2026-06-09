## Context

La aplicacion ya carga datos administrativos del paciente desde PocketBase y los reutiliza en la ficha y en `/consultas/nueva`. La ocupacion pertenece al paciente, no a la consulta, porque debe persistir como dato administrativo y mostrarse en nuevas atenciones futuras.

## Decisions

- Guardar `ocupacion` como texto opcional en `pacientes`.
- No copiar la ocupacion a `consultas`; la cabecera de consulta lee el dato expandido/cargado del paciente seleccionado.
- Incluir el campo en alta y edicion de pacientes para que el dato pueda mantenerse desde la ficha completa.
- Mostrar ocupacion en la fila superior de la carga inicial del paciente, compactando la grilla de escritorio sin cambiar el flujo clinico.
- Mostrar ocupacion en el detalle de consulta existente desde el paciente expandido/cargado, sin copiarla a la consulta.
- Agregar un script `ensure_patient_occupation_field.mjs` y sumarlo al bootstrap de esquema de test.
- Agregar un importador DBF que lea `PACIENTE.DBF`, decodifique CP850, tome `OCUPAC`, cruce por `NUM_FICH` contra `pacientes.numero_ficha` y salte fichas con ocupaciones contradictorias.

## Risks

- Si el esquema de PocketBase no esta actualizado, guardar pacientes con `ocupacion` puede fallar. El script de esquema mitiga esto y debe ejecutarse antes de usar el campo en un ambiente nuevo.
- En pantallas angostas, los datos de la cabecera deben apilarse para evitar solapamientos.
- Algunas fichas legacy aparecen repetidas con ocupaciones distintas; el importador debe reportarlas y omitirlas para no pisar datos con informacion ambigua.
