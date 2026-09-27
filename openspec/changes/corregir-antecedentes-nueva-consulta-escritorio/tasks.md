## 1. Contrato de antecedentes

- [x] 1.1 Centralizar la normalizacion y deteccion de antecedentes del paciente en el helper clinico compartido.
- [x] 1.2 Agregar pruebas unitarias para antecedentes fijos, `Otra` y ausencia que habilita el respaldo historico.
- [x] 1.3 Formalizar y probar la combinacion de antecedentes repartidos entre ficha y ultima consulta.

## 2. Precarga de nueva consulta

- [x] 2.1 Ajustar la hidratacion de `/consultas/nueva` para esperar la ficha confirmada y no iniciar un respaldo prematuro.
- [x] 2.2 Invalidar resultados asincronicos obsoletos al cambiar de paciente o desmontar el efecto.
- [x] 2.3 Consultar la ultima consulta aun cuando la ficha tenga antecedentes y aplicar la union de ambas fuentes.

## 3. Verificacion

- [x] 3.1 Incorporar una asercion E2E del flujo desde ficha que compruebe chips y `Otra` precargados.
- [x] 3.2 Ejecutar las pruebas focalizadas, lint y build, y validar el cambio OpenSpec.
- [x] 3.3 Ajustar la regresion E2E al caso real: Diabetes en ficha y Maculopatia/Uveitis en la consulta anterior; repetir validaciones. Verificacion completa con fixture local en `scripts/verify_desktop_antecedents.mjs`; la prueba remota de staging no se reejecuto.
- [x] 3.4 Corregir el orden de seleccion a fecha clinica y comprobar el renderer empaquetado con consultas creadas en orden inverso, sin escrituras externas.
