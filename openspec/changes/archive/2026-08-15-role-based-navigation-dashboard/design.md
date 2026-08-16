## Context

La aplicacion ya resuelve un rol activo local por usuario y permite cambiarlo desde el perfil del menu lateral. La barra lateral actual se construye en `components/Sidebar.tsx`, pero combina enlaces de datos, administracion y configuracion con reglas puntuales por rol. La pantalla inicial autenticada en `app/page.tsx` muestra un panel de control generico con tarjetas iguales para todos los perfiles.

Los perfiles tienen objetivos distintos:
- Secretaria: operar agenda, turnos, pacientes y mutuales para todos los medicos.
- Medico: atender su jornada, consultar pacientes, emitir recetas y bloquear su propia disponibilidad.
- Admin: configurar usuarios, permisos, horarios, bloqueos y revisar datos/calidad.

## Goals / Non-Goals

**Goals:**
- Centralizar la definicion del menu por rol activo en una estructura clara y mantenible.
- Adaptar la bienvenida a las prioridades de cada rol activo.
- Conservar cambio de rol inmediato para usuarios multirol.
- Mantener a Secretaria con acceso visible a gestion de mutuales.

**Non-Goals:**
- No cambiar permisos backend ni reglas de PocketBase.
- No agregar nuevos dashboards con metricas en tiempo real todavia.
- No modificar el modelo de roles ni la prioridad inicial de ingreso como medico.
- No cambiar flujo de login ni OAuth.

## Decisions

1. Definir menus por rol activo en `Sidebar`
   - Decision: construir arreglos de secciones segun `activeRole`, en lugar de un unico arreglo con condicionales dispersos.
   - Rationale: mejora lectura y evita inconsistencias entre perfiles.
   - Alternativa considerada: filtrar un menu global por permisos. Se descarta para esta primera iteracion porque requiere decidir permisos por item y puede esconder rutas utiles mientras se ajustan permisos.

2. Mantener Secretaria como perfil operativo amplio
   - Decision: Secretaria ve agenda, pacientes, mutuales, consultas y recetas.
   - Rationale: en este consultorio la secretaria gestiona datos administrativos y agenda de todos los medicos.

3. Reducir el menu del Medico a tareas clinicas y agenda propia
   - Decision: Medico no ve Mutuales ni configuracion administrativa desde el menu principal.
   - Rationale: evita ruido operativo; los datos de cobertura siguen disponibles dentro de pacientes/turnos.

4. Separar Admin en Configuracion, Datos y Calidad de datos
   - Decision: Admin mantiene accesos administrativos y tambien puede entrar a datos operativos.
   - Rationale: el admin necesita supervision y mantenimiento, pero no debe confundirse con el flujo diario de atencion.

5. Panel inicial declarativo por rol
   - Decision: reemplazar las cuatro tarjetas genericas por tarjetas y textos derivados del rol activo.
   - Rationale: la pantalla inicial debe orientar el siguiente paso probable de cada perfil.

## Risks / Trade-offs

- [Riesgo] Algunos usuarios multirol podrian esperar ver todas sus opciones simultaneamente. -> Mitigacion: el selector de rol queda visible y el cambio actualiza menu y bienvenida.
- [Riesgo] El menu aun no refleja permisos finos personalizados. -> Mitigacion: mantener alcance por rol activo y dejar filtrado por permisos para una mejora posterior.
- [Riesgo] Usuarios con rol admin pueden usar datos operativos desde admin, aunque no sea su tarea diaria. -> Mitigacion: separar visualmente esas opciones bajo "Datos".
