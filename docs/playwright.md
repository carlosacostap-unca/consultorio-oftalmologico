# Pruebas Playwright

La suite automatizada cubre login por rol, cambio de rol activo, otorgamiento de turnos, sala de espera, consultas, recetas, permisos administrativos, duplicados e impresiones con datos demo.

Tambien incluye un circuito critico de punta a punta:

1. Secretaria crea un turno desde la agenda diaria.
2. Medico toma ese turno desde su jornada.
3. Medico finaliza la consulta.
4. Medico emite una receta vinculada.
5. Se verifican las vistas imprimibles de informe clinico y receta.

Antes de correrla, actualizar los datos demo en PocketBase:

```powershell
node scripts/seed_usuarios_prueba.mjs
node scripts/seed_agenda_prueba.mjs
```

Ejecutar las pruebas:

```powershell
npm.cmd run test:playwright
```

Para correr contra PocketBase de testing con las guardas anti-produccion:

```powershell
npm.cmd run schema:test
npm.cmd run seed:test
npm.cmd run test:playwright:test
```

Las pruebas usan la fecha demo `2026-05-15`, el medico `medico.demo@consultorio.local` y limpian los registros generados por Playwright al finalizar.

## Checklist manual minima

Usar esta checklist despues de una corrida verde de Playwright:

- Revisar que agenda diaria, sala de espera, consulta clinica y ficha del paciente se sientan claras en un uso real de secretaria y medico.
- Imprimir o exportar a PDF un listado diario, un informe clinico, una receta medica, una receta de anteojos y una ficha de paciente; verificar cortes de pagina, legibilidad y datos del encabezado.
- Probar doble click, volver atras, cambio rapido de filtros y cambio de rol activo en medio de turnos.
- En un entorno controlado, validar SMTP real: guardar configuracion, enviar email de prueba y confirmar que no se exponga la App Password.
- Explorar al menos un caso raro de datos: paciente duplicado, turno dentro de bloqueo, mutual con pacientes asociados y consulta fuera del limite de edicion.
