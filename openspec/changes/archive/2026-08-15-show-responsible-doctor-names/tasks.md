## 1. Diagnostico

- [x] 1.1 Confirmar que las consultas recientes tienen `medico_id`.
- [x] 1.2 Confirmar que las reglas de `users` impiden expandir otros medicos desde cliente.

## 2. Implementacion

- [x] 2.1 Cargar `/api/medicos` en el listado de consultas y usarlo como fallback por `medico_id`.
- [x] 2.2 Cargar `/api/medicos` en la ficha del paciente y usarlo en continuidad, historia clinica e historial.
- [x] 2.3 Verificar que nueva consulta muestre el medico responsable con fallback al usuario logueado.
- [x] 2.4 Reforzar en API que nueva consulta solo pueda crearse por el medico responsable logueado.

## 3. Validacion

- [x] 3.1 Ejecutar build.
- [x] 3.2 Revisar diff y confirmar que no cambia la asignacion de medico.
