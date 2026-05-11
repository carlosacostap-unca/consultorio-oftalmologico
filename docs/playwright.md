# Pruebas Playwright

La suite automatizada cubre login por rol, cambio de rol activo y otorgamiento de turnos con datos demo.

Antes de correrla, actualizar los datos demo en PocketBase:

```powershell
node scripts/seed_usuarios_prueba.mjs
node scripts/seed_agenda_prueba.mjs
```

Ejecutar las pruebas:

```powershell
npm.cmd run test:playwright
```

Las pruebas usan la fecha demo `2026-05-15`, el medico `medico.demo@consultorio.local` y limpian el turno generado por Playwright al finalizar.
