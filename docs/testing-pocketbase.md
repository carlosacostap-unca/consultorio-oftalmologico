# Entorno de testing con PocketBase

Este proyecto ejecuta pruebas Playwright que escriben datos en PocketBase. Para no tocar produccion, usar una instancia separada para testing.

## 1. Crear instancia PocketBase test

En el VPS, crear una instancia separada de PocketBase con:

- URL propia, por ejemplo `https://pocketbase-test.tudominio.com`.
- Misma version y mismas colecciones/reglas que la instancia principal.
- Sin datos reales de pacientes.
- Usuario superadmin propio para testing.

La URL debe contener `test`, `testing`, `localhost` o `127.0.0.1`. Si no, los scripts de testing abortan por seguridad.

## 2. Configurar variables

Copiar el ejemplo:

```bash
cp .env.test.local.example .env.test.local
```

Completar:

```dotenv
NEXT_PUBLIC_POCKETBASE_URL=https://pocketbase-test.tudominio.com
POCKETBASE_URL=https://pocketbase-test.tudominio.com
POCKETBASE_ADMIN_EMAIL=admin@test.local
POCKETBASE_ADMIN_PASSWORD=...
DEMO_USER_PASSWORD=Consultorio123!
DEMO_AGENDA_DATE=2026-05-15
```

No usar datos reales ni credenciales de produccion.

## 3. Preparar datos demo

Inicializar o actualizar el esquema de la instancia test:

```bash
npm run schema:test
```

El bootstrap copia definiciones de colecciones desde `.env.local` hacia `.env.test.local`, incluyendo campos de `users` necesarios para roles, sin copiar registros clinicos ni usuarios reales.

Luego sembrar datos demo:

```bash
npm run seed:test
```

Esto crea o actualiza:

- `admin.demo@consultorio.local`
- `medico.demo@consultorio.local`
- `secretaria.demo@consultorio.local`
- `multi.demo@consultorio.local`
- pacientes demo
- disponibilidad demo del `2026-05-15`
- turno ocupado demo a las `09:15`

## 4. Ejecutar pruebas

```bash
npm run test:playwright:test
```

El runner carga `.env.test.local`, inicia Next con esas variables y exige una URL PocketBase de testing.

## 5. Guardas

Los scripts abortan si `REQUIRE_TEST_POCKETBASE=true` y la URL no parece de testing.

Existe un override deliberado:

```bash
ALLOW_PRODUCTION_PB_FOR_TESTS=true
```

No usarlo salvo que se entienda el riesgo de escribir datos de prueba en esa instancia.
