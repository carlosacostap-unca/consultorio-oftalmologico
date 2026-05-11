# PocketBase MCP para Consultorio Oftalmologico

Servidor MCP local para que Codex pueda inspeccionar y administrar la base de PocketBase durante el desarrollo.

La aplicacion Next.js sigue usando `NEXT_PUBLIC_POCKETBASE_URL`. Este MCP es solo para herramientas de desarrollo.

## Instalacion

```powershell
cd C:\Proyectos\consultorio-oftalmologico\tools\pocketbase-mcp
npm install
```

## Variables

El servidor lee `POCKETBASE_URL` o, como fallback, `NEXT_PUBLIC_POCKETBASE_URL` desde el `.env.local` del proyecto.
La URL puede incluir `https://`; si se configura solo el host, el servidor usa `https://` por defecto.
Tambien puede cargar otro archivo con `MCP_ENV_FILE` o `ENV_FILE`, por ejemplo para usar `.env.test.local`.

Para listar colecciones o registros hace falta una credencial administrativa:

```txt
POCKETBASE_ADMIN_TOKEN=...
```

Tambien se puede usar email y password:

```txt
POCKETBASE_ADMIN_EMAIL=admin@email.com
POCKETBASE_ADMIN_PASSWORD=tu_password
```

## Herramientas

- `health`
- `list_collections`
- `get_collection`
- `list_records`
- `get_record`
- `create_record`
- `update_record`

## Instancia de testing

Para registrar un MCP contra PocketBase de testing, configurar `MCP_ENV_FILE` apuntando al `.env.test.local` del proyecto y `REQUIRE_TEST_POCKETBASE=true`.
Con esa variable activa, el servidor aborta si la URL no parece una instancia de testing.
