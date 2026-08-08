## Context

La pantalla de una consulta existente hidrata primero `formData` desde el registro de `consultas` y obtiene la ficha del paciente en una solicitud posterior. Los chips dependen únicamente de los campos `ant_*` de `formData`, por lo que una consulta histórica sin esos valores puede desmarcar un antecedente que sí está vigente en `pacientes`. Al navegar entre consultas, además, el estado anterior permanece visible hasta que termina la siguiente carga.

## Goals / Non-Goals

**Goals:**

- Construir el estado inicial de antecedentes de una consulta como la unión entre su instantánea clínica y los antecedentes vigentes del paciente.
- Aplicar esa hidratación en una sola actualización de formulario para evitar el cambio visible de activo a inactivo durante la carga.
- Ignorar el resultado de una carga de consulta que ya no sea la navegación activa.
- Cubrir la precedencia con pruebas unitarias deterministas.

**Non-Goals:**

- Modificar automáticamente la ficha del paciente al editar una consulta histórica.
- Migrar consultas antiguas ni alterar el esquema de PocketBase.
- Cambiar autorización, impresión o exportación de consultas.

## Decisions

1. **Unir antecedentes booleanos con una operación OR.** Un valor verdadero en la consulta conserva el dato histórico y un valor verdadero en el paciente mantiene visible la enfermedad de base vigente. Se descartó usar exclusivamente una de las fuentes porque perdería contexto histórico o actual.
2. **Resolver la precedencia en un helper puro.** La combinación de `ant_*` se implementará fuera del componente para poder probarla sin navegador y evitar lógica clínica dispersa en efectos React.
3. **Cargar la ficha antes de publicar el formulario de la consulta.** La consulta y el paciente se resolverán localmente y luego se hará una única actualización de `formData`. Se descartó corregir el chip sólo durante el render porque eso haría que su apariencia y el valor que se guarda pudieran divergir.
4. **Validar la identidad de la carga antes de actualizar estado.** Un contador o identificador en `useRef` impedirá que una respuesta perteneciente a otra consulta sobrescriba la consulta activa después de una navegación rápida.

## Risks / Trade-offs

- [La ficha del paciente agrega una espera antes de hidratar el formulario] → reutilizar la caché local existente y limitar la espera a un único registro.
- [Un antecedente histórico verdadero no puede ser borrado por un valor falso del paciente durante la carga] → es deliberado para no ocultar información clínica previamente registrada; las ediciones explícitas posteriores siguen usando los controles actuales.
- [Una falla al cargar el paciente podría impedir la unión] → continuar mostrando los antecedentes propios de la consulta y registrar el error, sin bloquear la revisión.
