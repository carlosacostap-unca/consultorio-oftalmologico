# Piloto de actualización de escritorio 0.1.8

Este procedimiento valida la actualización automática `0.1.7` → `0.1.8` únicamente en el canal `pilot`. La versión es deliberadamente conservadora: cambia el número de versión y la documentación de prueba, sin introducir comportamiento clínico nuevo.

No promover `0.1.8` a `stable` hasta completar y registrar todas las comprobaciones.

## Alcance y seguridad

- Equipo piloto esperado: `PC-E24D57F3`.
- Plataforma: Windows 11 x64.
- Canal del equipo: `pilot`.
- Los demás equipos deben permanecer en `stable`.
- Usar solamente un paciente sintético identificable y eliminarlo después de conservar la evidencia.
- No copiar tokens, URLs prefirmadas, secretos ni contenido clínico real a capturas o diagnósticos.

Paciente sintético sugerido:

- Nombre: `PILOTO`
- Apellido: `UPDATE 018`
- Documento: un valor de prueba no perteneciente a una persona real

## 1. Comprobaciones previas

- [ ] La aplicación instalada informa versión `0.1.7`.
- [ ] El equipo informa estado `En línea` y `Sincronizado`.
- [ ] La pantalla muestra `0` pendientes, `0` errores y `0` conflictos.
- [ ] El equipo `PC-E24D57F3` continúa asignado a `pilot`.
- [ ] El canal `stable` conserva su versión anterior.
- [ ] Se exportó un diagnóstico previo sanitizado.

## 2. Publicación sólo en pilot

- [ ] El commit de `0.1.8` está integrado en `main`.
- [ ] La etiqueta exacta `desktop-v0.1.8` apunta a ese commit de `main`.
- [ ] `desktop-release.yml` finalizó correctamente.
- [ ] El paso `Publicar objetos inmutables y mover el puntero pilot` finalizó correctamente.
- [ ] No se ejecutó `desktop-promote-stable.yml`.

Registrar tag, commit, run de GitHub Actions, nombre, tamaño y digest del artefacto.

## 3. Detección, descarga y posposición

1. Abrir la aplicación `0.1.7` con red disponible.
2. Presionar `Buscar actualizaciones`.
3. Confirmar que informa la versión `0.1.8` y muestra el progreso de descarga.
4. Esperar hasta que aparezca `Actualización 0.1.8 lista`.
5. Presionar `Más tarde`.
6. Confirmar que la aplicación sigue operativa y no se cierra.
7. Volver a la pantalla de actualización y confirmar que el paquete continúa disponible para instalar.

- [ ] Detección correcta.
- [ ] Descarga completa.
- [ ] Progreso visible.
- [ ] Posposición sin cierre.
- [ ] Paquete listo después de posponer.

## 4. Operación pendiente e instalación sin red

1. Con la actualización ya descargada, desconectar la red del equipo piloto.
2. Crear el paciente sintético desde la aplicación offline.
3. Confirmar que la operación queda pendiente y que el paciente sigue visible localmente.
4. Sin recuperar la red, elegir `Reiniciar y actualizar`.
5. Esperar el cierre, respaldo, instalación y reapertura.
6. Confirmar que la aplicación informa versión `0.1.8`.
7. Confirmar que conserva sesión, identidad del equipo, paciente sintético y operación pendiente.
8. Confirmar que puede navegar y consultar datos locales mientras continúa sin red.
9. Recuperar la conexión.
10. Sincronizar y confirmar que la operación pasa a confirmada sin crear conflictos.

- [ ] La instalación comenzó sólo después de preparar un respaldo válido.
- [ ] La instalación funcionó con el paquete ya descargado y sin red.
- [ ] La identidad del equipo se conservó.
- [ ] La operación pendiente se conservó durante el reinicio.
- [ ] El trabajo local continuó disponible offline.
- [ ] La operación se confirmó al recuperar la conexión.
- [ ] Estado final: `0` pendientes, `0` errores y `0` conflictos.

## 5. Evidencia requerida

Registrar sin datos sensibles:

- versión de origen y destino;
- fecha y hora;
- equipo y canal;
- capturas de detección, descarga, `Más tarde`, actualización lista y estado posterior;
- conteos antes, durante y después: pendientes, errores y conflictos;
- ruta o identificador del respaldo verificado, sin copiar su contenido clínico;
- resultado de sincronización del paciente sintético;
- diagnóstico exportado antes y después;
- cualquier advertencia de SmartScreen observada.

## 6. Limpieza y decisión

- [ ] El paciente sintético fue eliminado de forma controlada después de conservar la evidencia.
- [ ] No quedaron operaciones, errores ni conflictos.
- [ ] Se revisaron los diagnósticos sanitizados.
- [ ] Se registró resultado `aprobado` o `rechazado` para `0.1.8`.

Si alguna comprobación falla, no promover. Conservar `stable` en la versión anterior, exportar diagnóstico y corregir mediante una versión superior.

## 7. Simulaciones de fallo posteriores

Después del ciclo normal, ejecutar en un perfil piloto aislado y documentar por separado:

- falta de red durante la consulta;
- token central vencido;
- URL prefirmada expirada;
- manifiesto alterado;
- descarga corrupta;
- política obligatoria sin interrupción de una sesión activa.

No alterar el manifiesto válido de `stable` ni reutilizar datos clínicos reales para estas simulaciones.
