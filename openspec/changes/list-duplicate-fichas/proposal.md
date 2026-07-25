## Why

Los administradores necesitan detectar fichas clinicas asignadas a mas de un paciente para corregir inconsistencias de padron antes de fusionar o reasignar registros. Hoy la pantalla de duplicados ayuda a comparar pacientes, pero no ofrece una vista directa de fichas repetidas.

## What Changes

- Agregar una opcion "Fichas duplicadas" dentro de "Calidad de datos" para usuarios con rol activo `admin`.
- Crear una pantalla administrativa que liste las fichas con mas de un paciente activo asignado.
- Paginar el listado de fichas duplicadas de a 5 fichas por pagina.
- Permitir abrir una ficha duplicada en una pantalla de detalle con sus pacientes asociados.
- Exponer una API de solo lectura protegida por rol activo `admin` para consultar los grupos por `numero_ficha`.
- Mostrar para cada ficha la cantidad de pacientes y datos administrativos basicos de cada paciente.
- Mostrar la cantidad de consultas registradas para cada paciente dentro de cada ficha duplicada.
- Permitir que un admin marque un paciente como "Queda", borrando sus consultas actuales e importando para ese paciente las consultas de su ficha actual desde `data/DATOMED.DBF`.
- Permitir que un admin marque un paciente como "Separar", asignandole una nueva ficha disponible e importando copias de las consultas de su ficha anterior con la nueva ficha.

## Capabilities

### New Capabilities
- `duplicate-ficha-review`: revision administrativa de fichas compartidas por multiples pacientes activos.

### Modified Capabilities
- `access-and-navigation`: agrega la entrada de navegacion admin para acceder a fichas duplicadas.

## Impact

- Afecta `components/Sidebar.tsx`, la nueva pantalla `app/pacientes/fichas-duplicadas/page.tsx` y el nuevo endpoint `app/api/pacientes/fichas-duplicadas/route.ts`.
- Reutiliza PocketBase, `requireAdmin` y `data/DATOMED.DBF`; no requiere cambios de esquema.
- Las acciones "Queda" y "Separar" eliminan y recrean consultas del paciente seleccionado, por lo que deben ejecutarse con confirmacion y respaldo operativo.
