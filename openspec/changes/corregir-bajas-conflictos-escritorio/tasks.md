## 1. Revisiones centrales y compatibilidad

- [x] 1.1 Leer la guía local de Next.js 16 aplicable a Route Handlers antes de modificar el endpoint central.
- [x] 1.2 Incorporar una función comprobable que seleccione `sync_base_updated` como revisión central y use `updated` local sólo como compatibilidad cuando no exista anclaje.
- [x] 1.3 Guardar `centralRecord.updated` como `sync_base_updated` cada vez que el motor aplica una confirmación, resolución o página central sobre PocketBase local.
- [x] 1.4 Agregar pruebas unitarias que demuestren que una operación posterior usa la revisión central aunque PocketBase local haya generado otro timestamp.

## 2. Aplicación segura de bajas

- [x] 2.1 Implementar una comparación funcional de snapshots que ignore campos de sistema y sincronización y devuelva los campos clínicos realmente diferentes.
- [x] 2.2 Permitir una baja con revisión heredada o desactualizada cuando la comparación funcional no detecte cambios centrales.
- [x] 2.3 Mantener el conflicto conservador cuando existan cambios funcionales y registrar en él los campos reales que difieren.
- [x] 2.4 Cubrir con pruebas de servidor las bajas con revisión coincidente, deriva técnica sin diferencias y modificación funcional concurrente.

## 3. Resolución semántica de conflictos de baja

- [x] 3.1 Hacer que `apply_local` sobre un `delete_conflict` valide permiso de eliminación y escriba una baja lógica central con actor, equipo, operación y fecha.
- [x] 3.2 Hacer que `keep_central` cancele la intención de baja, restaure la copia central local y conserve la auditoría de resolución.
- [x] 3.3 Revalidar que el registro central no haya vuelto a cambiar antes de resolver y rechazar la resolución obsoleta.
- [x] 3.4 Agregar pruebas de autorización, auditoría y resultado local/central para ambas resoluciones de una baja.

## 4. Presentación y regresión integral

- [x] 4.1 Identificar en la pantalla la acción `delete` de la operación asociada sin agregar campos al esquema local.
- [x] 4.2 Presentar el conflicto como baja pendiente y reemplazar las acciones genéricas por “Cancelar baja y conservar central” y “Confirmar baja local”.
- [x] 4.3 Conservar la tabla comparativa y las acciones actuales para conflictos de edición o duplicados.
- [x] 4.4 Agregar una prueba de regresión del recorrido crear paciente offline, sincronizar, eliminar y volver a sincronizar sin conflicto técnico falso.

## 5. Verificación y piloto corregido

- [x] 5.1 Ejecutar las pruebas focalizadas de sincronización y resolución de conflictos, junto con lint, typecheck y build de producción.
- [x] 5.2 Validar estrictamente el cambio OpenSpec y documentar la evidencia del fallo reproducido y de la corrección.
- [ ] 5.3 Publicar la corrección web en staging y verificar el endpoint de sincronización antes de generar el instalador.
- [ ] 5.4 Preparar una nueva versión de escritorio para el canal `pilot`, manteniendo `stable` sin cambios.
- [ ] 5.5 Actualizar `PC-E24D57F3`, eliminar exclusivamente el paciente con documento `PRUEBAOFFLINEPILOTO` y comprobar 0 pendientes, 0 errores, 0 conflictos y ausencia en los listados activos.
