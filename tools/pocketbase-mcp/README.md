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
