# Mejora de ficha clinica de paciente

## Por que
El medico necesita abrir la ficha de un paciente y entender rapido su contexto clinico antes o durante la atencion. La vista actual muestra los datos administrativos y el historial de consultas, pero no destaca antecedentes, acciones clinicas ni recetas recientes.

## Que cambia
- La vista `/pacientes/[id]?mode=view` agrega una ficha clinica de lectura con resumen del paciente, contacto, cobertura, antecedentes activos y ultima consulta.
- Se agregan acciones directas para iniciar una nueva consulta o una nueva receta desde la ficha del paciente.
- Se incorpora una seccion de recetas recientes vinculadas al paciente.
- La edicion administrativa existente de pacientes se conserva sin cambios funcionales.

## Impacto
- Modifica la UI de detalle de paciente.
- No requiere cambios de esquema en PocketBase.
- Amplia cobertura Playwright para la ficha clinica del medico.
