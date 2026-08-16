## 1. Schema y Migracion

- [x] 1.1 Crear script idempotente para asegurar `consultas.medico_id`.
- [x] 1.2 Crear script idempotente para asegurar `recetas.medico_id`.
- [x] 1.3 Verificar que la migracion no modifique registros historicos existentes.
- [x] 1.4 Integrar la migracion en `schema:test`.

## 2. Consultas

- [x] 2.1 Actualizar tipos y cargas de consultas para expandir `medico_id`.
- [x] 2.2 Precargar medico al crear consulta desde turno o usuario medico.
- [x] 2.3 Permitir seleccion/correccion de medico en consultas libres segun rol.
- [x] 2.4 Mostrar medico responsable en listado, detalle e impresion de consulta.

## 3. Recetas

- [x] 3.1 Actualizar tipos y cargas de recetas para expandir `medico_id`.
- [x] 3.2 Precargar medico al crear receta desde consulta o usuario medico.
- [x] 3.3 Permitir seleccion/correccion de medico en recetas libres segun rol.
- [x] 3.4 Mostrar medico emisor en listado, detalle e impresion de receta.

## 4. Historia Clinica del Paciente

- [x] 4.1 Expandir medico en consultas y recetas usadas por la ficha del paciente.
- [x] 4.2 Mostrar medico en eventos de consulta y receta.
- [x] 4.3 Mostrar estado explicito cuando el medico no este registrado.

## 5. Validacion

- [x] 5.1 Actualizar seeds de testing con consultas y recetas atribuidas a medico.
- [x] 5.2 Agregar prueba Playwright para consulta con medico visible.
- [x] 5.3 Agregar prueba Playwright para receta con medico visible.
- [x] 5.4 Ejecutar build de Next.js.
- [x] 5.5 Ejecutar pruebas Playwright relevantes.
- [x] 5.6 Validar OpenSpec.
