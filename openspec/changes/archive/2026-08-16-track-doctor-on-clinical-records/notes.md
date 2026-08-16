## Correccion 2026-06-05

- La creacion de consultas debe pasar por `POST /api/consultas` para validar y persistir `medico_id` en servidor.
- El formulario de nueva consulta no debe escribir directamente en PocketBase porque puede guardar historias clinicas sin medico responsable.
